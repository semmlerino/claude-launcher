use chrono::Utc;
use log::{debug, info, warn};
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use std::env;
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;
use parking_lot::Mutex;
use lru::LruCache;
use std::num::NonZeroUsize;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    id: String,
    path: String,
    name: String,
    tags: Vec<String>,
    notes: String,
    pinned: bool,
    last_used: Option<String>,
    background_color: Option<String>,
    icon: Option<String>,
    icon_size: Option<u32>,
    continue_flag: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectUpdate {
    name: Option<String>,
    tags: Option<Vec<String>>,
    notes: Option<String>,
    pinned: Option<bool>,
    background_color: Option<String>,
    icon: Option<String>,
    icon_size: Option<u32>,
    continue_flag: Option<bool>,
}

// Export/Import structures
#[derive(Debug, Serialize, Deserialize)]
struct ExportData {
    version: u32,
    exported_at: String,
    application: String,
    projects: Vec<ExportedProject>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportedProject {
    path: String,
    name: String,
    tags: Vec<String>,
    notes: String,
    pinned: bool,
    background_color: Option<String>,
    icon: Option<String>,
    icon_size: Option<u32>,
    continue_flag: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImportResult {
    imported: usize,
    skipped: usize,
    failed: usize,
    errors: Vec<String>,
}

// Helper functions for path sanitization
fn escape_bash_single_quote(s: &str) -> String {
    // Escape single quotes for bash: ' becomes '\''
    s.replace("'", "'\\''")
}

fn escape_batch_string(s: &str) -> String {
    // Escape batch file metacharacters
    s.chars().map(|c| match c {
        '%' => "%%".to_string(),
        '^' | '&' | '<' | '>' | '|' => format!("^{}", c),
        _ => c.to_string(),
    }).collect()
}

fn validate_path_safe(path: &str) -> Result<(), String> {
    // Reject paths with control characters or null bytes
    if path.chars().any(|c| c.is_control() || c == '\0') {
        return Err("Path contains invalid control characters".to_string());
    }
    Ok(())
}

// Helper to parse JSON tags with logging on failure
fn parse_tags_json(json_str: &str, project_id: &str) -> Vec<String> {
    match serde_json::from_str(json_str) {
        Ok(tags) => tags,
        Err(e) => {
            warn!("Failed to parse tags JSON for project {}: {} (value: {})", project_id, e, json_str);
            vec![]
        }
    }
}

// Thread-safe wrapper for SQLite connection
struct AppDatabase {
    conn: Mutex<Connection>,
    settings_cache: Mutex<LruCache<String, String>>,
    projects_cache: Mutex<Option<Vec<Project>>>,
}

// SAFETY: AppDatabase is safe to share between threads because:
// 1. All fields are wrapped in parking_lot::Mutex, ensuring synchronized access
// 2. rusqlite::Connection is opened in serialized mode (default), making it thread-safe
//    when accessed through a mutex (see https://www.sqlite.org/threadsafe.html)
// 3. The Mutex guarantees only one thread accesses the connection at a time
// 4. LruCache and Option<Vec<Project>> are Send+Sync when wrapped in Mutex
unsafe impl Send for AppDatabase {}
unsafe impl Sync for AppDatabase {}

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
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                tags TEXT,
                notes TEXT,
                pinned BOOLEAN DEFAULT 0,
                last_used TEXT,
                background_color TEXT,
                icon TEXT,
                icon_size INTEGER,
                continue_flag BOOLEAN DEFAULT 0
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // Initialize default WSL settings if they don't exist
        let default_settings = vec![
            ("use_wsl", "true"),  // Enable WSL by default on Windows
            ("claude_executable_path", "/home/gabrielh/.nvm/versions/node/v24.1.0/bin/claude"),
            ("keep_terminal_open", "false"),
            ("wsl_launch_method", "batch"),  // Options: batch, wt, powershell
        ];
        
        for (key, default_value) in default_settings {
            // Only insert if the setting doesn't already exist
            match conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
                params![key, default_value],
            ) {
                Ok(_) => {},
                Err(e) => warn!("Failed to initialize setting {}: {}", key, e),
            }
        }
        
        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_last_used ON projects(last_used DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_pinned ON projects(pinned DESC)",
            [],
        )?;
        
