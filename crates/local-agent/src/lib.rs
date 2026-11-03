use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};

const MAX_PROMPT: usize = 300_000;
const MAX_RESULT: u64 = 2_000_000;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Default)]
struct Job {
    child: Option<Child>,
    state: String,
    events: Vec<String>,
    result: Option<Value>,
    error: Option<String>,
}

#[derive(Default)]
pub struct AgentService {
    jobs: Mutex<HashMap<String, Arc<Mutex<Job>>>>,
}

fn field<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}

fn command(path: &Path) -> Command {
    let mut cmd = Command::new(path);
    // GUI applications do not inherit a login shell's PATH.
    let mut paths: Vec<PathBuf> =
        std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()).collect();
    paths.extend([
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
    ]);
    if let Some(parent) = path.parent() {
        paths.insert(0, parent.to_path_buf());
    }
    if let Some(home) = std::env::var_os("HOME") {
        paths.push(PathBuf::from(&home).join(".local/bin"));
        paths.push(PathBuf::from(home).join("Library/pnpm"));
    }
    if let Ok(path) = std::env::join_paths(paths) {
        cmd.env("PATH", path);
    }
    // Child Codex should not accidentally attach itself to the parent chat.
    cmd.env_remove("CODEX_THREAD_ID");
    cmd
}

fn codex_path(configured: &str) -> Result<PathBuf, String> {
    let name = if cfg!(windows) { "codex.exe" } else { "codex" };
    let mut candidates = Vec::new();
    if !configured.trim().is_empty() {
        let path = PathBuf::from(configured.trim());
        if !path.is_absolute() {
            return Err("Codex 路径必须是可执行文件的绝对路径。".into());
        }
        candidates.push(path);
    } else {
        candidates.extend(
            std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default())
                .map(|p| p.join(name)),
        );
        candidates.extend([
            PathBuf::from("/opt/homebrew/bin/codex"),
            PathBuf::from("/usr/local/bin/codex"),
        ]);
        if let Some(home) = std::env::var_os("HOME") {
            candidates.push(PathBuf::from(home).join(".local/bin").join(name));
        }
    }
    candidates.into_iter().find(|p| p.is_file()).ok_or_else(|| {
        "未找到 Codex CLI。请安装并运行 codex login，或在设置中填写可执行文件路径。".into()
    })
}

fn bounded_output(path: &Path, args: &[&str]) -> Result<(bool, String), String> {
    let mut child = command(path)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动 Codex：{e}"))?;
    let out = child.stdout.take().unwrap();
    let err = child.stderr.take().unwrap();
    let read = |mut stream: Box<dyn Read + Send>| {
        let mut data = String::new();
        let _ = stream.by_ref().take(16_384).read_to_string(&mut data);
        data
    };
    let stdout = std::thread::spawn(move || read(Box::new(out)));
    let stderr = std::thread::spawn(move || read(Box::new(err)));
    let start = Instant::now();
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            break status;
        }
        if start.elapsed() > Duration::from_secs(10) {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Codex 检测超时，请检查可执行文件路径。".into());
        }
        std::thread::sleep(Duration::from_millis(50));
    };
    let text = format!(
        "{}\n{}",
        stdout.join().unwrap_or_default(),
        stderr.join().unwrap_or_default()
    );
    Ok((status.success(), text.trim().to_string()))
}

fn project_path(raw: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw.trim());
    if !path.is_absolute() {
        return Err("请输入本地项目的绝对路径。".into());
    }
    let path = path
        .canonicalize()
        .map_err(|e| format!("无法访问项目目录：{e}"))?;
    if !path.is_dir() {
        return Err("请选择项目文件夹。".into());
    }
    Ok(path)
}

fn reference_file(path: &Path) -> bool {
    let name = path.file_name().unwrap_or_default().to_string_lossy();
    if name.contains(".test.") || name.contains(".spec.") || name.contains("lock.") {
        return false;
    }
    matches!(
        name.as_ref(),
        "DESIGN.md" | "PRODUCT.md" | "README.md" | "package.json" | "components.json"
    ) || matches!(
        path.extension().and_then(|e| e.to_str()),
        Some("tsx" | "jsx" | "css" | "scss" | "json")
    )
}

