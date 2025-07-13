import React, { useState } from 'react';
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
} from '@mui/icons-material';

const ProjectCard = ({ project, onUpdate, onLaunch, onDelete, onPin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedTags, setEditedTags] = useState(project.tags.join(', '));
  const [editedNotes, setEditedNotes] = useState(project.notes);
  const [continueFlag, setContinueFlag] = useState(false);

  const handleSaveEdit = () => {
    onUpdate(project.id, {
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

  const truncateNotes = (notes, maxLength = 100) => {
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.3s ease',
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
      >
        {project.pinned ? (
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
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Notes */}
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Notes..."
            size="small"
          />
        ) : (
          project.notes && (
            <Tooltip title={project.notes} arrow>
              <Typography variant="body2" color="text.secondary">
                {truncateNotes(project.notes)}
              </Typography>
            </Tooltip>
          )
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {isEditing ? (
          <>
            <IconButton color="primary" onClick={handleSaveEdit} size="small">
              <CheckIcon />
            </IconButton>
            <IconButton color="secondary" onClick={handleCancelEdit} size="small">
              <CloseIcon />
            </IconButton>
          </>
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
                startIcon={<LaunchIcon />}
                onClick={handleLaunch}
                size="small"
                data-launch-btn
              >
                Launch
              </Button>
            </Box>
            <Box>
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                color="primary"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(project.id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </>
        )}
      </CardActions>
    </Card>
  );
};

export default ProjectCard;