        // Add unique constraint on path if it doesn't exist (for existing databases)
        // Use try/catch pattern instead of fragile LIKE query
        match conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_path ON projects(path)",
            [],
        ) {
            Ok(_) => info!("Ensured UNIQUE constraint on path column"),
            Err(e) => {
                // Only warn if it's not an "already exists" type error
                let err_str = e.to_string();
                if !err_str.contains("already exists") {
                    warn!("Could not add UNIQUE constraint on path: {}. This may be due to duplicate paths.", e);
                }
            }
        }

        // Add background_color column if it doesn't exist (for existing databases)
        let has_background_color: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('projects') WHERE name = 'background_color'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);
        
        if !has_background_color {
            info!("Adding background_color column to projects table");
            match conn.execute(
                "ALTER TABLE projects ADD COLUMN background_color TEXT",
                [],
            ) {
                Ok(_) => info!("Successfully added background_color column"),
                Err(e) => warn!("Could not add background_color column: {}", e),
            }
        }

        // Add continue_flag column if it doesn't exist (for existing databases)
        let has_continue_flag: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('projects') WHERE name = 'continue_flag'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);
        
        if !has_continue_flag {
            info!("Adding continue_flag column to projects table");
            match conn.execute(
                "ALTER TABLE projects ADD COLUMN continue_flag BOOLEAN DEFAULT 0",
                [],
            ) {
                Ok(_) => info!("Successfully added continue_flag column"),
                Err(e) => warn!("Could not add continue_flag column: {}", e),
            }
        }

        // Add icon column if it doesn't exist (for existing databases)
        let has_icon: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('projects') WHERE name = 'icon'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);
        
        if !has_icon {
            info!("Adding icon column to projects table");
            match conn.execute(
                "ALTER TABLE projects ADD COLUMN icon TEXT",
                [],
            ) {
                Ok(_) => info!("Successfully added icon column"),
                Err(e) => warn!("Could not add icon column: {}", e),
            }
        }

        // Add icon_size column if it doesn't exist (for existing databases)
        let has_icon_size: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('projects') WHERE name = 'icon_size'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);
        
        if !has_icon_size {
            info!("Adding icon_size column to projects table");
            match conn.execute(
                "ALTER TABLE projects ADD COLUMN icon_size INTEGER",
                [],
            ) {
                Ok(_) => info!("Successfully added icon_size column"),
                Err(e) => warn!("Could not add icon_size column: {}", e),
            }
        }
        
        Ok(AppDatabase {
            conn: Mutex::new(conn),
            settings_cache: Mutex::new(LruCache::new(NonZeroUsize::new(100).unwrap())),
            projects_cache: Mutex::new(None),
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
        let conn = self.conn.lock();
        
        let id = Uuid::new_v4().to_string();
        let name = std::path::Path::new(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unnamed")
            .to_string();
        
        // Try to insert the project
        let result = conn.execute(
            "INSERT INTO projects (id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                &id,
                &path,
                &name,
                "[]",
                "",
                false,
                Option::<String>::None,
                Option::<String>::None,
                Option::<String>::None,
                Option::<u32>::None,
                false
            ],
        );
        
        match result {
            Ok(_) => {
                // Successfully inserted - invalidate cache
                self.invalidate_projects_cache();
                Ok(Project {
                    id: id.clone(),
                    path: path.clone(),
                    name: name.clone(),
                    tags: vec![],
                    notes: String::new(),
                    pinned: false,
                    last_used: None,
                    background_color: None,
                    icon: None,
                    icon_size: None,
                    continue_flag: false,
                })
            }
            Err(rusqlite::Error::SqliteFailure(error, _)) 
                if error.code == rusqlite::ErrorCode::ConstraintViolation => {
                // Project already exists, fetch and return it
                info!("Project already exists at path: {}, returning existing project", path);
                conn.query_row(
                    "SELECT id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag
                     FROM projects WHERE path = ?1",
                    params![&path],
                    |row| {
                        let id: String = row.get(0)?;
                        let tags_json: String = row.get(3)?;
                        Ok(Project {
                            tags: parse_tags_json(&tags_json, &id),
                            id,
                            path: row.get(1)?,
                            name: row.get(2)?,
                            notes: row.get(4)?,
                            pinned: row.get(5)?,
                            last_used: row.get(6)?,
                            background_color: row.get(7)?,
                            icon: row.get(8)?,
                            icon_size: row.get(9)?,
                            continue_flag: row.get(10)?,
                        })
                    },
                )
                .map_err(|e| e.to_string())
            }
            Err(e) => {
                // Other error
                Err(e.to_string())
            }
        }
    }
    
    fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        // Check cache first
        {
            let cache = self.projects_cache.lock();
            if let Some(ref projects) = *cache {
                return Ok(projects.clone());
            }
        }
        
        // Cache miss, query database
        let conn = self.conn.lock();
        
        let mut stmt = conn
            .prepare(
                "SELECT id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag
                 FROM projects 
                 ORDER BY pinned DESC, last_used DESC NULLS LAST",
            )
            .map_err(|e| e.to_string())?;
        
        let projects = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let tags_json: String = row.get(3)?;
                Ok(Project {
                    tags: parse_tags_json(&tags_json, &id),
                    id,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                    background_color: row.get(7)?,
                    icon: row.get(8)?,
                    icon_size: row.get(9)?,
                    continue_flag: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        
        // Cache the results
        {
            let mut cache = self.projects_cache.lock();
            *cache = Some(projects.clone());
        }
        
        Ok(projects)
    }
    
    fn invalidate_projects_cache(&self) {
        let mut cache = self.projects_cache.lock();
        *cache = None;
    }
    
    fn get_recent_projects(&self, limit: usize) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock();
        
        let mut stmt = conn
            .prepare(
                "SELECT id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag
                 FROM projects 
                 WHERE last_used IS NOT NULL
                 ORDER BY last_used DESC
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        
        let projects = stmt
            .query_map(params![limit], |row| {
                let id: String = row.get(0)?;
                let tags_json: String = row.get(3)?;
                Ok(Project {
                    tags: parse_tags_json(&tags_json, &id),
                    id,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                    background_color: row.get(7)?,
                    icon: row.get(8)?,
                    icon_size: row.get(9)?,
                    continue_flag: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;

        Ok(projects)
    }
    
    fn update_project(&self, id: String, updates: ProjectUpdate) -> Result<Project, String> {
        // Execute update in a scoped block to release the lock
        {
            let conn = self.conn.lock();
            
            // Build dynamic update query
            let mut sql_parts = vec![];
            let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];
            
            if let Some(name) = &updates.name {
                sql_parts.push("name = ?");
                params.push(Box::new(name.clone()));
            }
            
            if let Some(tags) = &updates.tags {
                sql_parts.push("tags = ?");
                let tags_json = serde_json::to_string(tags)
                    .map_err(|e| format!("Failed to serialize tags: {}", e))?;
                params.push(Box::new(tags_json));
            }
            
            if let Some(notes) = &updates.notes {
                sql_parts.push("notes = ?");
                params.push(Box::new(notes.clone()));
            }
            
            if let Some(pinned) = &updates.pinned {
                sql_parts.push("pinned = ?");
                params.push(Box::new(*pinned));
            }
            
            if let Some(background_color) = &updates.background_color {
                sql_parts.push("background_color = ?");
                params.push(Box::new(background_color.clone()));
            }
            
            if let Some(icon) = &updates.icon {
                sql_parts.push("icon = ?");
                params.push(Box::new(icon.clone()));
            }
            
            if let Some(icon_size) = &updates.icon_size {
                sql_parts.push("icon_size = ?");
                params.push(Box::new(*icon_size));
            }
            
            if let Some(continue_flag) = &updates.continue_flag {
                sql_parts.push("continue_flag = ?");
                params.push(Box::new(*continue_flag));
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
        } // Lock is released here
        
        // Invalidate cache after update
        self.invalidate_projects_cache();
        
        // Fetch and return updated project - now can acquire lock again
        self.get_project_by_id(&id)
    }
    
    fn get_project_by_id(&self, id: &str) -> Result<Project, String> {
        let conn = self.conn.lock();

        conn.query_row(
            "SELECT id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag
             FROM projects WHERE id = ?1",
            params![id],
            |row| {
                let proj_id: String = row.get(0)?;
                let tags_json: String = row.get(3)?;
                Ok(Project {
                    tags: parse_tags_json(&tags_json, &proj_id),
                    id: proj_id,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    notes: row.get(4)?,
                    pinned: row.get(5)?,
                    last_used: row.get(6)?,
                    background_color: row.get(7)?,
                    icon: row.get(8)?,
                    icon_size: row.get(9)?,
                    continue_flag: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    }
    
    fn update_last_used(&self, id: &str) -> Result<(), String> {
        {
            let conn = self.conn.lock();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "UPDATE projects SET last_used = ?1 WHERE id = ?2",
                params![&now, id],
            )
            .map_err(|e| e.to_string())?;
        } // Lock is released here

        // Invalidate cache so next get_all_projects() returns fresh data
        self.invalidate_projects_cache();

        Ok(())
    }
    
    fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        
        // Invalidate cache after deletion
        self.invalidate_projects_cache();
        
        Ok(())
    }
    
    fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        // Check cache first (use get() to update LRU order on hit)
        {
            let mut cache = self.settings_cache.lock();
            if let Some(value) = cache.get(key) {
                return Ok(Some(value.clone()));
            }
        }
        
        let conn = self.conn.lock();
        
        let result: Result<String, rusqlite::Error> = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );
        
        match result {
            Ok(value) => {
                // Cache the result
                {
                    let mut cache = self.settings_cache.lock();
                    cache.put(key.to_string(), value.clone());
                }
                Ok(Some(value))
            },
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }
    
    fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value, Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
        
        // Update cache
        {
            let mut cache = self.settings_cache.lock();
            cache.put(key.to_string(), value.to_string());
        }
        
        Ok(())
    }

    // Custom icon utility methods
    fn get_custom_icons_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        #[cfg(windows)]
        {
            let app_data = std::env::var("APPDATA")?;
            let path = PathBuf::from(app_data)
                .join("ClaudeLauncher")
                .join("custom-icons");
            Ok(path)
        }
        
        #[cfg(not(windows))]
        {
            let home = dirs::data_dir()
                .ok_or("Could not find data directory")?;
            let path = home
                .join("claude-launcher")
                .join("custom-icons");
            Ok(path)
        }
    }

    fn ensure_custom_icons_dir() -> Result<PathBuf, String> {
        let icons_dir = Self::get_custom_icons_dir()
            .map_err(|e| format!("Failed to get custom icons directory: {}", e))?;
        
        if !icons_dir.exists() {
            std::fs::create_dir_all(&icons_dir)
                .map_err(|e| format!("Failed to create custom icons directory: {}", e))?;
        }
        
        Ok(icons_dir)
    }

    fn validate_icon_file_format(file_path: &str) -> Result<(), String> {
        let path = std::path::Path::new(file_path);
        
        // Check if file exists
        if !path.exists() {
            return Err("File does not exist".to_string());
        }
        
        // Check file extension
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase())
            .ok_or("File has no extension")?;
        
        match extension.as_str() {
            "svg" | "png" | "jpg" | "jpeg" | "ico" | "webp" => Ok(()),
            _ => Err(format!("Unsupported file format: {}", extension)),
        }
    }

    fn get_custom_icon_files(&self) -> Result<Vec<serde_json::Value>, String> {
        let icons_dir = Self::ensure_custom_icons_dir()?;
        
        let mut icons = Vec::new();
        
        match std::fs::read_dir(&icons_dir) {
            Ok(entries) => {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                                // Extract the extension for type information
                                let extension = path.extension()
                                    .and_then(|ext| ext.to_str())
                                    .unwrap_or("unknown");
                                
                                icons.push(serde_json::json!({
                                    "id": filename,
                                    "name": filename,
                                    "type": extension,
                                    "path": format!("custom://{}", filename)
                                }));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                // Directory doesn't exist or can't be read, log and return empty list
                warn!("Could not read custom icons directory: {}", e);
                return Ok(vec![]);
            }
        }
        
        // Sort by filename for consistent ordering
        icons.sort_by(|a, b| {
            a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
        });
        
        Ok(icons)
    }

    fn delete_custom_icon_file(&self, icon_id: &str) -> Result<(), String> {
        let icons_dir = Self::ensure_custom_icons_dir()?;
        let icon_path = icons_dir.join(icon_id);
        
        if !icon_path.exists() {
            return Err("Custom icon file not found".to_string());
        }
        
        std::fs::remove_file(&icon_path)
            .map_err(|e| format!("Failed to delete custom icon file: {}", e))?;
        
        // Also update any projects that were using this icon
        let custom_icon_path = format!("custom://{}", icon_id);
        let should_invalidate = {
            // Scoped block ensures lock is released before invalidate_projects_cache
            let conn = self.conn.lock();

            // Update projects using this icon to clear the icon field
            match conn.execute(
                "UPDATE projects SET icon = NULL WHERE icon = ?1",
                params![&custom_icon_path],
            ) {
                Ok(updated_count) => {
                    if updated_count > 0 {
                        info!("Cleared icon from {} projects after deleting custom icon {}", updated_count, icon_id);
                        true
                    } else {
                        false
                    }
                }
                Err(e) => {
                    warn!("Failed to clear icon from projects: {}", e);
                    false
                }
            }
        }; // Lock is released here

        if should_invalidate {
            self.invalidate_projects_cache();
        }

        Ok(())
    }
}

/// Helper function to launch Claude via WSL using a batch file
fn launch_wsl_batch(
    app_handle: &tauri::AppHandle,
    project: &Project,
    claude_path: &str,
    bash_safe_path: &str,
    continue_flag: bool,
    keep_terminal: bool,
) -> Result<serde_json::Value, String> {
    // Create temporary batch file for reliable WSL launch
    let temp_dir = env::temp_dir();
    let batch_file = temp_dir.join(format!("claude_launcher_{}.bat", Uuid::new_v4()));

    // Escape strings for safe interpolation
    let safe_name = escape_batch_string(&project.name);
    let windows_path = project.path.replace("\\", "\\\\");
    let safe_windows_path = escape_batch_string(&windows_path);

    // Build batch file content
    let batch_content = format!(
        "@echo off\n\
         title Claude - {}\n\
         echo Claude Launcher - WSL Mode\n\
         echo Project: {}\n\
         echo Path: {}\n\
         echo.\n\
         wsl -e bash -c \"cd \\\"$(wslpath '{}')\\\" && {} --dangerously-skip-permissions{}{}\"\n\
         {}",
        safe_name,
        safe_name,
        safe_windows_path,
        bash_safe_path,
        claude_path,
        if continue_flag { " --continue" } else { "" },
        if keep_terminal { " && exec bash" } else { " || echo 'Failed to launch Claude. Exit code: '$?; read -p 'Press Enter to close...'" },
        if !keep_terminal { "pause" } else { "" }
    );

    // Write batch file
    match fs::write(&batch_file, batch_content) {
        Ok(_) => {
            info!("Created batch file: {:?}", batch_file);

            // Use the opener plugin to launch the batch file
            let batch_path_str = batch_file.to_str()
                .ok_or_else(|| "Batch file path contains invalid UTF-8".to_string())?;
            match app_handle.opener().open_path(batch_path_str, None::<&str>) {
                Ok(_) => {
                    info!("Successfully opened batch file via system handler");

                    // Clean up batch file after a delay
                    let batch_file_clone = batch_file.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(60));
                        let _ = fs::remove_file(&batch_file_clone);
                        info!("Cleaned up batch file: {:?}", batch_file_clone);
                    });

                    Ok(serde_json::json!({
                        "message": format!("Launched Claude Code for {} (WSL)", project.name)
                    }))
                }
                Err(e) => {
                    warn!("Failed to open batch file: {}", e);
                    let _ = fs::remove_file(&batch_file);
                    Err(format!("Failed to launch Claude Code via WSL: {}", e))
                }
            }
        }
        Err(e) => {
            warn!("Failed to create batch file: {}", e);
            Err(format!("Failed to create launch script: {}", e))
        }
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

    // Build command
    let shell = app_handle.shell();

    // Check if WSL mode is enabled (only on Windows)
    let use_wsl = if cfg!(windows) {
        db.get_setting("use_wsl")?.unwrap_or_else(|| "false".to_string()) == "true"
    } else {
        false
    };

    if use_wsl {
        // Get WSL settings
        let claude_path = db.get_setting("claude_executable_path")?
            .unwrap_or_else(|| "claude".to_string());
        let keep_terminal = db.get_setting("keep_terminal_open")?
            .unwrap_or_else(|| "false".to_string()) == "true";
        let launch_method = db.get_setting("wsl_launch_method")?
            .unwrap_or_else(|| "batch".to_string());

        // Validate paths for security - reject control characters
        // Do this BEFORE updating last_used to avoid state inconsistency
        validate_path_safe(&project.path)?;
        validate_path_safe(&claude_path)?;
        validate_path_safe(&project.name)?;

        // Update last used only after validation succeeds
        db.update_last_used(&id)?;

        // Escape strings for safe interpolation
        let bash_safe_path = escape_bash_single_quote(&project.path);

        // Build the WSL command based on launch method
        match launch_method.as_str() {
            "wt" => {
                // Windows Terminal method
                info!("Using Windows Terminal launch method");
                let wsl_command = format!(
                    "wsl -e bash -c \"cd \\\"$(wslpath '{}')\\\" && {} --dangerously-skip-permissions{}{}\"",
                    bash_safe_path,
                    claude_path,
                    if continue_flag { " --continue" } else { "" },
                    if keep_terminal { " && exec bash" } else { "" }
                );

                let cmd = shell.command("wt")
                    .arg("-w").arg("0")
                    .arg("--title").arg(format!("Claude - {}", project.name))
                    .arg("cmd").arg("/c").arg(&wsl_command);

                match cmd.spawn() {
                    Ok(_) => {
                        info!("Launched via Windows Terminal");
                        Ok(serde_json::json!({
                            "message": format!("Launched Claude Code for {} (WSL/WT)", project.name)
                        }))
                    }
                    Err(e) => {
                        warn!("Windows Terminal failed: {}, falling back to batch", e);
                        // Fall back to batch method
                        launch_wsl_batch(&app_handle, &project, &claude_path, &bash_safe_path, continue_flag, keep_terminal)
                    }
                }
            }

            "powershell" => {
                // PowerShell method
                info!("Using PowerShell launch method");
                let ps_command = format!(
                    "wsl -e bash -c \\\"cd `$(wslpath '{}') && {} --dangerously-skip-permissions{}{}\\\"",
                    bash_safe_path,
                    claude_path,
                    if continue_flag { " --continue" } else { "" },
                    if keep_terminal { " && exec bash" } else { "" }
                );

                let title_safe = project.name.replace("'", "''");
                let cmd = shell.command("powershell")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("$Host.UI.RawUI.WindowTitle = 'Claude - {}'; {}", title_safe, ps_command));

                match cmd.spawn() {
                    Ok(_) => {
                        info!("Launched via PowerShell");
                        Ok(serde_json::json!({
                            "message": format!("Launched Claude Code for {} (WSL/PS)", project.name)
                        }))
                    }
                    Err(e) => {
                        warn!("PowerShell failed: {}, falling back to batch", e);
                        // Fall back to batch method
                        launch_wsl_batch(&app_handle, &project, &claude_path, &bash_safe_path, continue_flag, keep_terminal)
                    }
                }
            }

            _ => {
                // Default: batch file method
                info!("Using batch file launch method");
                launch_wsl_batch(&app_handle, &project, &claude_path, &bash_safe_path, continue_flag, keep_terminal)
            }
        }
    } else {
        // Non-WSL execution (existing logic)
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
                // Update last used only after successful launch
                let _ = db.update_last_used(&id);
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
                        // Update last used only after successful launch
                        let _ = db.update_last_used(&id);
                        return Ok(serde_json::json!({
                            "message": format!("Launched {} for {}", name, project.name)
                        }));
                    }
                }
                
                Err(format!("Failed to launch Claude Code: {}. Make sure claude-code is installed and in PATH", e))
            }
        }
    }
}