pub fn inspect_project(raw: &str) -> Result<Value, String> {
    let root = project_path(raw)?;
    fn walk(dir: &Path, root: &Path, depth: usize, visited: &mut usize, files: &mut Vec<PathBuf>) {
        if depth > 5 || *visited > 1200 {
            return;
        }
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        let mut entries: Vec<_> = entries.flatten().take(1201).collect();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            *visited += 1;
            if *visited > 1200 {
                break;
            }
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.')
                || matches!(
                    name.as_str(),
                    "node_modules"
                        | "target"
                        | "dist"
                        | "build"
                        | "coverage"
                        | "vendor"
                        | "test-results"
                )
                || kind.is_symlink()
            {
                continue;
            }
            let path = entry.path();
            if kind.is_dir() {
                walk(&path, root, depth + 1, visited, files);
            } else if kind.is_file() && reference_file(&path) && path.starts_with(root) {
                files.push(path);
            }
        }
    }
    let mut files = Vec::new();
    walk(&root, &root, 0, &mut 0, &mut files);
    files.sort_by_key(|p| {
        let name = p.file_name().unwrap_or_default().to_string_lossy();
        let rank = if matches!(name.as_ref(), "DESIGN.md" | "PRODUCT.md") {
            0
        } else if name.contains("token") || name.contains("theme") || name.contains("tailwind") {
            1
        } else if name == "package.json" {
            2
        } else if p.extension().is_some_and(|e| e == "css") {
            3
        } else {
            4
        };
        (rank, p.clone())
    });
    let mut context = String::new();
    let mut included = Vec::new();
    for path in files.iter().take(24) {
        let Ok(file) = std::fs::File::open(path) else {
            continue;
        };
        if file.metadata().map(|m| m.len() > 512_000).unwrap_or(true) {
            continue;
        }
        let mut bytes = Vec::new();
        let _ = file.take(7000).read_to_end(&mut bytes);
        let text = String::from_utf8_lossy(&bytes);
        let relative = path
            .strip_prefix(&root)
            .unwrap()
            .to_string_lossy()
            .into_owned();
        context.push_str(&format!("\n--- {relative} ---\n{text}\n"));
        included.push(relative);
        if context.len() > 65_000 {
            break;
        }
    }
    Ok(
        json!({"path":root,"name":root.file_name().unwrap_or_default().to_string_lossy(),"files":included,"context":context,"truncated": files.len() > included.len()}),
    )
}

fn push_event(job: &Arc<Mutex<Job>>, message: String) {
    let mut job = job.lock().unwrap();
    if job.events.last() != Some(&message) {
        job.events.push(message.chars().take(500).collect());
    }
    if job.events.len() > 20 {
        job.events.remove(0);
    }
}

impl AgentService {
    pub fn request(&self, method: &str, payload: Value) -> Result<Value, String> {
        match method {
            "detect" => {
                let path = codex_path(field(&payload, "executable"))?;
                let (ok, version) = bounded_output(&path, &["--version"])?;
                if !ok {
                    return Err(version);
                }
                let (logged_in, login) = bounded_output(&path, &["login", "status"])?;
                // Login diagnostics may contain account information; never return raw credentials.
                let _ = login;
                Ok(
                    json!({"path":path,"version":version.lines().find(|l| l.starts_with("codex")).unwrap_or("Codex CLI"),"loggedIn":logged_in}),
                )
            }
            "project" => inspect_project(field(&payload, "path")),
            "start" => self.start(payload),
            "status" | "cancel" => {
                let id = field(&payload, "id");
                let job = self
                    .jobs
                    .lock()
                    .unwrap()
                    .get(id)
                    .cloned()
                    .ok_or("生成任务不存在，请重新生成。")?;
                let mut job = job.lock().unwrap();
                if method == "cancel" && job.state == "running" {
                    job.state = "cancelled".into();
                    if let Some(child) = job.child.as_mut() {
                        let _ = child.kill();
                    }
                }
                Ok(
                    json!({"id":id,"state":job.state,"events":job.events,"result":job.result,"error":job.error}),
                )
            }
            _ => Err("不支持的本地 Agent 操作。".into()),
        }
    }

