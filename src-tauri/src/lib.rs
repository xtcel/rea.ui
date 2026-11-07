use std::sync::Arc;
use std::{collections::VecDeque, path::PathBuf, sync::Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn local_agent_request(
    state: tauri::State<'_, Arc<rea_local_agent::AgentService>>,
    method: String,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let service = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.request(&method, payload))
        .await
        .map_err(|e| e.to_string())?
}

// Retain OS requests until the webview has subscribed, including cold launches.
#[derive(Default)]
struct PendingFiles(Mutex<VecDeque<PathBuf>>);

#[derive(serde::Serialize)]
struct OpenedFile {
    name: String,
    bytes: Option<Vec<u8>>,
    error: Option<String>,
}

fn is_document(path: &std::path::Path) -> bool {
    path.extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("reaui"))
}

fn read_document(path: PathBuf) -> OpenedFile {
    use std::io::Read;
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let result = (|| -> Result<Vec<u8>, String> {
        // Match the ZIP import limit and bound reads even if the file grows.
        const MAX_SIZE: u64 = 257 * 1024 * 1024;
        let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        if !file.metadata().map_err(|e| e.to_string())?.is_file() {
            return Err("请选择 .reaui 文件。".into());
        }
        let mut bytes = Vec::new();
        file.take(MAX_SIZE + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() as u64 > MAX_SIZE {
            return Err("文件超过 .reaui 大小限制。".into());
        }
        Ok(bytes)
    })();
    match result {
        Ok(bytes) => OpenedFile {
            name,
            bytes: Some(bytes),
            error: None,
        },
        Err(error) => OpenedFile {
            name,
            bytes: None,
            error: Some(error),
        },
    }
}

// Formats the editor can place as an Image layer, mirroring `IMAGE_EXTENSIONS` in the web layer.
const IMAGE_EXTENSIONS: [&str; 6] = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
// Keep one image below the ZIP asset budget so it still round-trips through .reaui.
const MAX_IMAGE_SIZE: u64 = 32 * 1024 * 1024;

fn is_image(path: &std::path::Path) -> bool {
    path.extension().is_some_and(|ext| {
        IMAGE_EXTENSIONS
            .iter()
            .any(|known| ext.eq_ignore_ascii_case(known))
    })
}

fn read_image(path: PathBuf) -> OpenedFile {
    use std::io::Read;
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let result = (|| -> Result<Vec<u8>, String> {
        let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        if !file.metadata().map_err(|e| e.to_string())?.is_file() {
            return Err("请选择图片文件。".into());
        }
        let mut bytes = Vec::new();
        file.take(MAX_IMAGE_SIZE + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() as u64 > MAX_IMAGE_SIZE {
            return Err(format!(
                "图片超过 {} MB 上限。",
                MAX_IMAGE_SIZE / 1024 / 1024
            ));
        }
        Ok(bytes)
    })();
    match result {
        Ok(bytes) => OpenedFile {
            name,
            bytes: Some(bytes),
            error: None,
        },
        Err(error) => OpenedFile {
            name,
            bytes: None,
            error: Some(error),
        },
    }
}

/// The picker runs in Rust so image paths never travel from the webview.
#[tauri::command]
async fn pick_images(app: tauri::AppHandle) -> Result<Vec<OpenedFile>, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("插入图片")
        .add_filter("图片", &IMAGE_EXTENSIONS)
        .blocking_pick_files();
    let Some(paths) = picked else {
        return Ok(Vec::new());
    };
    let paths: Vec<PathBuf> = paths
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .filter(|path| is_image(path))
        .collect();
    if paths.is_empty() {
        return Ok(Vec::new());
    }
    tauri::async_runtime::spawn_blocking(move || paths.into_iter().map(read_image).collect())
        .await
        .map_err(|e| e.to_string())
}

// No arbitrary path argument: only files explicitly opened through the OS are read.
#[tauri::command]
async fn take_pending_open_files(
    state: tauri::State<'_, PendingFiles>,
) -> Result<Vec<OpenedFile>, String> {
    let paths: Vec<_> = state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .drain(..)
        .collect();
    tauri::async_runtime::spawn_blocking(move || paths.into_iter().map(read_document).collect())
        .await
        .map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .manage(PendingFiles::default())
        .manage(Arc::new(rea_local_agent::AgentService::default()))
        .invoke_handler(tauri::generate_handler![
            take_pending_open_files,
            pick_images,
            local_agent_request
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .build(tauri::generate_context!())
        .expect("failed to run REA UI desktop")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let state = app.state::<PendingFiles>();
                let mut pending = state.0.lock().expect("open file queue poisoned");
                for path in urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter(|path| is_document(path))
                {
                    if !pending.contains(&path) {
                        pending.push_back(path);
                    }
                }
                let has_files = !pending.is_empty();
                drop(pending);
                if has_files {
                    let _ = app.emit("reaui-open-files", ());
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_only_reaui_paths() {
        assert!(is_document(std::path::Path::new("/tmp/中文 设计.REAUI")));
        assert!(!is_document(std::path::Path::new("/tmp/test.reaui.zip")));
        assert!(!is_document(std::path::Path::new("/tmp/test.tsx")));
    }
    #[test]
    fn reports_a_missing_file_without_panicking() {
        let file = read_document(PathBuf::from("/nonexistent/设计.reaui"));
        assert_eq!(file.name, "设计.reaui");
        assert!(file.bytes.is_none());
        assert!(file.error.is_some());
    }
    #[test]
    fn reads_the_original_bytes_and_filename() {
        let path =
            std::env::temp_dir().join(format!("rea-ui-{}-中文 设计.reaui", std::process::id()));
        let bytes = [80, 75, 0, 255];
        std::fs::write(&path, bytes).unwrap();
        let file = read_document(path.clone());
        std::fs::remove_file(&path).unwrap();
        assert_eq!(file.name, path.file_name().unwrap().to_string_lossy());
        assert_eq!(file.bytes.unwrap(), bytes);
        assert!(file.error.is_none());
    }
    #[test]
    fn accepts_only_supported_image_extensions() {
        for name in ["/tmp/a.png", "/tmp/图 1.JPG", "/tmp/b.jpeg", "/tmp/c.gif", "/tmp/d.webp", "/tmp/e.svg"] {
            assert!(is_image(std::path::Path::new(name)), "{name} 应被视为图片");
        }
        for name in ["/tmp/a.tiff", "/tmp/a.png.reaui", "/tmp/a", "/tmp/a.svgz"] {
            assert!(!is_image(std::path::Path::new(name)), "{name} 不应被视为图片");
        }
    }
    #[test]
    fn reads_image_bytes_and_reports_errors() {
        let path = std::env::temp_dir().join(format!("rea-ui-{}-图.png", std::process::id()));
        let bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        std::fs::write(&path, bytes).unwrap();
        let file = read_image(path.clone());
        std::fs::remove_file(&path).unwrap();
        assert_eq!(file.name, path.file_name().unwrap().to_string_lossy());
        assert_eq!(file.bytes.unwrap(), bytes);
        assert!(file.error.is_none());

        let missing = read_image(PathBuf::from("/nonexistent/图.png"));
        assert_eq!(missing.name, "图.png");
        assert!(missing.bytes.is_none());
        assert!(missing.error.is_some());
    }
}
