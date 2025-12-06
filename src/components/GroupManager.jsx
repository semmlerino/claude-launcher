import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  FolderSpecial as GroupIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

// Simple color palette for groups
const GROUP_COLORS = [
  { name: 'Blue', value: '#2196F3' },
  { name: 'Green', value: '#4CAF50' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Purple', value: '#9C27B0' },
  { name: 'Red', value: '#F44336' },
  { name: 'Teal', value: '#009688' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Amber', value: '#FFC107' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Brown', value: '#795548' },
  { name: 'Gray', value: '#607D8B' },
];

const GroupManager = ({
  open,
  onClose,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroups,
  showSnackbar,
}) => {
  const [loading, setLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].value);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [localGroups, setLocalGroups] = useState([]);

  // Sync local groups with props
  useEffect(() => {
    if (open) {
      setLocalGroups([...groups].sort((a, b) => a.order - b.order));
      setNewGroupName('');
      setNewGroupColor(GROUP_COLORS[0].value);
      setEditingGroup(null);
    }
  }, [open, groups]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showSnackbar('Group name is required', 'warning');
      return;
    }

    setLoading(true);
    try {
      await onCreateGroup(newGroupName.trim(), newGroupColor);
      setNewGroupName('');
      setNewGroupColor(GROUP_COLORS[0].value);
      showSnackbar('Group created', 'success');
    } catch (error) {
      showSnackbar(`Failed to create group: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (group) => {
    setEditingGroup(group.id);
    setEditName(group.name);
    setEditColor(group.color || GROUP_COLORS[0].value);
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setEditName('');
    setEditColor('');
  };

  const handleSaveEdit = async (groupId) => {
    if (!editName.trim()) {
      showSnackbar('Group name is required', 'warning');
      return;
    }

    setLoading(true);
    try {
      await onUpdateGroup(groupId, { name: editName.trim(), color: editColor });
      setEditingGroup(null);
      showSnackbar('Group updated', 'success');
    } catch (error) {
      showSnackbar(`Failed to update group: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? Projects in this group will become ungrouped.`)) {
      return;
    }

    setLoading(true);
    try {
      await onDeleteGroup(groupId);
      showSnackbar('Group deleted', 'success');
    } catch (error) {
      showSnackbar(`Failed to delete group: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder locally for visual feedback
    const newGroups = [...localGroups];
    const [draggedItem] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(index, 0, draggedItem);
    setLocalGroups(newGroups);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    // Persist the new order
    const groupIds = localGroups.map(g => g.id);
    try {
      await onReorderGroups(groupIds);
    } catch (error) {
      showSnackbar(`Failed to reorder groups: ${error}`, 'error');
    }
    setDraggedIndex(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon />
          Manage Groups
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Create new group section */}
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
          Create New Group
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            disabled={loading}
            sx={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newGroupName.trim()) {
                handleCreateGroup();
              }
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
            {GROUP_COLORS.slice(0, 6).map((color) => (
              <Box
                key={color.value}
                onClick={() => setNewGroupColor(color.value)}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: color.value,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: newGroupColor === color.value ? '2px solid #000' : '1px solid #ccc',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.1)' },
                }}
              />
            ))}
          </Box>
          <IconButton
            color="primary"
            onClick={handleCreateGroup}
            disabled={loading || !newGroupName.trim()}
          >
            {loading ? <CircularProgress size={24} /> : <AddIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Existing groups list */}
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
          Existing Groups
        </Typography>
        {localGroups.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No groups yet. Create one above to organize your projects.
          </Alert>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Drag to reorder groups
          </Typography>
        )}
        <List sx={{ p: 0 }}>
          {localGroups.map((group, index) => (
            <Paper
              key={group.id}
              elevation={draggedIndex === index ? 3 : 1}
              draggable={editingGroup !== group.id}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              sx={{
                mb: 1,
                opacity: draggedIndex === index ? 0.8 : 1,
                cursor: editingGroup === group.id ? 'default' : 'grab',
              }}
            >
              <ListItem>
                {editingGroup === group.id ? (
                  // Edit mode
                  <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={loading}
                      sx={{ flex: 1 }}
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && editName.trim()) {
                          handleSaveEdit(group.id);
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {GROUP_COLORS.slice(0, 6).map((color) => (
                        <Box
                          key={color.value}
                          onClick={() => setEditColor(color.value)}
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: color.value,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: editColor === color.value ? '2px solid #000' : '1px solid #ccc',
                          }}
                        />
                      ))}
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleSaveEdit(group.id)}
                      disabled={loading}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancelEdit} disabled={loading}>
                      <CloseIcon />
                    </IconButton>
                  </Box>
                ) : (
                  // View mode
                  <>
                    <DragIcon sx={{ color: 'text.secondary', mr: 1 }} />
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: group.color || '#607D8B',
                        borderRadius: '50%',
                        mr: 1.5,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={group.name}
                      sx={{ '& .MuiListItemText-primary': { fontWeight: 500 } }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleStartEdit(group)}
                        disabled={loading}
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        disabled={loading}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </>
                )}
              </ListItem>
            </Paper>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupManager;