    fn start(&self, payload: Value) -> Result<Value, String> {
        let prompt = field(&payload, "prompt").to_string();
        if prompt.trim().is_empty() || prompt.len() > MAX_PROMPT {
            return Err("生成内容为空或超过大小限制。".into());
        }
        let schema = payload
            .get("schema")
            .filter(|v| v.is_object())
            .ok_or("缺少生成格式约束。")?;
        if schema.to_string().len() > 32_000 {
            return Err("生成格式约束过大。".into());
        }
        let model = field(&payload, "model");
        if !model.is_empty()
            && (model.len() > 160
                || !model.starts_with(|c: char| c.is_ascii_alphanumeric())
                || !model
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || "-_/.:".contains(c)))
        {
            return Err("模型名称格式不合法，请检查 Agent 设置。".into());
        }
        let path = codex_path(field(&payload, "executable"))?;
        let mut jobs = self.jobs.lock().unwrap();
        if jobs.values().any(|j| j.lock().unwrap().state == "running") {
            return Err("已有生成任务正在运行，请等待完成或先取消。".into());
        }
        // Bound retained output, including projects left open for days.
        if jobs.len() >= 24 {
            jobs.clear();
        }
        let id = format!(
            "{}-{}",
            std::process::id(),
            NEXT_ID.fetch_add(1, Ordering::Relaxed)
        );
        let temp = std::env::temp_dir().join(format!("rea-agent-{id}"));
        std::fs::create_dir(&temp).map_err(|e| e.to_string())?;
        let result = (|| {
            let schema_file = temp.join("schema.json");
            let output_file = temp.join("result.json");
            std::fs::write(&schema_file, schema.to_string()).map_err(|e| e.to_string())?;
            let cwd = if field(&payload, "projectPath").is_empty() {
                temp.clone()
            } else {
                project_path(field(&payload, "projectPath"))?
            };
            let mut cmd = command(&path);
            cmd.args([
                "exec",
                "--json",
                "--sandbox",
                "read-only",
                "--skip-git-repo-check",
                "--ephemeral",
                "--color",
                "never",
            ])
            .arg("--output-schema")
            .arg(&schema_file)
            .arg("--output-last-message")
            .arg(&output_file)
            .arg("-C")
            .arg(cwd);
            let model = field(&payload, "model");
            if !model.is_empty() {
                cmd.arg("--model").arg(model);
            }
            cmd.arg("-")
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            let mut child = cmd.spawn().map_err(|e| format!("无法启动 Codex：{e}"))?;
            let input = child.stdin.take().unwrap();
            let stdout = child.stdout.take().unwrap();
            let stderr = child.stderr.take().unwrap();
            let job = Arc::new(Mutex::new(Job {
                child: Some(child),
                state: "running".into(),
                events: vec!["Codex 正在读取设计需求…".into()],
                ..Job::default()
            }));
            let writer_job = job.clone();
            std::thread::spawn(move || {
                let mut input = input;
                if let Err(e) = input.write_all(prompt.as_bytes()) {
                    push_event(&writer_job, format!("传递需求失败：{e}"));
                }
            });
            let reader_job = job.clone();
            std::thread::spawn(move || {
                for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                    if line.len() > MAX_RESULT as usize {
                        continue;
                    }
                    if let Ok(event) = serde_json::from_str::<Value>(&line) {
                        match field(&event, "type") {
                            "thread.started" => {
                                push_event(&reader_job, "已连接本地 Codex CLI".into())
                            }
                            "turn.started" => {
                                push_event(&reader_job, "正在分析参考与设计系统…".into())
                            }
                            "item.completed" => {
                                let item = &event["item"];
                                match field(item, "type") {
                                    "command_execution" => {
                                        push_event(&reader_job, "正在参考项目代码…".into())
                                    }
                                    "agent_message" => {
                                        push_event(&reader_job, "正在整理生成结果…".into())
                                    }
                                    _ => {}
                                }
                            }
                            "error" | "turn.failed" => {
                                push_event(&reader_job, field(&event, "message").to_string())
                            }
                            _ => {}
                        }
                    }
                }
            });
            let errors = Arc::new(Mutex::new(String::new()));
            let error_buffer = errors.clone();
            std::thread::spawn(move || {
                for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                    let mut buffer = error_buffer.lock().unwrap();
                    if buffer.len() < 6000 {
                        buffer.push_str(&line.chars().take(1000).collect::<String>());
                        buffer.push('\n');
                    }
                }
            });
            let watcher = job.clone();
            let work_dir = temp.clone();
            std::thread::spawn(move || {
                let started = Instant::now();
                loop {
                    {
                        let mut job = watcher.lock().unwrap();
                        if started.elapsed() > Duration::from_secs(600) && job.state == "running" {
                            job.state = "failed".into();
                            job.error =
                                Some("生成超过 10 分钟，已停止。可以缩小需求后重试。".into());
                            if let Some(child) = job.child.as_mut() {
                                let _ = child.kill();
                            }
                        }
                        let status = job.child.as_mut().unwrap().try_wait();
                        if let Ok(None) = status {
                            drop(job);
                            std::thread::sleep(Duration::from_millis(100));
                            continue;
                        }
                        if job.state == "running" {
                            let result = (|| -> Result<Value, String> {
                                if !status.map_err(|e| e.to_string())?.unwrap().success() {
                                    let details = errors.lock().unwrap().clone();
                                    return Err(format!(
                                        "Codex 生成失败。请检查登录、模型与网络后重试。\n{}",
                                        details.chars().take(2000).collect::<String>()
                                    ));
                                }
                                let file = std::fs::File::open(&output_file)
                                    .map_err(|_| "Codex 未返回生成结果。".to_string())?;
                                let mut data = String::new();
                                file.take(MAX_RESULT + 1)
                                    .read_to_string(&mut data)
                                    .map_err(|e| e.to_string())?;
                                if data.len() as u64 > MAX_RESULT {
                                    return Err("生成结果超过大小限制。".into());
                                }
                                serde_json::from_str(&data)
                                    .map_err(|e| format!("Codex 返回格式不合法：{e}"))
                            })();
                            match result {
                                Ok(value) => {
                                    job.result = Some(value);
                                    job.state = "completed".into();
                                }
                                Err(e) => {
                                    job.error = Some(e);
                                    job.state = "failed".into();
                                }
                            }
                        }
                        job.child.take();
                    }
                    let _ = std::fs::remove_dir_all(work_dir);
                    break;
                }
            });
            jobs.insert(id.clone(), job);
            Ok(json!({"id":id}))
        })();
        if result.is_err() {
            let _ = std::fs::remove_dir_all(temp);
        }
        result
    }
}

