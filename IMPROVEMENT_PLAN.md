# Claude Launcher - Detailed Improvement Plan (Priority Order)

## 🔴 Priority 1: Critical Issues (Production Blockers)

### 1.1 Remove Debug Code ✅
- **Remove console window**: Uncomment `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` in main.rs
- **Remove debug println!** statements from main.rs
- **Impact**: Currently shows console window in production build
- **Status**: COMPLETED

### 1.2 Clean Up Leftover Python Code ✅
- **Delete unused files**:
  - `src-tauri/src/lib_with_python.rs` (6.5KB of unused Python sidecar code)
  - `src-tauri/src/lib_memory.rs` (5.2KB of unused in-memory storage)
- **Impact**: Reduces confusion and binary size
- **Status**: COMPLETED

### 1.3 Fix Compiler Warnings ✅
- Change `|window, event|` to `|_window, event|` 
- Change `|webview, payload|` to `|_webview, payload|`
- **Impact**: Clean compilation output
- **Status**: COMPLETED

## 🟡 Priority 2: Core Feature Improvements

### 2.1 Persist User Preferences ✅
- **Save theme preference** (dark/light mode) to database or config file
- **Save window size/position**
- **Save last search query** (optional)
- **Impact**: Better user experience across sessions
- **Status**: COMPLETED (database infrastructure ready)

### 2.2 Implement Tag Filtering UI ✅
- **Add clickable tags**: Click any tag to filter projects
- **Tag filter bar**: Show active filters with X to remove
- **"Clear filters" button**
- **Impact**: Major usability improvement for organizing projects
- **Status**: COMPLETED (full filtering UI with clickable tags)

### 2.3 Add Keyboard Navigation
- **Arrow keys**: Navigate between project cards
- **Enter**: Launch selected project
- **Delete**: Delete selected project (with confirmation)
- **Ctrl+F**: Focus search bar
- **Impact**: Power user feature, accessibility

### 2.4 Add Sorting Options
- **Sort dropdown**: Name (A-Z), Recently Used, Date Added, Most Used
- **Persist sort preference**
- **Impact**: Better project organization

## 🟢 Priority 3: Quality of Life Features

### 3.1 Project Validation
- **Check if project paths exist** on load
- **Show warning icon** for missing/moved projects
- **"Fix path" option** in edit mode
- **Impact**: Handles moved/deleted folders gracefully

### 3.2 Import/Export Projects
- **Export to JSON**: Backup all projects
- **Import from JSON**: Restore or merge projects
- **Import from file path list**: Bulk add projects
- **Impact**: Data portability, migration support

### 3.3 Settings/Preferences Page
- **Claude executable path**: Configure if not in PATH
- **Default tags**: Auto-apply to new projects
- **Recent projects count**: Configure limit (default 5)
- **Launch behavior**: New window vs reuse
- **Impact**: Customization for different workflows

### 3.4 Enhanced Statistics
- **Launch count** per project
- **Last 30 days activity graph**
- **Most used projects** list
- **Impact**: Insights into work patterns

## 🔵 Priority 4: Polish & Future Features

### 4.1 Project Groups/Folders
- **Nested organization**: Group related projects
- **Collapsible sections**
- **Drag projects between groups**
- **Impact**: Better organization for many projects

### 4.2 Command Line Arguments
- **Custom args per project**: Store in database
- **Global default args**
- **Quick arg templates**
- **Impact**: Advanced user workflows

### 4.3 Multi-Select Operations
- **Ctrl+Click**: Select multiple projects
- **Bulk delete/tag/export**
- **Select all/none**
- **Impact**: Batch operations efficiency

### 4.4 Auto-Update System
- **Check for updates** on startup
- **Download and install** new versions
- **Release notes display**
- **Impact**: Easy updates for users

## 📋 Implementation Order Recommendation

**Phase 1 (Immediate)**: 1.1, 1.2, 1.3 - Clean up for production
**Phase 2 (This Week)**: 2.1, 2.2 - Core improvements  
**Phase 3 (Next Week)**: 2.3, 2.4, 3.1 - Usability enhancements
**Phase 4 (Future)**: 3.2, 3.3, 3.4, 4.x - Nice-to-have features

## Estimated Time:
- Phase 1: 30 minutes
- Phase 2: 2-3 hours  
- Phase 3: 3-4 hours
- Phase 4: 1-2 days per feature

## Progress Tracking

### Completed
- [x] 1.1 Remove Debug Code
- [x] 1.2 Clean Up Leftover Python Code  
- [x] 1.3 Fix Compiler Warnings
- [x] 2.1 Persist User Preferences (database infrastructure)

### In Progress
- [x] 2.3 Add Keyboard Navigation ✅ COMPLETED
- [x] 2.4 Add Sorting Options ✅ COMPLETED

### Todo
- All items in Priority 2, 3, and 4