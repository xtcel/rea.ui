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
    preview: Option<Value>,
    preview_error: Option<String>,
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

const COMPONENT_SOURCE: &str = "components/main.components.tsx";
const WORKSPACE_RULES: &str = "# REA UI design workspace\nEdit only rea.json, pages/*.page.tsx and components/main.components.tsx. Read the manifest and existing source first. Preserve manifest identity and existing designId values. Use only static @rea/design primitives, static Tailwind className, no executable JS, HTML, events or style. Save a complete valid page after each meaningful section so the host can validate and render it live. Never modify the reference project. Report brief action summaries, never private reasoning. The final JSON contains only summary.\n";

fn design_paths(files: &Value) -> Result<Vec<String>, String> {
    let source = files
        .get("rea.json")
        .and_then(Value::as_str)
        .ok_or("缺少设计清单。")?;
    let manifest: Value = serde_json::from_str(source).map_err(|_| "设计清单格式错误。")?;
    let pages = manifest["pages"].as_array().ok_or("设计清单缺少页面。")?;
    if pages.is_empty() || pages.len() > 12 {
        return Err("AI 编辑最多支持 12 个页面。".into());
    }
    let mut paths = vec!["rea.json".to_string()];
    for page in pages {
        let id = field(page, "id");
        if id.is_empty()
            || id.len() > 64
            || !id.starts_with(|c: char| c.is_ascii_lowercase())
            || !id
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        {
            return Err("页面路径不合法。".into());
        }
        let path = format!("pages/{id}.page.tsx");
        if field(page, "file") != path || paths.contains(&path) {
            return Err("页面路径不合法或重复。".into());
        }
        paths.push(path);
    }
    if files.get(COMPONENT_SOURCE).is_some() {
        paths.push(COMPONENT_SOURCE.into());
    }
    Ok(paths)
}

fn validate_sources(files: &Value) -> Result<Vec<String>, String> {
    let paths = design_paths(files)?;
    let object = files.as_object().ok_or("设计文件格式错误。")?;
    if object.len() != paths.len()
        || paths
            .iter()
            .any(|path| files.get(path).and_then(Value::as_str).is_none())
        || object
            .values()
            .any(|v| v.as_str().is_none_or(|s| s.len() > 500_000))
        || files.to_string().len() > MAX_RESULT as usize
    {
        return Err("设计文件类型或大小超出限制。".into());
    }
    Ok(paths)
}

fn read_source(root: &Path, path: &str) -> Result<String, String> {
    let full = root.join(path);
    if path.contains('/')
        && std::fs::symlink_metadata(full.parent().unwrap())
            .map_err(|e| e.to_string())?
            .file_type()
            .is_symlink()
    {
        return Err("设计目录不能使用符号链接。".into());
    }
    let metadata = std::fs::symlink_metadata(&full).map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() > 500_000 {
        return Err("设计文件必须是小于 500KB 的普通文件。".into());
    }
    let mut source = String::new();
    std::fs::File::open(full)
        .map_err(|e| e.to_string())?
        .take(500_001)
        .read_to_string(&mut source)
        .map_err(|e| e.to_string())?;
    if source.len() > 500_000 {
        return Err("设计文件超过大小限制。".into());
    }
    Ok(source)
}

fn workspace_snapshot(root: &Path) -> Result<Value, String> {
    if !std::fs::symlink_metadata(root)
        .map_err(|e| e.to_string())?
        .file_type()
        .is_dir()
    {
        return Err("设计工作区必须是普通目录。".into());
    }
    let mut files = json!({"rea.json": read_source(root, "rea.json")?});
    if root.join(COMPONENT_SOURCE).symlink_metadata().is_ok() {
        files[COMPONENT_SOURCE] = Value::String(read_source(root, COMPONENT_SOURCE)?);
    }
    for path in design_paths(&files)? {
        if path != "rea.json" && path != COMPONENT_SOURCE {
            files[&path] = Value::String(read_source(root, &path)?);
        }
    }
    validate_sources(&files)?;
    Ok(files)
}

fn public_progress(event: &Value) -> Option<String> {
    match field(event, "type") {
        "thread.started" => Some("已连接本地 Codex CLI".into()),
        "turn.started" => Some("正在分析需求与设计系统…".into()),
        "item.started" | "item.completed" => {
            let item = &event["item"];
            match field(item, "type") {
                "command_execution" => {
                    let command = field(item, "command");
                    let paths: Vec<_> = command
                        .split(|c: char| c.is_whitespace() || "\"'();".contains(c))
                        .filter(|s| {
                            *s == "rea.json"
                                || s.starts_with("pages/") && s.ends_with(".page.tsx")
                                || *s == COMPONENT_SOURCE
                        })
                        .take(3)
                        .collect();
                    Some(if paths.is_empty() {
                        "正在读取或编辑工作区文件…".into()
                    } else {
                        format!("正在处理设计文件：{}", paths.join("、"))
                    })
                }
                "agent_message" if field(event, "type") == "item.completed" => {
                    let message = field(item, "text").trim();
                    if message.is_empty() || message.starts_with('{') || message.starts_with("```")
                    {
                        None
                    } else {
                        Some(message.chars().take(500).collect())
                    }
                }
                // Reasoning events are private. Only actions and public messages reach the UI.
                _ => None,
            }
        }
        _ => None,
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
                    json!({"id":id,"state":job.state,"events":job.events,"result":job.result,"error":job.error,"preview":job.preview,"previewError":job.preview_error}),
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
        let workspace = payload.get("files");
        let workspace_paths = workspace.map(validate_sources).transpose()?;
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
            let design_root = temp.join("design");
            if let (Some(files), Some(paths)) = (workspace, workspace_paths) {
                std::fs::create_dir_all(design_root.join("pages")).map_err(|e| e.to_string())?;
                std::fs::create_dir_all(design_root.join("components"))
                    .map_err(|e| e.to_string())?;
                for path in paths {
                    std::fs::write(design_root.join(&path), files[&path].as_str().unwrap())
                        .map_err(|e| e.to_string())?;
                }
                std::fs::write(design_root.join("AGENTS.md"), WORKSPACE_RULES)
                    .map_err(|e| e.to_string())?;
            }
            let cwd = if workspace.is_some() {
                design_root.clone()
            } else if field(&payload, "projectPath").is_empty() {
                temp.clone()
            } else {
                project_path(field(&payload, "projectPath"))?
            };
            let mut cmd = command(&path);
            cmd.args([
                "exec",
                "--json",
                "--sandbox",
                if workspace.is_some() {
                    "workspace-write"
                } else {
                    "read-only"
                },
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
                        if let Some(message) = public_progress(&event) {
                            push_event(&reader_job, message);
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
            let has_workspace = workspace.is_some();
            std::thread::spawn(move || {
                let started = Instant::now();
                loop {
                    {
                        let mut job = watcher.lock().unwrap();
                        if has_workspace && job.state == "running" {
                            match workspace_snapshot(&design_root) {
                                Ok(snapshot) => {
                                    job.preview = Some(snapshot);
                                    job.preview_error = None;
                                }
                                Err(error) => {
                                    job.preview_error = Some(error);
                                }
                            }
                        }
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

    fn source_files() -> Value {
        json!({"rea.json": "{\"format\":\"reaui\",\"version\":2,\"id\":\"doc_test\",\"name\":\"Test\",\"createdAt\":\"2026-11-04T00:00:00Z\",\"pages\":[{\"id\":\"main\",\"file\":\"pages/main.page.tsx\"}]}", "pages/main.page.tsx": "initial source"})
    }

    #[cfg(unix)]
    #[test]
    fn streams_workspace_files_before_completion_and_keeps_final_snapshot() {
        use std::os::unix::fs::PermissionsExt;
        let root = std::env::temp_dir().join(format!("rea-workspace-test-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let executable = root.join("fake-codex");
        std::fs::write(&executable, r##"#!/bin/sh
output=''
mode=''
cwd=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    --sandbox) mode="$2"; shift 2 ;;
    -C) cwd="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [ "$mode" != 'workspace-write' ]; then exit 10; fi
cd "$cwd" || exit 11
if [ ! -f AGENTS.md ]; then exit 12; fi
prompt="$(cat)"
echo '{"type":"item.completed","item":{"type":"reasoning","text":"private reasoning"}}'
echo '{"type":"item.started","item":{"type":"command_execution","command":"cat pages/main.page.tsx"}}'
echo 'stage one' > pages/main.page.tsx
sleep 0.8
echo 'stage two' > pages/main.page.tsx
sleep 0.8
if [ "$prompt" = 'bad-final' ]; then echo '{"pages":[]}' > rea.json; fi
echo '{"summary":"done"}' > "$output"
"##).unwrap();
        std::fs::set_permissions(&executable, std::fs::Permissions::from_mode(0o700)).unwrap();
        let service = AgentService::default();
        for prompt in ["design", "bad-final"] {
            let id = service.request("start", json!({"executable":executable,"prompt":prompt,"schema":{"type":"object"},"files":source_files(),"projectPath":root})).unwrap()["id"].as_str().unwrap().to_string();
            let started = Instant::now();
            let mut saw_intermediate = false;
            loop {
                let status = service.request("status", json!({"id":id})).unwrap();
                if status["state"] == "running"
                    && status["preview"]["pages/main.page.tsx"]
                        .as_str()
                        .is_some_and(|s| s.contains("stage one"))
                {
                    saw_intermediate = true;
                }
                assert!(!status["events"].to_string().contains("private reasoning"));
                if status["state"] != "running" {
                    assert_eq!(status["state"], "completed");
                    assert!(saw_intermediate);
                    if prompt == "bad-final" {
                        assert!(status["previewError"].is_string());
                    } else {
                        assert!(status["previewError"].is_null());
                        assert_eq!(status["preview"]["pages/main.page.tsx"], "stage two\n");
                    }
                    break;
                }
                assert!(started.elapsed() < Duration::from_secs(8));
                std::thread::sleep(Duration::from_millis(30));
            }
        }
        assert!(!root.join("pages").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_traversal_missing_sources_oversize_and_symlinks() {
        use std::os::unix::fs::symlink;
        let mut files = source_files();
        files["rea.json"] = Value::String(
            "{\"pages\":[{\"id\":\"../outside\",\"file\":\"pages/../outside.page.tsx\"}]}".into(),
        );
        assert!(validate_sources(&files).is_err());
        files = source_files();
        files.as_object_mut().unwrap().remove("pages/main.page.tsx");
        files["unexpected"] = Value::String("wrong file".into());
        assert!(validate_sources(&files).is_err());
        files = source_files();
        files["pages/main.page.tsx"] = Value::String("x".repeat(500_001));
        assert!(validate_sources(&files).is_err());
        let root = std::env::temp_dir().join(format!("rea-symlink-test-{}", std::process::id()));
        std::fs::create_dir_all(root.join("pages")).unwrap();
        std::fs::write(
            root.join("rea.json"),
            source_files()["rea.json"].as_str().unwrap(),
        )
        .unwrap();
        std::fs::write(root.join("secret"), "must not read").unwrap();
        symlink(root.join("secret"), root.join("pages/main.page.tsx")).unwrap();
        assert!(workspace_snapshot(&root).is_err());
        std::fs::remove_file(root.join("pages/main.page.tsx")).unwrap();
        std::fs::remove_dir(root.join("pages")).unwrap();
        symlink(&root, root.join("pages")).unwrap();
        assert!(workspace_snapshot(&root).is_err());
        std::fs::remove_file(root.join("pages")).unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

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
