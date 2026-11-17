use std::sync::Arc;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    path::{Path, PathBuf},
    sync::Mutex,
};
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
    /// Absolute path for documents opened through the OS; ⌘S writes back only to paths we handed out.
    path: Option<String>,
    bytes: Option<Vec<u8>>,
    error: Option<String>,
}

/// Remember which `.reaui` each document came from, so ⌘S can overwrite it without a dialog.
/// Only paths produced by an OS open event or the native save dialog may ever be written.
#[derive(Default, serde::Serialize, serde::Deserialize)]
struct DocumentPaths {
    bound: HashMap<String, PathBuf>,
    opened: HashSet<PathBuf>,
}

#[derive(Default)]
struct DocumentPathStore(Mutex<DocumentPaths>);

const PATH_STATE_FILE: &str = "document-paths.json";

fn path_state_file(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join(PATH_STATE_FILE))
}

fn load_path_state(app: &tauri::AppHandle) -> DocumentPaths {
    path_state_file(app)
        .and_then(|path| std::fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn persist_path_state(app: &tauri::AppHandle, state: &DocumentPaths) {
    let Some(path) = path_state_file(app) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(bytes) = serde_json::to_vec(state) {
        let _ = write_atomic(&path, &bytes);
    }
}

fn authorized(state: &DocumentPaths, id: &str, path: &Path) -> bool {
    state.bound.get(id).is_some_and(|bound| bound == path) || state.opened.contains(path)
}

/// The path ⌘S may overwrite without asking: only one this document opened or saved before, and only
/// while that file still exists — a moved or deleted document falls back to the save dialog instead
/// of being silently recreated at a stale path.
fn remembered_target(
    state: &DocumentPaths,
    id: &str,
    path: Option<&str>,
    choose_path: bool,
) -> Option<PathBuf> {
    if choose_path {
        return None;
    }
    let candidate = PathBuf::from(path?);
    (candidate.is_file() && authorized(state, id, &candidate)).then_some(candidate)
}

/// Replace the target in one step so a failed write cannot leave a half-written document.
fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let parent = path.parent().ok_or("保存路径不合法。")?;
    let name = path
        .file_name()
        .ok_or("保存路径不合法。")?
        .to_string_lossy()
        .into_owned();
    let temp = parent.join(format!(".{name}.{}.tmp", std::process::id()));
    let result = (|| -> std::io::Result<()> {
        let mut file = std::fs::File::create(&temp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        std::fs::rename(&temp, path)
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result.map_err(|error| format!("写入文件失败：{error}"))
}

/// A save dialog may drop or forget the extension; `.reaui` is the only format we write here.
fn with_reaui_extension(path: PathBuf) -> PathBuf {
    if path
        .extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("reaui"))
    {
        return path;
    }
    let mut name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    name.push_str(".reaui");
    path.with_file_name(name)
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
    // Report the resolved path so the webview hands back exactly what we authorized.
    let resolved = std::fs::canonicalize(&path).unwrap_or_else(|_| path.clone());
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
            path: Some(resolved.to_string_lossy().into_owned()),
            bytes: Some(bytes),
            error: None,
        },
        Err(error) => OpenedFile {
            name,
            path: None,
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
            path: None,
            bytes: Some(bytes),
            error: None,
        },
        Err(error) => OpenedFile {
            name,
            path: None,
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
    app: tauri::AppHandle,
    state: tauri::State<'_, PendingFiles>,
) -> Result<Vec<OpenedFile>, String> {
    let paths: Vec<_> = state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .drain(..)
        .collect();
    let files: Vec<OpenedFile> = tauri::async_runtime::spawn_blocking(move || {
        paths.into_iter().map(read_document).collect()
    })
    .await
    .map_err(|e| e.to_string())?;
    // Remember the paths the user opened from the OS; only those may later be overwritten in place.
    let store = app.state::<DocumentPathStore>();
    let mut known = store.0.lock().map_err(|e| e.to_string())?;
    let mut changed = false;
    for file in &files {
        if let Some(path) = &file.path {
            changed |= known.opened.insert(PathBuf::from(path));
        }
    }
    drop(known);
    if changed {
        let state = store.0.lock().map_err(|e| e.to_string())?;
        persist_path_state(&app, &state);
    }
    Ok(files)
}

/// Overwrite the document's own `.reaui`, or ask for a path on first save.
/// A path coming from the webview is only used when it was opened from the OS or picked earlier
/// in the native save dialog, so this command can never write to an arbitrary file.
#[tauri::command]
async fn save_document(
    app: tauri::AppHandle,
    id: String,
    name: String,
    bytes: Vec<u8>,
    path: Option<String>,
    choose_path: bool,
) -> Result<Option<String>, String> {
    let store = app.state::<DocumentPathStore>();
    let remembered = {
        let known = store.0.lock().map_err(|e| e.to_string())?;
        remembered_target(&known, &id, path.as_deref(), choose_path)
    };
    let target = match remembered {
        Some(path) => path,
        None => {
            let picked = app
                .dialog()
                .file()
                .set_title("保存 REA UI 文档")
                .set_file_name(&name)
                .add_filter("REA UI 文档", &["reaui"])
                .blocking_save_file();
            match picked {
                Some(file) => file.into_path().map_err(|error| error.to_string())?,
                None => return Ok(None),
            }
        }
    };
    let target = with_reaui_extension(target);
    write_atomic(&target, &bytes)?;
    let stored = std::fs::canonicalize(&target).unwrap_or(target);
    {
        let mut known = store.0.lock().map_err(|e| e.to_string())?;
        known.bound.insert(id, stored.clone());
        known.opened.insert(stored.clone());
        persist_path_state(&app, &known);
    }
    Ok(Some(stored.to_string_lossy().into_owned()))
}

pub fn run() {
    tauri::Builder::default()
        .manage(PendingFiles::default())
        .manage(DocumentPathStore::default())
        .manage(Arc::new(rea_local_agent::AgentService::default()))
        .setup(|app| {
            let handle = app.handle();
            let state = load_path_state(handle);
            let store = app.state::<DocumentPathStore>();
            *store.0.lock().expect("document path store poisoned") = state;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            take_pending_open_files,
            save_document,
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
        assert_eq!(file.name, path.file_name().unwrap().to_string_lossy());
        assert_eq!(file.bytes.unwrap(), bytes);
        assert!(file.error.is_none());
        // The path handed to the webview must be the resolved one, so ⌘S can hand it back verbatim.
        let reported = PathBuf::from(file.path.expect("打开成功应带路径"));
        assert_eq!(reported, std::fs::canonicalize(&path).unwrap());
        assert_eq!(reported.file_name().unwrap(), path.file_name().unwrap());
        std::fs::remove_file(&path).unwrap();
    }
    #[test]
    fn only_writes_paths_the_user_opened_or_picked() {
        let mut state = DocumentPaths::default();
        let opened = Path::new("/tmp/opened.reaui");
        state.opened.insert(opened.to_path_buf());
        assert!(authorized(&state, "doc_a", opened));
        assert!(!authorized(
            &state,
            "doc_a",
            Path::new("/tmp/elsewhere.reaui")
        ));
        state
            .bound
            .insert("doc_b".into(), PathBuf::from("/tmp/saved.reaui"));
        assert!(authorized(&state, "doc_b", Path::new("/tmp/saved.reaui")));
        // A binding only authorizes its own document.
        assert!(!authorized(&state, "doc_c", Path::new("/tmp/saved.reaui")));
    }
    #[test]
    fn saves_in_place_only_for_the_opened_file_or_save_as() {
        let path =
            std::env::temp_dir().join(format!("rea-ui-{}-in-place.reaui", std::process::id()));
        std::fs::write(&path, [80, 75]).unwrap();
        let path_string = path.to_string_lossy().into_owned();
        let mut state = DocumentPaths::default();
        state.bound.insert("doc_a".into(), path.clone());
        assert_eq!(
            remembered_target(&state, "doc_a", Some(&path_string), false),
            Some(path.clone())
        );
        // ⌘S must never turn into a write to some other file the webview names.
        assert_eq!(
            remembered_target(&state, "doc_a", Some("/tmp/其它.reaui"), false),
            None
        );
        assert_eq!(
            remembered_target(&state, "doc_b", Some(&path_string), false),
            None
        );
        assert_eq!(remembered_target(&state, "doc_a", None, false), None);
        // 另存为 always goes through the dialog.
        assert_eq!(
            remembered_target(&state, "doc_a", Some(&path_string), true),
            None
        );
        // A deleted or moved document is not recreated at the stale path.
        std::fs::remove_file(&path).unwrap();
        assert_eq!(
            remembered_target(&state, "doc_a", Some(&path_string), false),
            None
        );
    }
    #[test]
    fn replaces_the_document_in_one_step() {
        let path = std::env::temp_dir().join(format!("rea-ui-{}-write.reaui", std::process::id()));
        std::fs::write(&path, [1, 2, 3]).unwrap();
        write_atomic(&path, &[9, 8]).unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), vec![9, 8]);
        // The temporary file must not survive a successful save.
        let leftovers: Vec<_> = std::fs::read_dir(path.parent().unwrap())
            .unwrap()
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry.file_name().to_string_lossy().ends_with(".tmp")
                    && entry.file_name().to_string_lossy().contains("write.reaui")
            })
            .collect();
        assert!(leftovers.is_empty());
        std::fs::remove_file(&path).unwrap();
    }
    #[test]
    fn keeps_the_original_document_when_the_target_cannot_be_written() {
        let missing = Path::new("/nonexistent/设计.reaui");
        assert!(write_atomic(missing, &[1]).is_err());
    }
    #[test]
    fn adds_the_reaui_extension_when_the_dialog_forgets_it() {
        assert_eq!(
            with_reaui_extension(PathBuf::from("/tmp/设计")),
            PathBuf::from("/tmp/设计.reaui")
        );
        assert_eq!(
            with_reaui_extension(PathBuf::from("/tmp/设计.REAUI")),
            PathBuf::from("/tmp/设计.REAUI")
        );
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
