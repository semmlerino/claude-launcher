use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
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

struct AppState {
    projects: Mutex<HashMap<String, Project>>,
}

#[tauri::command]
async fn init_database() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "message": "Database initialized (in-memory)"
    }))
}

#[tauri::command]
async fn add_project(
    state: State<'_, AppState>,
    path: String,
) -> Result<Project, String> {
    let id = Uuid::new_v4().to_string();
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unnamed")
        .to_string();
    
    let project = Project {
        id: id.clone(),
        path,
        name,
        tags: vec![],
        notes: String::new(),
        pinned: false,
        last_used: None,
    };
    
    let mut projects = state.projects.lock().unwrap();
    projects.insert(id, project.clone());
    
    Ok(project)
}

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let projects = state.projects.lock().unwrap();
    let mut all_projects: Vec<Project> = projects.values().cloned().collect();
    
    // Sort by pinned first, then by name
    all_projects.sort_by(|a, b| {
        match (a.pinned, b.pinned) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(all_projects)
}

#[tauri::command]
async fn get_recent_projects(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<Project>, String> {
    let projects = state.projects.lock().unwrap();
    let mut recent: Vec<Project> = projects
        .values()
        .filter(|p| p.last_used.is_some())
        .cloned()
        .collect();
    
    recent.sort_by(|a, b| b.last_used.cmp(&a.last_used));
    recent.truncate(limit.unwrap_or(5));
    
    Ok(recent)
}

#[tauri::command]
async fn update_project(
    state: State<'_, AppState>,
    id: String,
    updates: ProjectUpdate,
) -> Result<Project, String> {
    let mut projects = state.projects.lock().unwrap();
    
    if let Some(project) = projects.get_mut(&id) {
        if let Some(name) = updates.name {
            project.name = name;
        }
        if let Some(tags) = updates.tags {
            project.tags = tags;
        }
        if let Some(notes) = updates.notes {
            project.notes = notes;
        }
        if let Some(pinned) = updates.pinned {
            project.pinned = pinned;
        }
        
        Ok(project.clone())
    } else {
        Err("Project not found".to_string())
    }
}

#[tauri::command]
async fn launch_project(
    state: State<'_, AppState>,
    id: String,
    continue_flag: bool,
) -> Result<serde_json::Value, String> {
    let mut projects = state.projects.lock().unwrap();
    
    if let Some(project) = projects.get_mut(&id) {
        // Update last_used
        project.last_used = Some(chrono::Utc::now().to_rfc3339());
        
        // In a real implementation, we would launch Claude Code here
        // For now, just return success
        Ok(serde_json::json!({
            "message": format!("Would launch Claude Code for {} with continue={}", project.name, continue_flag),
            "pid": 12345
        }))
    } else {
        Err("Project not found".to_string())
    }
}

#[tauri::command]
async fn delete_project(
    state: State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value, String> {
    let mut projects = state.projects.lock().unwrap();
    
    if projects.remove(&id).is_some() {
        Ok(serde_json::json!({
            "message": "Project deleted"
        }))
    } else {
        Err("Project not found".to_string())
    }
}

#[tauri::command]
async fn check_claude_installed() -> Result<serde_json::Value, String> {
    // For now, return mock data
    Ok(serde_json::json!({
        "installed": true,
        "version": "1.0.0 (mock)"
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            projects: Mutex::new(HashMap::new()),
        })
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