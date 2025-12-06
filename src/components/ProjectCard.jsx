import React, { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  Box,
  Tooltip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Launch as LaunchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import ContextMenu from './ContextMenu';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import IconRenderer from './IconRenderer';

const ProjectCard = React.memo(
  ({
    project,
    onUpdate,
    onLaunch,
    onDelete,
    onPin,
    onTagClick,
    isSelected,
    loadingOperations = {},
    groups = [],
    onMoveToGroup,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(project.name);
    const [editedTags, setEditedTags] = useState(project.tags.join(', '));
    const [editedNotes, setEditedNotes] = useState(project.notes);
    const [continueFlag, setContinueFlag] = useState(project.continue_flag || false);
    const [resumeFlag, setResumeFlag] = useState(project.resume_flag || false);

    // Sync local continueFlag state when project prop changes
    useEffect(() => {
      setContinueFlag(project.continue_flag || false);
    }, [project.continue_flag]);

    // Sync local resumeFlag state when project prop changes
    useEffect(() => {
      setResumeFlag(project.resume_flag || false);
    }, [project.resume_flag]);

    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(project.name);
    const [contextMenu, setContextMenu] = useState(null);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const renameInputRef = useRef(null);

    const [saveError, setSaveError] = useState(null);

    const handleSaveEdit = async () => {
      // Validate name is not empty
      const trimmedName = editedName.trim();
      if (!trimmedName) {
        setSaveError('Project name cannot be empty');
        return;
      }

      setSaveError(null);
      try {
        await onUpdate(project.id, {
          name: trimmedName,
          tags: editedTags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag),
          notes: editedNotes,
        });
        setIsEditing(false);
      } catch (error) {
        setSaveError(`Failed to save: ${error}`);
        // Keep edit mode open so user can retry or cancel
      }
    };

    const handleCancelEdit = () => {
      setEditedName(project.name);
      setEditedTags(project.tags.join(', '));
      setEditedNotes(project.notes);
      setSaveError(null);
      setIsEditing(false);
    };

    const handleLaunch = () => {
      onLaunch(project.id, continueFlag, resumeFlag);
    };

    const handleContextMenu = event => {
      event.preventDefault();
      setContextMenu({
        left: event.clientX - 2,
        top: event.clientY - 4,
      });
    };

    const handleCloseContextMenu = () => {
      setContextMenu(null);
    };

    const handleRename = () => {
      setIsRenaming(true);
      setRenameValue(project.name);
    };

    const handleRenameSubmit = async () => {
      if (renameValue.trim() && renameValue.trim() !== project.name) {
        await onUpdate(project.id, { name: renameValue.trim() });
      }
      setIsRenaming(false);
    };

    const handleRenameCancel = () => {
      setIsRenaming(false);
      setRenameValue(project.name);
    };

    const handleColorChange = color => {
      onUpdate(project.id, { background_color: color });
    };

    const handleIconChange = icon => {
      onUpdate(project.id, { icon: icon });
    };

    const handleIconSizeChange = iconSize => {
      onUpdate(project.id, { icon_size: iconSize });
    };

    const handleOpenFolder = async () => {
      try {
        await invoke('open_project_folder', { id: project.id });
      } catch (_error) {
        // Silently fail for folder open - user will see the folder didn't open
      }
    };

    const handleKeyDown = event => {
      if (event.key === 'Enter') {
        handleRenameSubmit();
      } else if (event.key === 'Escape') {
        handleRenameCancel();
      }
    };

    // Auto-focus and select text when entering rename mode
    useEffect(() => {
      if (isRenaming && renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, [isRenaming]);

    // Memoize truncated notes to avoid recalculation on every render
    const truncatedNotes = useMemo(() => {
      if (!project.notes) return '';
      if (project.notes.length <= 150) return project.notes;
      return project.notes.substring(0, 150) + '...';
    }, [project.notes]);

    return (
      <Card
        data-selected={isSelected}
        onContextMenu={handleContextMenu}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.3s ease',
          backgroundColor: project.background_color || 'background.paper',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3,
          },
        }}
      >
        {/* Pin Icon */}
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
          onClick={() => onPin(project.id, !project.pinned)}
          size="small"
          disabled={loadingOperations.pin === project.id}
          aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
        >
          {loadingOperations.pin === project.id ? (
            <CircularProgress size={20} />
          ) : project.pinned ? (
            <StarIcon color="primary" />
          ) : (
            <StarBorderIcon />
          )}
        </IconButton>

        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
          {/* Project Name */}
          {isEditing ? (
            <>
              <TextField
                fullWidth
                variant="standard"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                autoFocus
                error={!!saveError}
                helperText={saveError}
                sx={{ mb: 2 }}
              />
            </>
          ) : isRenaming ? (
            <TextField
              inputRef={renameInputRef}
              fullWidth
              variant="standard"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSubmit}
              sx={{ mb: 2 }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {project.icon && (
                <IconRenderer 
                  iconName={project.icon}
                  sx={{ mr: 1, fontSize: project.icon_size || 32, color: 'primary.main' }}
                />
              )}
              <Typography variant="h6" component="h2">
                {project.name}
              </Typography>
            </Box>
          )}

          {/* Project Path */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FolderIcon sx={{ mr: 1, fontSize: 'small', color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {project.path}
            </Typography>
          </Box>

          {/* Tags */}
          <Box sx={{ mb: 2 }}>
            {isEditing ? (
              <TextField
                fullWidth
                variant="standard"
                value={editedTags}
                onChange={e => setEditedTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                size="small"
              />
            ) : (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {project.tags.map(tag => (
                  <Chip
                    key={`tag-${tag}`}
                    label={tag}
                    size="small"
                    color="primary"
                    variant="outlined"
                    clickable={!!onTagClick}
                    onClick={onTagClick ? () => onTagClick(tag) : undefined}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Notes Section */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {isEditing ? (
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
                placeholder="Add notes about this project..."
                size="small"
                sx={{ backgroundColor: 'background.paper' }}
              />
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <NotesIcon sx={{ fontSize: 'small', mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight="medium" color="text.secondary">
                    Notes
                  </Typography>
                </Box>
                {project.notes ? (
                  <Tooltip title={project.notes.length > 150 ? project.notes : ''} arrow>
                    <Typography variant="body2" color="text.primary">
                      {truncatedNotes}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.disabled" fontStyle="italic">
                    No notes yet
                  </Typography>
                )}
              </>
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          {isEditing ? (
            <Box sx={{ opacity: loadingOperations.update === project.id ? 0.6 : 1 }}>
              <IconButton
                color="primary"
                onClick={handleSaveEdit}
                size="small"
                disabled={loadingOperations.update === project.id}
                aria-label="Save changes"
              >
                {loadingOperations.update === project.id ? (
                  <CircularProgress size={20} />
                ) : (
                  <CheckIcon />
                )}
              </IconButton>
              <IconButton
                color="secondary"
                onClick={handleCancelEdit}
                size="small"
                disabled={loadingOperations.update === project.id}
                aria-label="Cancel editing"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={continueFlag}
                      onChange={e => {
                        const newValue = e.target.checked;
                        setContinueFlag(newValue);
                        onUpdate(project.id, { continue_flag: newValue });
                      }}
                      size="small"
                    />
                  }
                  label="Continue"
                  sx={{ mr: 0 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={resumeFlag}
                      onChange={e => {
                        const newValue = e.target.checked;
                        setResumeFlag(newValue);
                        onUpdate(project.id, { resume_flag: newValue });
                      }}
                      size="small"
                    />
                  }
                  label="Resume"
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    loadingOperations.launch === project.id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <LaunchIcon />
                    )
                  }
                  onClick={handleLaunch}
                  size="small"
                  data-launch-btn
                  disabled={loadingOperations.launch === project.id}
                >
                  {loadingOperations.launch === project.id ? 'Launching...' : 'Launch'}
                </Button>
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(true)}
                  color="primary"
                  disabled={Object.values(loadingOperations).some(v => v === project.id)}
                  aria-label="Edit project"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(project.id)}
                  color="error"
                  disabled={Object.values(loadingOperations).some(v => v === project.id)}
                  aria-label="Delete project"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </>
          )}
        </CardActions>

        {/* Context Menu */}
        <ContextMenu
          anchorPosition={contextMenu}
          open={Boolean(contextMenu)}
          onClose={handleCloseContextMenu}
          onRename={handleRename}
          onChangeColor={() => setColorPickerOpen(true)}
          onChangeIcon={() => setIconPickerOpen(true)}
          onOpenFolder={handleOpenFolder}
          onDelete={() => onDelete(project.id)}
          groups={groups}
          currentGroupId={project.group_id}
          onMoveToGroup={onMoveToGroup ? (groupId) => onMoveToGroup(project.id, groupId) : undefined}
        />

        {/* Color Picker Dialog */}
        <ColorPicker
          open={colorPickerOpen}
          onClose={() => setColorPickerOpen(false)}
          onColorSelect={handleColorChange}
          currentColor={project.background_color}
        />

        {/* Icon Picker Dialog */}
        <IconPicker
          open={iconPickerOpen}
          onClose={() => setIconPickerOpen(false)}
          onIconSelect={handleIconChange}
          currentIcon={project.icon}
          currentIconSize={project.icon_size}
          onIconSizeSelect={handleIconSizeChange}
        />
      </Card>
    );
  },
);

export default ProjectCard;
