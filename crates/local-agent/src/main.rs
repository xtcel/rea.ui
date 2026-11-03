use serde_json::{json, Value};
use std::io::{BufRead, Write};

fn main() {
    let service = rea_local_agent::AgentService::default();
    let stdin = std::io::stdin();
    for line in stdin.lock().lines().map_while(Result::ok) {
        if line.len() > 400_000 {
            continue;
        }
        let response = match serde_json::from_str::<Value>(&line) {
            Ok(request) => {
                let result = service.request(
                    request["method"].as_str().unwrap_or(""),
                    request["payload"].clone(),
                );
                match result {
                    Ok(value) => json!({"id":request["id"],"result":value}),
                    Err(error) => json!({"id":request["id"],"error":error}),
                }
            }
            Err(error) => json!({"error":error.to_string()}),
        };
        println!("{response}");
        let _ = std::io::stdout().flush();
    }
}
