use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
struct Project {
    id: String,
    path: String,
    name: String,
    tags: Vec<String>,
    notes: String,
    pinned: bool,
    last_used: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectUpdate {
    name: Option<String>,
    tags: Option<Vec<String>>,
    notes: Option<String>,
    pinned: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PythonCommand {
    command: String,
    args: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

struct PythonSidecar(Mutex<Option<std::process::Child>>);

#[tauri::command]
async fn init_database(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
) -> Result<serde_json::Value, String> {
    call_python_sidecar(
        app_handle,
        sidecar,
        "init_database",
        serde_json::json!({}),
    )
    .await
}

#[tauri::command]
async fn add_project(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
    path: String,
) -> Result<Project, String> {
    let response = call_python_sidecar(
        app_handle,
        sidecar,
        "add_project",
        serde_json::json!({ "path": path }),
    )
    .await?;

    serde_json::from_value(response)
        .map_err(|e| format!("Failed to parse project: {}", e))
}

#[tauri::command]
async fn get_projects(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
) -> Result<Vec<Project>, String> {
    let response = call_python_sidecar(
        app_handle,
        sidecar,
        "get_projects",
        serde_json::json!({}),
    )
    .await?;

    serde_json::from_value(response)
        .map_err(|e| format!("Failed to parse projects: {}", e))
}

#[tauri::command]
async fn get_recent_projects(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
    limit: Option<usize>,
) -> Result<Vec<Project>, String> {
    let response = call_python_sidecar(
        app_handle,
        sidecar,
        "get_recent_projects",
        serde_json::json!({ "limit": limit.unwrap_or(5) }),
    )
    .await?;

    serde_json::from_value(response)
        .map_err(|e| format!("Failed to parse projects: {}", e))
}

#[tauri::command]
async fn update_project(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
    id: String,
    updates: ProjectUpdate,
) -> Result<Project, String> {
    let response = call_python_sidecar(
        app_handle,
        sidecar,
        "update_project",
        serde_json::json!({
            "id": id,
            "updates": updates
        }),
    )
    .await?;

    serde_json::from_value(response)
        .map_err(|e| format!("Failed to parse project: {}", e))
}

#[tauri::command]
async fn launch_project(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
    id: String,
    continue_flag: bool,
) -> Result<serde_json::Value, String> {
    call_python_sidecar(
        app_handle,
        sidecar,
        "launch_project",
        serde_json::json!({
            "id": id,
            "continue_flag": continue_flag
        }),
    )
    .await
}

#[tauri::command]
async fn delete_project(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
    id: String,
) -> Result<serde_json::Value, String> {
    call_python_sidecar(
        app_handle,
        sidecar,
        "delete_project",
        serde_json::json!({ "id": id }),
    )
    .await
}

#[tauri::command]
async fn check_claude_installed(
    app_handle: tauri::AppHandle,
    sidecar: State<'_, PythonSidecar>,
) -> Result<serde_json::Value, String> {
    call_python_sidecar(
        app_handle,
        sidecar,
        "check_claude_installed",
        serde_json::json!({}),
    )
    .await
}

async fn call_python_sidecar(
    app_handle: tauri::AppHandle,
    _sidecar: State<'_, PythonSidecar>,
    command: &str,
    args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // For now, we'll call Python directly. In production, we'd use a proper sidecar.
    let shell = app_handle.shell();
    
    // Get the path to the Python sidecar
    let python_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join("python")
        .join("main.py");
    
    // For development, use the source path
    let python_path = if python_path.exists() {
        python_path
    } else {
        std::path::PathBuf::from("src-tauri/python/main.py")
    };
    
    let output = shell
        .command("python")
        .arg(python_path)
        .args(["-c", &format!(
            "import sys, json; sys.path.insert(0, 'src-tauri/python'); from main import ClaudeLauncherServer; server = ClaudeLauncherServer(); result = server.handle_command({}, {}); print(json.dumps(result))",
            serde_json::to_string(&command).unwrap(),
            serde_json::to_string(&args).unwrap()
        )])
        .output()
        .await
        .map_err(|e| format!("Failed to execute Python sidecar: {}", e))?;
    
    if !output.status.success() {
        return Err(format!(
            "Python sidecar failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    let response: PythonResponse = serde_json::from_str(&String::from_utf8_lossy(&output.stdout))
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;
    
    if response.success {
        Ok(response.data.unwrap_or(serde_json::Value::Null))
    } else {
        Err(response.error.unwrap_or_else(|| "Unknown error".to_string()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PythonSidecar(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            init_database,
            add_project,
            get_projects,
            get_recent_projects,
            update_project,
            launch_project,
            delete_project,
            check_claude_installed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
