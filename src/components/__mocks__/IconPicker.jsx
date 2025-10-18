import React from 'react';

const IconPicker = ({ open, onClose, onIconSelect, currentIcon, ...props }) => {
  return open ? (
    <div data-testid="icon-picker" {...props}>
      <div>Current Icon: {currentIcon}</div>
      <button onClick={() => onIconSelect('Code')}>Select Code Icon</button>
      <button onClick={() => onIconSelect('Terminal')}>Select Terminal Icon</button>
      <button onClick={() => onIconSelect(null)}>Clear Icon</button>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
};

export default IconPicker;