impl Drop for AgentService {
    fn drop(&mut self) {
        if let Ok(jobs) = self.jobs.lock() {
            for job in jobs.values() {
                if let Ok(mut job) = job.lock() {
                    if let Some(child) = job.child.as_mut() {
                        let _ = child.kill();
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    #[test]
    fn runs_structured_jobs_reports_failures_and_cancels_processes() {
        use std::os::unix::fs::PermissionsExt;
        let root = std::env::temp_dir().join(format!("rea-process-test-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let executable = root.join("fake codex");
        std::fs::write(
            &executable,
            r##"#!/bin/sh
if [ "$1" = "--version" ]; then echo 'codex-cli test'; exit 0; fi
if [ "$1" = "login" ]; then exit 0; fi
output=''
readonly_mode=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    --sandbox) readonly_mode="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [ "$readonly_mode" != 'read-only' ]; then exit 10; fi
prompt="$(cat)"
case "$prompt" in
  slow) exec sleep 20 ;;
  failure) echo 'simulated network failure' >&2; exit 9 ;;
  invalid) echo 'invalid JSON' > "$output" ;;
  *) echo '{"name":"test result"}' > "$output" ;;
esac
echo '{"type":"turn.started"}'
"##,
        )
        .unwrap();
        std::fs::set_permissions(&executable, std::fs::Permissions::from_mode(0o700)).unwrap();
        let service = AgentService::default();
        let detect = service
            .request("detect", json!({"executable": executable}))
            .unwrap();
        assert_eq!(detect["loggedIn"], true);
        let run = |prompt: &str| {
            service
                .request(
                    "start",
                    json!({"executable":executable,"prompt":prompt,"schema":{"type":"object"}}),
                )
                .unwrap()["id"]
                .as_str()
                .unwrap()
                .to_string()
        };
        let finish = |id: &str| {
            let started = Instant::now();
            loop {
                let status = service.request("status", json!({"id":id})).unwrap();
                if status["state"] != "running" {
                    break status;
                }
                assert!(started.elapsed() < Duration::from_secs(5));
                std::thread::sleep(Duration::from_millis(30));
            }
        };
        let success = finish(&run("hello $() \"quotes\""));
        assert_eq!(success["state"], "completed");
        assert_eq!(success["result"]["name"], "test result");
        assert_eq!(finish(&run("failure"))["state"], "failed");
        assert_eq!(finish(&run("invalid"))["state"], "failed");
        let slow = run("slow");
        assert!(service
            .request(
                "start",
                json!({"executable":executable,"prompt":"second","schema":{}})
            )
            .is_err());
        let cancel = service.request("cancel", json!({"id":slow})).unwrap();
        assert_eq!(cancel["state"], "cancelled");
        assert!(cancel["result"].is_null());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn rejects_invalid_requests_and_paths() {
        let service = AgentService::default();
        assert!(service.request("start", json!({"prompt":""})).is_err());
        assert!(service.request("status", json!({"id":"missing"})).is_err());
        assert!(inspect_project("relative/path").is_err());
        assert!(codex_path("relative/codex").is_err());
    }
    #[test]
    fn scans_bounded_code_context_without_secrets_or_dependencies() {
        let root = std::env::temp_dir().join(format!("rea-context-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("node_modules")).unwrap();
        std::fs::write(root.join("DESIGN.md"), "brand tokens").unwrap();
        std::fs::write(root.join(".env"), "secret").unwrap();
        std::fs::write(root.join("node_modules/button.tsx"), "dependency").unwrap();
        let result = inspect_project(root.to_str().unwrap()).unwrap();
        assert!(result["context"].as_str().unwrap().contains("brand tokens"));
        assert!(!result["context"].as_str().unwrap().contains("secret"));
        assert_eq!(result["files"].as_array().unwrap().len(), 1);
        std::fs::remove_dir_all(root).unwrap();
    }
}
