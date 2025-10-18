import React from 'react';

const CustomIconUpload = ({ open, onClose, onIconUploaded }) => {
  const handleTestUpload = () => {
    if (onIconUploaded) {
      onIconUploaded({
        id: 'test-icon.svg',
        name: 'test-icon.svg',
        type: 'svg',
        path: 'custom://test-icon.svg'
      });
    }
  };

  if (!open) return null;

  return (
    <div data-testid="mock-custom-icon-upload">
      <div>Mock Custom Icon Upload Dialog</div>
      <button onClick={handleTestUpload} data-testid="mock-upload-button">
        Mock Upload
      </button>
      <button onClick={onClose} data-testid="mock-close-button">
        Mock Close
      </button>
    </div>
  );
};

export default CustomIconUpload;