use chrono::Utc;
use log::{debug, info, warn};
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;
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

struct AppDatabase {
    conn: Mutex<Connection>,
}

impl AppDatabase {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = Self::get_db_path()?;
        info!("Initializing database at: {:?}", db_path);
        
        // Ensure directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let conn = Connection::open(&db_path)?;
        info!("Database connection established");
        
        // Initialize tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                tags TEXT,
                notes TEXT,
                pinned BOOLEAN DEFAULT 0,
                last_used TEXT
            )",
            [],
        )?;
        
        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_last_used ON projects(last_used DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_pinned ON projects(pinned DESC)",
            [],
        )?;
        
        Ok(AppDatabase {
            conn: Mutex::new(conn),
        })
    }
    
    fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        #[cfg(windows)]
        {
            let app_data = std::env::var("APPDATA")?;
            let path = PathBuf::from(app_data)
                .join("ClaudeLauncher")
                .join("projects.db");
            Ok(path)
        }
        
        #[cfg(not(windows))]
        {
            let home = dirs::data_dir()
                .ok_or("Could not find data directory")?;
            let path = home
                .join("claude-launcher")
                .join("projects.db");
            Ok(path)
        }
    }
    
    fn add_project(&self, path: String) -> Result<Project, String> {
        info!("Adding new project at path: {}", path);
        let conn = self.conn.lock().unwrap();
        
        // Check if project already exists
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM projects WHERE path = ?1)",
                params![&path],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        
        if exists {
            return Err("Project already exists".to_string());
        }
        
        let id = Uuid::new_v4().to_string();
        let name = std::path::Path::new(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unnamed")
            .to_string();
        
        let project = Project {
            id: id.clone(),
            path: path.clone(),
            name: name.clone(),
            tags: vec![],
            notes: String::new(),
            pinned: false,
            last_used: None,
        };
        
        conn.execute(
            "INSERT INTO projects (id, path, name, tags, notes, pinned, last_used) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &id,
                &path,
                &name,
                "[]",
                "",
                false,
                Option::<String>::None
            ],
        )
        .map_err(|e| e.to_string())?;
        
        Ok(project)
    }
    
    fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock().unwrap();
        
        let mut stmt = conn
            .prepare(
                "SELECT id, path, name, tags, notes, pinned, last_used 
                 FROM projects 
                 ORDER BY pinned DESC, last_used DESC NULLS LAST",
            )
            .map_err(|e| e.to_string())?;
        
        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    tags: serde_json::from_str(row.get::<_, String>(3)?.as_str()).unwrap_or_default(),
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        
        Ok(projects)
    }
    
    fn get_recent_projects(&self, limit: usize) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock().unwrap();
        
        let mut stmt = conn
            .prepare(
                "SELECT id, path, name, tags, notes, pinned, last_used 
                 FROM projects 
                 WHERE last_used IS NOT NULL
                 ORDER BY last_used DESC
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        
        let projects = stmt
            .query_map(params![limit], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    tags: serde_json::from_str(row.get::<_, String>(3)?.as_str()).unwrap_or_default(),
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        
        Ok(projects)
    }
    
    fn update_project(&self, id: String, updates: ProjectUpdate) -> Result<Project, String> {
        let conn = self.conn.lock().unwrap();
        
        // Build dynamic update query
        let mut sql_parts = vec![];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];
        
        if let Some(name) = &updates.name {
            sql_parts.push("name = ?");
            params.push(Box::new(name.clone()));
        }
        
        if let Some(tags) = &updates.tags {
            sql_parts.push("tags = ?");
            params.push(Box::new(serde_json::to_string(tags).unwrap()));
        }
        
        if let Some(notes) = &updates.notes {
            sql_parts.push("notes = ?");
            params.push(Box::new(notes.clone()));
        }
        
        if let Some(pinned) = &updates.pinned {
            sql_parts.push("pinned = ?");
            params.push(Box::new(*pinned));
        }
        
        if sql_parts.is_empty() {
            return Err("No updates provided".to_string());
        }
        
        params.push(Box::new(id.clone()));
        
        let sql = format!(
            "UPDATE projects SET {} WHERE id = ?",
            sql_parts.join(", ")
        );
        
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        conn.execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;
        
        // Fetch and return updated project
        self.get_project_by_id(&id)
    }
    
    fn get_project_by_id(&self, id: &str) -> Result<Project, String> {
        let conn = self.conn.lock().unwrap();
        
        conn.query_row(
            "SELECT id, path, name, tags, notes, pinned, last_used 
             FROM projects WHERE id = ?1",
            params![id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    tags: serde_json::from_str(row.get::<_, String>(3)?.as_str()).unwrap_or_default(),
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    }
    
    fn update_last_used(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        
        conn.execute(
            "UPDATE projects SET last_used = ?1 WHERE id = ?2",
            params![&now, id],
        )
        .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
}

#[tauri::command]
async fn init_database(_db: State<'_, AppDatabase>) -> Result<serde_json::Value, String> {
    // Database is already initialized in AppDatabase::new()
    Ok(serde_json::json!({
        "message": "Database initialized"
    }))
}

#[tauri::command]
async fn add_project(db: State<'_, AppDatabase>, path: String) -> Result<Project, String> {
    // Verify path exists
    if !std::path::Path::new(&path).exists() {
        return Err("Path does not exist".to_string());
    }
    
    db.add_project(path)
}

#[tauri::command]
async fn get_projects(db: State<'_, AppDatabase>) -> Result<Vec<Project>, String> {
    db.get_all_projects()
}

#[tauri::command]
async fn get_recent_projects(
    db: State<'_, AppDatabase>,
    limit: Option<usize>,
) -> Result<Vec<Project>, String> {
    db.get_recent_projects(limit.unwrap_or(5))
}

#[tauri::command]
async fn update_project(
    db: State<'_, AppDatabase>,
    id: String,
    updates: ProjectUpdate,
) -> Result<Project, String> {
    db.update_project(id, updates)
}

#[tauri::command]
async fn launch_project(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDatabase>,
    id: String,
    continue_flag: bool,
) -> Result<serde_json::Value, String> {
    info!("Launching project with id: {} (continue: {})", id, continue_flag);
    // Get project
    let project = db.get_project_by_id(&id)?;
    
    // Update last used
    db.update_last_used(&id)?;
    
    // Build command
    let shell = app_handle.shell();
    
    // Build the command with chained calls
    let mut cmd = shell.command("claude-code")
        .arg("--dangerously-skip-permissions");
    
    if continue_flag {
        cmd = cmd.arg("--continue");
    }
    
    cmd = cmd.arg(&project.path);
    
    // Launch asynchronously
    info!("Attempting to launch Claude Code for project: {}", project.name);
    match cmd.spawn() {
        Ok(_child) => {
            info!("Successfully launched Claude Code");
            Ok(serde_json::json!({
                "message": format!("Launched Claude Code for {}", project.name)
            }))
        }
        Err(e) => {
            warn!("Failed to launch claude-code: {}", e);
            // Try alternative command names
            let alt_names = ["claude", "claude-cli"];
            for name in &alt_names {
                let mut cmd = shell.command(name)
                    .arg("--dangerously-skip-permissions");
                
                if continue_flag {
                    cmd = cmd.arg("--continue");
                }
                
                cmd = cmd.arg(&project.path);
                
                if let Ok(_child) = cmd.spawn() {
                    return Ok(serde_json::json!({
                        "message": format!("Launched {} for {}", name, project.name)
                    }));
                }
            }
            
            Err(format!("Failed to launch Claude Code: {}. Make sure claude-code is installed and in PATH", e))
        }
    }
}

#[tauri::command]
async fn delete_project(db: State<'_, AppDatabase>, id: String) -> Result<serde_json::Value, String> {
    db.delete_project(&id)?;
    
    Ok(serde_json::json!({
        "message": "Project deleted"
    }))
}

#[tauri::command]
async fn check_claude_installed(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let shell = app_handle.shell();
    
    // Try different command names
    let cmd_names = ["claude-code", "claude", "claude-cli"];
    
    for name in &cmd_names {
        match shell.command(name).arg("--version").output().await {
            Ok(output) => {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    return Ok(serde_json::json!({
                        "installed": true,
                        "version": version,
                        "command": name
                    }));
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(serde_json::json!({
        "installed": false,
        "version": null
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    info!("Starting Claude Launcher...");
    info!("Current directory: {:?}", std::env::current_dir());
    info!("Executable path: {:?}", std::env::current_exe());
    
    let database = AppDatabase::new()
        .expect("Failed to initialize database");
    
    info!("Initializing Tauri plugins...");
    
    tauri::Builder::default()
        .manage(database)
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
            ])
            .level(log::LevelFilter::Debug)
            .build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            info!("Running Tauri setup hook...");
            info!("App name: {}", app.config().product_name.as_ref().unwrap_or(&"Unknown".to_string()));
            info!("App version: {}", app.config().version.as_ref().unwrap_or(&"Unknown".to_string()));
            
            let resource_dir = app.path().resource_dir();
            info!("Resource directory: {:?}", resource_dir);
            
            if let Ok(res_dir) = resource_dir {
                info!("Checking resource directory contents...");
                if let Ok(entries) = std::fs::read_dir(&res_dir) {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            info!("  Found resource: {:?}", entry.file_name());
                        }
                    }
                } else {
                    warn!("Could not read resource directory");
                }
            } else {
                warn!("Could not get resource directory path");
            }
            
            // Log the frontend dist path
            info!("Frontend dist configured as: {:?}", app.config().build.frontend_dist);
            
            // Check if dist folder exists relative to executable
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_parent) = exe_path.parent() {
                    let dist_path = exe_parent.join("../../../dist");
                    info!("Checking dist at: {:?}", dist_path);
                    if dist_path.exists() {
                        info!("Dist folder found at: {:?}", dist_path.canonicalize());
                        if let Ok(dist_entries) = std::fs::read_dir(&dist_path) {
                            info!("Dist folder contents:");
                            for entry in dist_entries {
                                if let Ok(entry) = entry {
                                    info!("  - {:?}", entry.file_name());
                                }
                            }
                        }
                    } else {
                        warn!("Dist folder not found at expected location");
                    }
                }
            }
            
            Ok(())
        })
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
        .on_window_event(|window, event| {
            debug!("Window event: {:?}", event);
        })
        .on_page_load(|webview, payload| {
            info!("Page load event: {:?}", payload.url());
            info!("Page event: {:?}", payload.event());
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}