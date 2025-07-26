import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  Image,
  Close,
} from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const CustomIconUpload = ({ open: isOpen, onClose, onIconUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [desiredName, setDesiredName] = useState('');
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async () => {
    try {
      setError('');
      
      const selected = await open({
        title: 'Select Icon File',
        multiple: false,
        filters: [
          {
            name: 'Image Files',
            extensions: ['svg', 'png', 'jpg', 'jpeg', 'ico', 'webp']
          }
        ]
      });

      if (selected) {
        setSelectedFile(selected);
        setFileName(selected.split(/[/\\]/).pop() || '');
        
        // Set preview for image files
        if (selected.match(/\.(svg|png|jpg|jpeg|ico|webp)$/i)) {
          setPreview(`file://${selected}`);
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setError('Failed to select file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await invoke('upload_custom_icon', {
        sourcePath: selectedFile,
        desiredName: desiredName.trim() || null
      });

      if (result.success) {
        // Notify parent component about the new icon
        if (onIconUploaded) {
          onIconUploaded(result.icon);
        }
        
        // Reset form and close dialog
        handleReset();
        onClose();
      } else {
        setError('Failed to upload icon');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload icon');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileName('');
    setDesiredName('');
    setPreview(null);
    setError('');
    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={uploading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload />
          Upload Custom Icon
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* File Selection */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Image />}
              onClick={handleFileSelect}
              disabled={uploading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {selectedFile ? 'Change File' : 'Select Icon File'}
            </Button>

            {selectedFile && (
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary">
                  Selected file:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {fileName}
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Preview */}
          {preview && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview:
              </Typography>
              <Box
                component="img"
                src={preview}
                alt="Icon preview"
                sx={{
                  maxWidth: 100,
                  maxHeight: 100,
                  objectFit: 'contain',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  bgcolor: 'background.paper'
                }}
                onError={() => setPreview(null)}
              />
            </Box>
          )}

          {/* Optional Custom Name */}
          <TextField
            fullWidth
            label="Custom Name (Optional)"
            placeholder="Enter a name for this icon"
            value={desiredName}
            onChange={(e) => setDesiredName(e.target.value)}
            disabled={uploading}
            helperText="If left empty, a unique name will be generated"
            sx={{ mb: 2 }}
          />

          {/* Supported Formats Info */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Supported formats:</strong> SVG, PNG, JPG, JPEG, ICO, WebP
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              <strong>Tip:</strong> SVG files work best for scalable icons
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleReset} 
          disabled={uploading}
          startIcon={<Close />}
        >
          Clear
        </Button>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomIconUpload;