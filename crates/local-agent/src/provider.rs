//! HTTP 提供商调用：OpenAI 兼容、Anthropic Messages、Google Gemini。
//! 设计协议的校验仍由宿主与前端完成，这里只负责把模型输出取回来。

use serde_json::{json, Value};
use std::io::{BufRead, BufReader};
use std::time::{Duration, Instant};

/// 取消时返回该标记，调用方据此区分「用户取消」与真实错误。
pub const CANCELLED: &str = "REA_CANCELLED";
const MAX_RESPONSE: usize = 4_000_000;

#[derive(Clone, Debug)]
pub struct Target {
    pub name: String,
    pub protocol: String,
    pub base_url: String,
    pub model: String,
    pub api_key: String,
}

fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}

fn is_local(url: &str) -> bool {
    let rest = url
        .split("://")
        .nth(1)
        .unwrap_or_default()
        .split('/')
        .next()
        .unwrap_or_default()
        .split('@')
        .next_back()
        .unwrap_or_default();
    let host = rest.split(':').next().unwrap_or_default();
    matches!(host, "127.0.0.1" | "localhost" | "[::1]" | "::1")
}

/// 校验并规范化提供商配置。密钥只在这个进程内使用，不写日志。
pub fn parse_target(value: &Value) -> Result<Target, String> {
    let name = text(value, "name").trim().to_string();
    let protocol = text(value, "protocol").trim().to_string();
    let base_url = text(value, "baseUrl").trim().trim_end_matches('/').to_string();
    let model = text(value, "model").trim().to_string();
    let api_key = text(value, "apiKey").trim().to_string();

    if name.is_empty() || name.chars().count() > 80 {
        return Err("提供商名称不合法。".into());
    }
    if !matches!(protocol.as_str(), "openai" | "anthropic" | "gemini") {
        return Err("不支持的接口协议。".into());
    }
    if base_url.is_empty() || base_url.len() > 2000 {
        return Err("请填写接口地址。".into());
    }
    let parsed = reqwest::Url::parse(&base_url).map_err(|_| "接口地址格式不正确，请填写完整的 URL。".to_string())?;
    match parsed.scheme() {
        "https" => {}
        "http" if is_local(&base_url) => {}
        "http" => return Err("接口地址需使用 https；本机服务可用 http://127.0.0.1。".into()),
        _ => return Err("接口地址只支持 http 或 https。".into()),
    }
    if parsed.host_str().is_none() {
        return Err("接口地址缺少主机名。".into());
    }
    if model.is_empty() || model.len() > 160 {
        return Err("请填写模型名称。".into());
    }
    if !model.chars().all(|c| c.is_ascii_alphanumeric() || "-_/.:".contains(c)) {
        return Err("模型名称只能包含字母、数字与 - _ / . :".into());
    }
    if api_key.len() > 4000 || api_key.contains(['\n', '\r']) {
        return Err("API Key 格式不正确。".into());
    }
    if api_key.is_empty() && !is_local(&base_url) {
        return Err("请填写 API Key。".into());
    }
    Ok(Target { name, protocol, base_url, model, api_key })
}

fn endpoint(base: &str, suffix: &str) -> String {
    if base.ends_with(suffix) {
        base.to_string()
    } else {
        format!("{base}{suffix}")
    }
}

fn client(timeout: Duration) -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .timeout(timeout)
        .build()
        .map_err(|e| format!("无法初始化网络请求：{e}"))
}

fn http_error(status: u16, body: &str, name: &str) -> String {
    let detail: String = body.chars().take(600).collect();
    let hint = match status {
        401 | 403 => "API Key 无效或没有权限",
        404 => "接口地址或模型不存在",
        408 | 504 => "请求超时",
        413 => "请求内容过大",
        429 => "请求过于频繁或额度不足",
        500..=599 => "服务端暂时不可用",
        _ => "请求失败",
    };
    if detail.trim().is_empty() {
        format!("{name}：{hint}（HTTP {status}）")
    } else {
        format!("{name}：{hint}（HTTP {status}）\n{detail}")
    }
}

/// 从模型输出中取出第一个完整的 JSON 对象，兼容 Markdown 代码块与前后说明文字。
pub fn extract_json(source: &str) -> Option<Value> {
    if let Ok(value) = serde_json::from_str::<Value>(source.trim()) {
        return Some(value);
    }
    let start = source.find('{')?;
    let bytes = source.as_bytes();
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for (index, byte) in bytes.iter().enumerate().skip(start) {
        let character = *byte as char;
        if in_string {
            if escaped {
                escaped = false;
            } else if character == '\\' {
                escaped = true;
            } else if character == '"' {
                in_string = false;
            }
            continue;
        }
        match character {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    return serde_json::from_str::<Value>(&source[start..=index]).ok();
                }
            }
            _ => {}
        }
    }
    None
}

struct Call<'a> {
    target: &'a Target,
    system: &'a str,
    prompt: &'a str,
    progress: &'a mut dyn FnMut(String),
    cancelled: &'a dyn Fn() -> bool,
}

impl Call<'_> {
    fn note(&mut self, message: impl Into<String>) {
        (self.progress)(message.into());
    }
    fn stopped(&self) -> bool {
        (self.cancelled)()
    }
    fn wait(&mut self, response: reqwest::blocking::Response) -> Result<String, String> {
        let status = response.status().as_u16();
        if !(200..300).contains(&status) {
            let body = response.text().unwrap_or_default();
            return Err(http_error(status, &body, &self.target.name));
        }
        let reader = BufReader::new(response);
        let mut text = String::new();
        let mut announced = 0usize;
        let started = Instant::now();
        for line in reader.lines() {
            if self.stopped() {
                return Err(CANCELLED.into());
            }
            if started.elapsed() > Duration::from_secs(600) {
                return Err("模型响应超过 10 分钟，已停止。".into());
            }
            let Ok(line) = line else { break };
            let Some(data) = line.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data.is_empty() || data == "[DONE]" {
                continue;
            }
            let Ok(event) = serde_json::from_str::<Value>(data) else { continue };
            if let Some(message) = event["error"]["message"].as_str() {
                return Err(format!("{}：{}", self.target.name, message.chars().take(400).collect::<String>()));
            }
            let delta = match self.target.protocol.as_str() {
                "anthropic" => event["delta"]["text"].as_str().unwrap_or_default(),
                _ => event["choices"][0]["delta"]["content"].as_str().unwrap_or_default(),
            };
            if delta.is_empty() {
                continue;
            }
            text.push_str(delta);
            if text.len() > MAX_RESPONSE {
                return Err("模型返回内容过大，已停止。".into());
            }
            if text.len() >= announced + 2000 {
                announced = text.len();
                self.note(format!("模型正在生成设计内容 · 已接收 {} 字", text.chars().count()));
            }
        }
        if text.trim().is_empty() {
            return Err(format!("{} 没有返回内容，请检查模型名称与额度。", self.target.name));
        }
        Ok(text)
    }
}

fn stream(call: &mut Call<'_>) -> Result<String, String> {
    let target = call.target;
    let http = client(Duration::from_secs(660))?;
    match target.protocol.as_str() {
        "anthropic" => {
            let url = if target.base_url.ends_with("/v1") {
                endpoint(&target.base_url, "/messages")
            } else {
                endpoint(&target.base_url, "/v1/messages")
            };
            let body = json!({
                "model": target.model,
                "max_tokens": 32000,
                "system": call.system,
                "stream": true,
                "messages": [{ "role": "user", "content": call.prompt }],
            });
            let response = http
                .post(url)
                .header("x-api-key", &target.api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send()
                .map_err(|e| format!("无法连接 {}：{e}", target.name))?;
            call.wait(response)
        }
        _ => {
            let url = endpoint(&target.base_url, "/chat/completions");
            let body = json!({
                "model": target.model,
                "stream": true,
                "messages": [
                    { "role": "system", "content": call.system },
                    { "role": "user", "content": call.prompt },
                ],
            });
            let mut request = http.post(url).json(&body);
            if !target.api_key.is_empty() {
                request = request.header("Authorization", format!("Bearer {}", target.api_key));
            }
            let response = request.send().map_err(|e| format!("无法连接 {}：{e}", target.name))?;
            call.wait(response)
        }
    }
}

fn gemini(call: &mut Call<'_>) -> Result<String, String> {
    let target = call.target;
    let base = if target.base_url.ends_with("/v1beta") {
        target.base_url.clone()
    } else {
        format!("{}/v1beta", target.base_url)
    };
    let url = format!("{base}/models/{}:generateContent", target.model);
    let body = json!({
        "systemInstruction": { "parts": [{ "text": call.system }] },
        "contents": [{ "role": "user", "parts": [{ "text": call.prompt }] }],
        "generationConfig": { "maxOutputTokens": 32000 },
    });
    call.note("已提交请求，正在生成设计内容…".to_string());
    let response = client(Duration::from_secs(660))?
        .post(url)
        .header("x-goog-api-key", &target.api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("无法连接 {}：{e}", target.name))?;
    let status = response.status().as_u16();
    let raw = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) {
        return Err(http_error(status, &raw, &target.name));
    }
    if call.stopped() {
        return Err(CANCELLED.into());
    }
    let value: Value = serde_json::from_str(&raw).map_err(|_| "Gemini 返回格式不合法。".to_string())?;
    if let Some(message) = value["error"]["message"].as_str() {
        return Err(format!("{}：{message}", target.name));
    }
    let mut text = String::new();
    if let Some(parts) = value["candidates"][0]["content"]["parts"].as_array() {
        for part in parts {
            if let Some(chunk) = part["text"].as_str() {
                text.push_str(chunk);
            }
        }
    }
    if text.trim().is_empty() {
        return Err(format!("{} 没有返回内容，请检查模型名称与额度。", target.name));
    }
    Ok(text)
}

/// 发起一次生成请求，返回模型的原始文本输出。
pub fn generate(
    target: &Target,
    system: &str,
    prompt: &str,
    progress: &mut dyn FnMut(String),
    cancelled: &dyn Fn() -> bool,
) -> Result<String, String> {
    progress(format!("已连接 {}", target.name));
    progress("正在分析需求与设计系统…".into());
    let mut call = Call { target, system, prompt, progress, cancelled };
    if target.protocol == "gemini" { gemini(&mut call) } else { stream(&mut call) }
}

/// 用只读的模型列表接口验证地址与密钥，不消耗生成额度。
pub fn test(target: &Target) -> Result<String, String> {
    let http = client(Duration::from_secs(20))?;
    let request = match target.protocol.as_str() {
        "anthropic" => {
            let url = if target.base_url.ends_with("/v1") {
                endpoint(&target.base_url, "/models")
            } else {
                endpoint(&target.base_url, "/v1/models")
            };
            http.get(url).header("x-api-key", &target.api_key).header("anthropic-version", "2023-06-01")
        }
        "gemini" => {
            let base = if target.base_url.ends_with("/v1beta") {
                target.base_url.clone()
            } else {
                format!("{}/v1beta", target.base_url)
            };
            let url = format!("{base}/models");
            http.get(url).header("x-goog-api-key", &target.api_key)
        }
        _ => {
            let url = if target.base_url.ends_with("/chat/completions") {
                target.base_url.trim_end_matches("/chat/completions").to_string() + "/models"
            } else {
                endpoint(&target.base_url, "/models")
            };
            let mut request = http.get(url);
            if !target.api_key.is_empty() {
                request = request.header("Authorization", format!("Bearer {}", target.api_key));
            }
            request
        }
    };
    let started = Instant::now();
    let response = request.send().map_err(|e| format!("无法连接 {}：{e}", target.name))?;
    let status = response.status().as_u16();
    let raw = response.text().unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(http_error(status, &raw, &target.name));
    }
    let elapsed = started.elapsed().as_millis();
    let count = serde_json::from_str::<Value>(&raw)
        .ok()
        .and_then(|value| {
            value["data"]
                .as_array()
                .or_else(|| value["models"].as_array())
                .map(|items| items.len())
        })
        .unwrap_or(0);
    let message = if count > 0 {
        format!("连接成功 · {count} 个模型可用 · {elapsed} ms")
    } else {
        format!("连接成功 · {elapsed} ms")
    };
    Ok(message)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(protocol: &str, base: &str) -> Value {
        json!({"name":"本地测试","protocol":protocol,"baseUrl":base,"model":"demo-1","apiKey":"sk-test"})
    }

    #[test]
    fn validates_provider_targets() {
        assert!(parse_target(&target("openai", "https://api.openai.com/v1")).is_ok());
        assert!(parse_target(&target("anthropic", "https://api.anthropic.com")).is_ok());
        assert!(parse_target(&target("gemini", "https://generativelanguage.googleapis.com")).is_ok());
        assert!(parse_target(&target("openai", "http://127.0.0.1:11434/v1")).is_ok());
        assert!(parse_target(&target("openai", "http://example.com/v1")).is_err());
        assert!(parse_target(&target("unknown", "https://a.com")).is_err());
        assert!(parse_target(&json!({"name":"x","protocol":"openai","baseUrl":"https://a.com","model":"","apiKey":"k"})).is_err());
        assert!(parse_target(&json!({"name":"x","protocol":"openai","baseUrl":"https://a.com","model":"m","apiKey":""})).is_err());
        assert!(parse_target(&json!({"name":"x","protocol":"openai","baseUrl":"https://a.com","model":"m","apiKey":"k","path":1})).is_ok());
    }

    #[test]
    fn extracts_json_from_wrapped_output() {
        assert_eq!(extract_json("{\"a\":1}").unwrap()["a"], 1);
        let fenced = "```json\n{\"summary\":\"s\",\"files\":{\"rea.json\":\"{}\"}}\n```";
        assert_eq!(extract_json(fenced).unwrap()["summary"], "s");
        let chatty = "说明：{\"a\":{\"b\":2}} 以上。";
        assert_eq!(extract_json(chatty).unwrap()["a"]["b"], 2);
        assert!(extract_json("没有 JSON").is_none());
        assert!(extract_json("{\"a\":1").is_none());
    }

    #[test]
    fn maps_http_status_to_actionable_messages() {
        assert!(http_error(401, "", "X").contains("API Key"));
        assert!(http_error(404, "not found", "X").contains("not found"));
        assert!(http_error(429, "", "X").contains("额度"));
    }

    #[test]
    fn builds_endpoints_without_duplicating_suffixes() {
        assert_eq!(endpoint("https://a.com/v1", "/chat/completions"), "https://a.com/v1/chat/completions");
        assert_eq!(endpoint("https://a.com/v1/chat/completions", "/chat/completions"), "https://a.com/v1/chat/completions");
    }

    /// 用本机回环地址模拟 OpenAI 兼容的 SSE 流，验证增量解析与首字进度。
    #[test]
    fn streams_openai_compatible_deltas_from_a_local_server() {
        use std::io::{Read, Write};
        use std::net::TcpListener;
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let Ok((mut socket, _)) = listener.accept() else { return };
            let mut reader = BufReader::new(socket.try_clone().unwrap());
            let mut length = 0usize;
            loop {
                let mut line = String::new();
                if reader.read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" {
                    break;
                }
                if let Some(value) = line.to_ascii_lowercase().strip_prefix("content-length:") {
                    length = value.trim().parse().unwrap_or(0);
                }
            }
            let mut body = vec![0u8; length];
            let _ = reader.read_exact(&mut body);
            let _ = socket.write_all(
                b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\ndata: {\"choices\":[{\"delta\":{\"content\":\"{\\\"summary\\\":\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"\\\"ok\\\"}\"}}]}\n\ndata: [DONE]\n\n",
            );
        });
        let target = parse_target(&json!({
            "name":"本地服务","protocol":"openai","model":"demo-1","apiKey":"k",
            "baseUrl": format!("http://127.0.0.1:{port}/v1")
        }))
        .unwrap();
        let mut events: Vec<String> = Vec::new();
        let text = generate(&target, "system", "prompt", &mut |message| events.push(message), &|| false).unwrap();
        assert_eq!(extract_json(&text).unwrap()["summary"], "ok");
        assert!(events.iter().any(|event| event.contains("已连接 本地服务")));
    }

    #[test]
    fn reports_http_failures_without_leaking_the_key() {
        use std::io::Write;
        use std::net::TcpListener;
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let Ok((mut socket, _)) = listener.accept() else { return };
            let _ = socket.write_all(
                b"HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nContent-Length: 26\r\nConnection: close\r\n\r\n{\"error\":\"invalid api key\"}\n",
            );
        });
        let target = parse_target(&json!({
            "name":"本地服务","protocol":"openai","model":"demo-1","apiKey":"sk-secret",
            "baseUrl": format!("http://127.0.0.1:{port}/v1")
        }))
        .unwrap();
        let error = generate(&target, "system", "prompt", &mut |_| {}, &|| false).unwrap_err();
        assert!(error.contains("API Key"), "{error}");
        assert!(!error.contains("sk-secret"));
    }
}
