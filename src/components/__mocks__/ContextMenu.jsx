import React from 'react';

const ContextMenu = ({ open, onClose, onRename, onChangeColor, onDelete, ...props }) => {
  return open ? (
    <div data-testid="context-menu" {...props}>
      <button onClick={onRename}>Rename</button>
      <button onClick={onChangeColor}>Change Color</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ) : null;
};

export default ContextMenu;