#[tauri::command]
async fn open_project_folder(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDatabase>,
    id: String,
) -> Result<serde_json::Value, String> {
    info!("Opening project folder for id: {}", id);
    
    // Get project
    let project = db.get_project_by_id(&id)?;
    
    // Open the project folder in the system file manager
    match app_handle.opener().open_path(&project.path, None::<&str>) {
        Ok(_) => {
            info!("Successfully opened project folder: {}", project.path);
            Ok(serde_json::json!({
                "message": format!("Opened folder for {}", project.name)
            }))
        }
        Err(e) => {
            warn!("Failed to open project folder: {}", e);
            Err(format!("Failed to open project folder: {}", e))
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
async fn check_claude_installed(app_handle: tauri::AppHandle, db: State<'_, AppDatabase>) -> Result<serde_json::Value, String> {
    let shell = app_handle.shell();
    
    // Check if WSL mode is enabled (only on Windows)
    let use_wsl = if cfg!(windows) {
        db.get_setting("use_wsl")?.unwrap_or_else(|| "false".to_string()) == "true"
    } else {
        false
    };
    
    if use_wsl {
        // Check Claude installation via WSL
        let claude_path = db.get_setting("claude_executable_path")?
            .unwrap_or_else(|| "claude".to_string());
        
        let wsl_cmd = format!("{} --version", claude_path);
        
        match shell.command("wsl")
            .args(&["-e", "bash", "-c", &wsl_cmd])
            .output()
            .await {
            Ok(output) => {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    return Ok(serde_json::json!({
                        "installed": true,
                        "version": version,
                        "command": claude_path,
                        "via_wsl": true
                    }));
                }
            }
            Err(e) => {
                return Ok(serde_json::json!({
                    "installed": false,
                    "version": null,
                    "error": format!("WSL check failed: {}", e)
                }));
            }
        }
    } else {
        // Non-WSL check (existing logic)
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
    }
    
    Ok(serde_json::json!({
        "installed": false,
        "version": null
    }))
}

#[tauri::command]
async fn get_setting(key: String, db: State<'_, AppDatabase>) -> Result<Option<String>, String> {
    db.get_setting(&key)
}

#[tauri::command] 
async fn set_setting(key: String, value: String, db: State<'_, AppDatabase>) -> Result<(), String> {
    db.set_setting(&key, &value)
}

#[tauri::command]
async fn upload_custom_icon(
    _db: State<'_, AppDatabase>,
    source_path: String,
    desired_name: Option<String>,
) -> Result<serde_json::Value, String> {
    info!("Uploading custom icon from: {}", source_path);
    
    // Validate the source file
    AppDatabase::validate_icon_file_format(&source_path)?;
    
    let icons_dir = AppDatabase::ensure_custom_icons_dir()?;
    
    // Generate a unique filename
    let source_file = std::path::Path::new(&source_path);
    let extension = source_file.extension()
        .and_then(|ext| ext.to_str())
        .ok_or("File has no extension")?;
    
    let filename = if let Some(name) = desired_name {
        // Use desired name but ensure it has the correct extension
        let clean_name = name.trim()
            .replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
        format!("{}_{}.{}", clean_name, Uuid::new_v4().to_string()[0..8].to_string(), extension)
    } else {
        // Generate UUID-based filename
        format!("icon_{}.{}", Uuid::new_v4().to_string().replace("-", ""), extension)
    };
    
    let dest_path = icons_dir.join(&filename);
    
    // Copy the file to the custom icons directory
    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy icon file: {}", e))?;
    
    info!("Successfully uploaded custom icon: {}", filename);
    
    Ok(serde_json::json!({
        "success": true,
        "icon": {
            "id": filename,
            "name": filename,
            "type": extension,
            "path": format!("custom://{}", filename)
        }
    }))
}

#[tauri::command]
async fn get_custom_icons(db: State<'_, AppDatabase>) -> Result<Vec<serde_json::Value>, String> {
    db.get_custom_icon_files()
}

#[tauri::command]
async fn delete_custom_icon(
    db: State<'_, AppDatabase>,
    icon_id: String,
) -> Result<serde_json::Value, String> {
    info!("Deleting custom icon: {}", icon_id);
    
    db.delete_custom_icon_file(&icon_id)?;
    
    Ok(serde_json::json!({
        "success": true,
        "message": format!("Custom icon '{}' deleted successfully", icon_id)
    }))
}

#[tauri::command]
async fn get_custom_icon_path(icon_id: String) -> Result<String, String> {
    let icons_dir = AppDatabase::ensure_custom_icons_dir()?;
    let icon_path = icons_dir.join(&icon_id);

    if !icon_path.exists() {
        return Err("Custom icon file not found".to_string());
    }

    icon_path.to_str()
        .ok_or("Invalid icon path".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
async fn export_projects(db: State<'_, AppDatabase>, file_path: String) -> Result<serde_json::Value, String> {
    info!("Exporting projects to: {}", file_path);

    let projects = db.get_all_projects()?;

    let export_data = ExportData {
        version: 1,
        exported_at: chrono::Utc::now().to_rfc3339(),
        application: "claude-launcher".to_string(),
        projects: projects.into_iter().map(|p| ExportedProject {
            path: p.path,
            name: p.name,
            tags: p.tags,
            notes: p.notes,
            pinned: p.pinned,
            background_color: p.background_color,
            icon: p.icon,
            icon_size: p.icon_size,
            continue_flag: p.continue_flag,
        }).collect(),
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize projects: {}", e))?;

    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    info!("Exported {} projects", export_data.projects.len());

    Ok(serde_json::json!({
        "success": true,
        "count": export_data.projects.len()
    }))
}

#[tauri::command]
async fn import_projects(db: State<'_, AppDatabase>, file_path: String) -> Result<ImportResult, String> {
    info!("Importing projects from: {}", file_path);

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let export_data: ExportData = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON format: {}", e))?;

    // Version check for future compatibility
    if export_data.version > 1 {
        return Err(format!("Unsupported export version: {}. Please update the application.", export_data.version));
    }

    let mut imported = 0;
    let mut skipped = 0;
    let mut failed = 0;
    let mut errors = Vec::new();

    for project in export_data.projects {
        // Try to add the project
        match db.add_project(project.path.clone()) {
            Ok(new_project) => {
                // Check if this is an existing project (path already existed)
                // add_project returns existing project if path exists
                let is_new = new_project.name != project.name ||
                             new_project.tags != project.tags ||
                             new_project.notes != project.notes;

                if !is_new {
                    // Path already existed and returned unchanged - skip it
                    skipped += 1;
                    continue;
                }

                // Update with the additional fields from export
                let update = ProjectUpdate {
                    name: Some(project.name.clone()),
                    tags: Some(project.tags.clone()),
                    notes: Some(project.notes.clone()),
                    pinned: Some(project.pinned),
                    background_color: project.background_color.clone(),
                    icon: project.icon.clone(),
                    icon_size: project.icon_size,
                    continue_flag: Some(project.continue_flag),
                };

                match db.update_project(new_project.id.clone(), update) {
                    Ok(_) => imported += 1,
                    Err(e) => {
                        failed += 1;
                        errors.push(format!("Failed to update {}: {}", project.path, e));
                    }
                }
            }
            Err(e) => {
                // Check if it's a duplicate error
                if e.contains("already exists") {
                    skipped += 1;
                } else {
                    failed += 1;
                    errors.push(format!("Failed to import {}: {}", project.path, e));
                }
            }
        }
    }

    info!("Import complete: {} imported, {} skipped, {} failed", imported, skipped, failed);

    Ok(ImportResult {
        imported,
        skipped,
        failed,
        errors,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    info!("Starting Claude Launcher...");
    info!("Current directory: {:?}", std::env::current_dir());
    info!("Executable path: {:?}", std::env::current_exe());
    
    let database = match AppDatabase::new() {
        Ok(db) => db,
        Err(e) => {
            log::error!("Failed to initialize database: {}", e);
            // Show error dialog before exiting gracefully
            eprintln!("Fatal error: Failed to initialize database: {}", e);
            eprintln!("Please check that the application has write permissions to the data directory.");
            std::process::exit(1);
        }
    };
    
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
            open_project_folder,
            delete_project,
            check_claude_installed,
            get_setting,
            set_setting,
            upload_custom_icon,
            get_custom_icons,
            delete_custom_icon,
            get_custom_icon_path,
            export_projects,
            import_projects
        ])
        .on_window_event(|_window, event| {
            debug!("Window event: {:?}", event);
        })
        .on_page_load(|_webview, payload| {
            info!("Page load event: {:?}", payload.url());
            info!("Page event: {:?}", payload.event());
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    
    /// Helper to create a test database
    fn create_test_db() -> Result<AppDatabase, Box<dyn std::error::Error>> {
        // Use in-memory database for tests
        let conn = Connection::open_in_memory()?;
        
        // Initialize tables with the same schema as production (lib.rs lines 97-109)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                tags TEXT,
                notes TEXT,
                pinned BOOLEAN DEFAULT 0,
                last_used TEXT,
                background_color TEXT,
                icon TEXT,
                icon_size INTEGER,
                continue_flag BOOLEAN DEFAULT 0
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_last_used ON projects(last_used)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_pinned ON projects(pinned)",
            [],
        )?;
        
        Ok(AppDatabase {
            conn: Mutex::new(conn),
            settings_cache: Mutex::new(LruCache::new(NonZeroUsize::new(100).unwrap())),
            projects_cache: Mutex::new(None),
        })
    }
    
    #[test]
    fn test_project_serialization() {
        let project = Project {
            id: "test-id".to_string(),
            path: "/test/path".to_string(),
            name: "Test Project".to_string(),
            tags: vec!["tag1".to_string(), "tag2".to_string()],
            notes: "Test notes".to_string(),
            pinned: true,
            last_used: Some("2024-01-01T00:00:00Z".to_string()),
            background_color: Some("#ff5722".to_string()),
            icon: Some("Code".to_string()),
            icon_size: Some(32),
            continue_flag: false,
        };
        
        // Test serialization
        let json = serde_json::to_string(&project).unwrap();
        assert!(json.contains("test-id"));
        assert!(json.contains("Test Project"));
        
        // Test deserialization
        let deserialized: Project = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, project.id);
        assert_eq!(deserialized.name, project.name);
        assert_eq!(deserialized.tags, project.tags);
    }
    
    #[test]
    fn test_add_project() {
        let db = create_test_db().unwrap();
        let path = "/test/project".to_string();
        
        // Add project
        let result = db.add_project(path.clone());
        assert!(result.is_ok());
        
        let project = result.unwrap();
        assert_eq!(project.path, path);
        assert_eq!(project.name, "project");
        assert!(!project.pinned);
        assert!(project.last_used.is_none());
    }
    
    #[test]
    fn test_add_duplicate_project() {
        let db = create_test_db().unwrap();
        let path = "/test/project".to_string();
        
        // Add project first time
        let result1 = db.add_project(path.clone());
        assert!(result1.is_ok());
        let project1 = result1.unwrap();
        
        // Try to add same project again - should return the existing project
        let result2 = db.add_project(path);
        assert!(result2.is_ok());
        let project2 = result2.unwrap();
        
        // Should be the same project
        assert_eq!(project1.id, project2.id);
        assert_eq!(project1.path, project2.path);
    }
    
    #[test]
    fn test_get_projects() {
        let db = create_test_db().unwrap();
        
        // Initially empty
        let projects = db.get_all_projects().unwrap();
        assert_eq!(projects.len(), 0);
        
        // Add some projects
        db.add_project("/test/project1".to_string()).unwrap();
        db.add_project("/test/project2".to_string()).unwrap();
        
        let projects = db.get_all_projects().unwrap();
        assert_eq!(projects.len(), 2);
    }
    
    #[test]
    fn test_update_project() {
        let db = create_test_db().unwrap();
        
        // Add a project
        let project = db.add_project("/test/project".to_string()).unwrap();
        
        // Update it
        let updates = ProjectUpdate {
            name: Some("Updated Name".to_string()),
            tags: Some(vec!["new-tag".to_string()]),
            notes: Some("New notes".to_string()),
            pinned: Some(true),
            background_color: Some("#2196f3".to_string()),
            icon: Some("Terminal".to_string()),
            icon_size: None,
            continue_flag: None,
        };
        
        let result = db.update_project(project.id.clone(), updates);
        assert!(result.is_ok());
        
        // Verify updates
        let updated = result.unwrap();
        
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.tags, vec!["new-tag"]);
        assert_eq!(updated.notes, "New notes");
        assert!(updated.pinned);
        assert_eq!(updated.background_color, Some("#2196f3".to_string()));
        assert_eq!(updated.icon, Some("Terminal".to_string()));
    }
    
    #[test]
    fn test_delete_project() {
        let db = create_test_db().unwrap();
        
        // Add a project
        let project = db.add_project("/test/project".to_string()).unwrap();
        
        // Delete it
        let result = db.delete_project(&project.id);
        assert!(result.is_ok());
        
        // Verify it's gone
        let projects = db.get_all_projects().unwrap();
        assert_eq!(projects.len(), 0);
    }
    
    #[test]
    fn test_get_recent_projects() {
        let db = create_test_db().unwrap();
        
        // Add projects with different last_used times
        let project1 = db.add_project("/test/project1".to_string()).unwrap();
        let project2 = db.add_project("/test/project2".to_string()).unwrap();
        let project3 = db.add_project("/test/project3".to_string()).unwrap();
        
        // Update last_used times
        let conn = db.conn.lock();
        conn.execute(
            "UPDATE projects SET last_used = ? WHERE id = ?",
            params!["2024-01-03T00:00:00Z", project3.id],
        ).unwrap();
        conn.execute(
            "UPDATE projects SET last_used = ? WHERE id = ?",
            params!["2024-01-02T00:00:00Z", project2.id],
        ).unwrap();
        conn.execute(
            "UPDATE projects SET last_used = ? WHERE id = ?",
            params!["2024-01-01T00:00:00Z", project1.id],
        ).unwrap();
        drop(conn);
        
        // Get recent projects
        let recent = db.get_recent_projects(2).unwrap();
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].path, "/test/project3");
        assert_eq!(recent[1].path, "/test/project2");
    }
    
    #[test]
    fn test_settings() {
        let db = create_test_db().unwrap();
        
        // Initially no setting
        let value = db.get_setting("test_key").unwrap();
        assert!(value.is_none());
        
        // Set a value
        db.set_setting("test_key", "test_value").unwrap();
        
        // Get the value
        let value = db.get_setting("test_key").unwrap();
        assert_eq!(value, Some("test_value".to_string()));
        
        // Update the value
        db.set_setting("test_key", "new_value").unwrap();
        
        let value = db.get_setting("test_key").unwrap();
        assert_eq!(value, Some("new_value".to_string()));
    }
    
    #[test]
    fn test_pinned_projects_ordering() {
        let db = create_test_db().unwrap();
        
        // Add projects
        let _project1 = db.add_project("/test/project1".to_string()).unwrap();
        let project2 = db.add_project("/test/project2".to_string()).unwrap();
        
        // Pin project2
        let updates = ProjectUpdate {
            name: None,
            tags: None,
            notes: None,
            pinned: Some(true),
            background_color: None,
            icon: None,
            icon_size: None,
            continue_flag: None,
        };
        db.update_project(project2.id, updates).unwrap();
        
        // Get all projects - pinned should come first
        let projects = db.get_all_projects().unwrap();
        assert_eq!(projects[0].path, "/test/project2");
        assert_eq!(projects[1].path, "/test/project1");
    }
    
    #[test]
    fn test_tag_serialization() {
        let db = create_test_db().unwrap();
        
        // Add project with multiple tags
        let project = db.add_project("/test/project".to_string()).unwrap();
        let updates = ProjectUpdate {
            name: None,
            tags: Some(vec!["tag1".to_string(), "tag2".to_string(), "tag3".to_string()]),
            notes: None,
            pinned: None,
            background_color: None,
            icon: None,
            icon_size: None,
            continue_flag: None,
        };
        let updated = db.update_project(project.id.clone(), updates).unwrap();
        
        // Verify tags
        assert_eq!(updated.tags.len(), 3);
        assert!(updated.tags.contains(&"tag1".to_string()));
        assert!(updated.tags.contains(&"tag2".to_string()));
        assert!(updated.tags.contains(&"tag3".to_string()));
    }
}