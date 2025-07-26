import React from 'react';

const ColorPicker = ({ open, onClose, onColorSelect, currentColor, ...props }) => {
  return open ? (
    <div data-testid="color-picker" {...props}>
      <div>Current Color: {currentColor}</div>
      <button onClick={() => onColorSelect('#ff5722')}>Select Color</button>
      <button onClick={() => onColorSelect(null)}>Clear Color</button>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
};

export default ColorPicker;
