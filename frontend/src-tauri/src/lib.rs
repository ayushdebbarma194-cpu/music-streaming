// ArchiveTune Tauri shell. The frontend is a thin UI shell; all logic lives in
// the Python backend, so the Rust side only opens a window and loads the web app.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
