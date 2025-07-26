import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Edit, Palette, Delete, FolderOpen } from '@mui/icons-material';

const ContextMenu = ({
  anchorPosition,
  open,
  onClose,
  onRename,
  onChangeColor,
  onOpenFolder,
  onDelete,
}) => {
  return (
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
          if (onOpenFolder) {
            onOpenFolder();
          } else {
            console.error('onOpenFolder is not defined');
          }
          onClose();
        }}
      >
        <ListItemIcon>
          <FolderOpen fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open Folder</ListItemText>
      </MenuItem>
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
  );
};

export default ContextMenu;
