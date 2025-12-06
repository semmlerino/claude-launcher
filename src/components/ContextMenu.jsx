import { useState } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import {
  Edit,
  Palette,
  Apps,
  Delete,
  FolderOpen,
  FolderSpecial as GroupIcon,
  ChevronRight,
  RemoveCircleOutline,
} from '@mui/icons-material';

const ContextMenu = ({
  anchorPosition,
  open,
  onClose,
  onRename,
  onChangeColor,
  onChangeIcon,
  onOpenFolder,
  onDelete,
  groups = [],
  currentGroupId,
  onMoveToGroup,
}) => {
  const [groupMenuAnchor, setGroupMenuAnchor] = useState(null);

  const handleGroupMenuOpen = (event) => {
    setGroupMenuAnchor(event.currentTarget);
  };

  const handleGroupMenuClose = () => {
    setGroupMenuAnchor(null);
  };

  const handleMoveToGroup = (groupId) => {
    if (onMoveToGroup) {
      onMoveToGroup(groupId);
    }
    handleGroupMenuClose();
    onClose();
  };

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              boxShadow: 2,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onRename();
            onClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onChangeColor();
            onClose();
          }}
        >
          <ListItemIcon>
            <Palette fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Color</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onChangeIcon();
            onClose();
          }}
        >
          <ListItemIcon>
            <Apps fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Icon</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (onOpenFolder) {
              onOpenFolder();
            }
            onClose();
          }}
        >
          <ListItemIcon>
            <FolderOpen fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open Folder</ListItemText>
        </MenuItem>

        {/* Move to Group submenu */}
        {groups.length > 0 && (
          <MenuItem onClick={handleGroupMenuOpen}>
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move to Group</ListItemText>
            <ChevronRight fontSize="small" sx={{ ml: 'auto' }} />
          </MenuItem>
        )}

        <Divider />
        <MenuItem
          onClick={() => {
            onDelete();
            onClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Group submenu */}
      <Menu
        anchorEl={groupMenuAnchor}
        open={Boolean(groupMenuAnchor)}
        onClose={handleGroupMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              maxHeight: 300,
              boxShadow: 2,
            },
          },
        }}
      >
        {sortedGroups.map((group) => (
          <MenuItem
            key={group.id}
            onClick={() => handleMoveToGroup(group.id)}
            selected={currentGroupId === group.id}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: group.color || '#607D8B',
                mr: 1.5,
                flexShrink: 0,
              }}
            />
            <ListItemText>{group.name}</ListItemText>
          </MenuItem>
        ))}
        {currentGroupId && (
          <>
            <Divider />
            <MenuItem onClick={() => handleMoveToGroup(null)}>
              <ListItemIcon>
                <RemoveCircleOutline fontSize="small" />
              </ListItemIcon>
              <ListItemText>Remove from Group</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default ContextMenu;
