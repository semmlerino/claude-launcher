import React, { useState, useEffect } from 'react';
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

const ProjectCard = ({ project, onUpdate, onLaunch, onDelete, onPin, onTagClick, isSelected, loadingOperations = {} }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedTags, setEditedTags] = useState(project.tags.join(', '));
  const [editedNotes, setEditedNotes] = useState(project.notes);
  const [continueFlag, setContinueFlag] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [contextMenu, setContextMenu] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const handleSaveEdit = async () => {
    await onUpdate(project.id, {
      name: editedName,
      tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      notes: editedNotes,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(project.name);
    setEditedTags(project.tags.join(', '));
    setEditedNotes(project.notes);
    setIsEditing(false);
  };

  const handleLaunch = () => {
    onLaunch(project.id, continueFlag);
    setContinueFlag(false); // Reset after launch
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
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

  const handleColorChange = (color) => {
    onUpdate(project.id, { background_color: color });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleRenameSubmit();
    } else if (event.key === 'Escape') {
      handleRenameCancel();
    }
  };

  // Auto-focus and select text when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      const input = document.getElementById(`rename-input-${project.id}`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [isRenaming, project.id]);

  const truncateNotes = (notes, maxLength = 150) => {
    if (!notes) return '';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

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
        aria-label={project.pinned ? "Unpin project" : "Pin project"}
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
          <TextField
            fullWidth
            variant="standard"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            autoFocus
            sx={{ mb: 2 }}
          />
        ) : isRenaming ? (
          <TextField
            id={`rename-input-${project.id}`}
            fullWidth
            variant="standard"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameSubmit}
            sx={{ mb: 2 }}
          />
        ) : (
          <Typography variant="h6" component="h2" gutterBottom>
            {project.name}
          </Typography>
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
              onChange={(e) => setEditedTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              size="small"
            />
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {project.tags.map((tag, index) => (
                <Chip
                  key={index}
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
        <Box sx={{ 
          mt: 2,
          p: 1.5,
          backgroundColor: 'action.hover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
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
                    {truncateNotes(project.notes)}
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
                    onChange={(e) => setContinueFlag(e.target.checked)}
                    size="small"
                  />
                }
                label="Continue"
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={loadingOperations.launch === project.id ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <LaunchIcon />
                )}
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
        onDelete={() => onDelete(project.id)}
      />

      {/* Color Picker Dialog */}
      <ColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        onColorSelect={handleColorChange}
        currentColor={project.background_color}
      />
    </Card>
  );
};

export default ProjectCard;