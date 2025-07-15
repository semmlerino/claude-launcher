import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Check, Palette } from '@mui/icons-material';

const PASTEL_COLORS = [
  { name: 'Lavender', value: '#E6E6FA' },
  { name: 'Mint Green', value: '#F0FFF0' },
  { name: 'Peach', value: '#FFE5B4' },
  { name: 'Light Blue', value: '#ADD8E6' },
  { name: 'Pink', value: '#FFC0CB' },
  { name: 'Light Yellow', value: '#FFFFE0' },
  { name: 'Light Coral', value: '#F08080' },
  { name: 'Pale Green', value: '#98FB98' },
  { name: 'Light Sky Blue', value: '#87CEEB' },
  { name: 'Misty Rose', value: '#FFE4E1' },
  { name: 'Wheat', value: '#F5DEB3' },
  { name: 'Light Cyan', value: '#E0FFFF' },
  { name: 'Thistle', value: '#D8BFD8' },
  { name: 'Light Salmon', value: '#FFA07A' },
  { name: 'Light Gray', value: '#F5F5F5' },
];

const ColorPicker = ({ open, onClose, onColorSelect, currentColor }) => {
  const [customColor, setCustomColor] = useState('');
  const [selectedColor, setSelectedColor] = useState(currentColor || '');

  const handleColorClick = (color) => {
    setSelectedColor(color);
  };

  const handleCustomColorChange = (event) => {
    const value = event.target.value;
    setCustomColor(value);
    if (value.match(/^#[0-9A-F]{6}$/i)) {
      setSelectedColor(value);
    }
  };

  const handleSave = () => {
    if (selectedColor) {
      onColorSelect(selectedColor);
    }
    onClose();
  };

  const handleReset = () => {
    setSelectedColor('');
    setCustomColor('');
  };

  const handleClear = () => {
    onColorSelect(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Palette />
          Choose Background Color
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" gutterBottom>
          Preset Colors
        </Typography>
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {PASTEL_COLORS.map((color) => (
            <Grid item xs={3} key={color.name}>
              <Paper
                elevation={selectedColor === color.value ? 3 : 1}
                sx={{
                  height: 60,
                  backgroundColor: color.value,
                  cursor: 'pointer',
                  border: selectedColor === color.value ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    elevation: 2,
                    transform: 'scale(1.05)',
                  },
                }}
                onClick={() => handleColorClick(color.value)}
              >
                {selectedColor === color.value && (
                  <Check sx={{ color: 'text.primary' }} />
                )}
              </Paper>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5 }}>
                {color.name}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Typography variant="subtitle2" gutterBottom>
          Custom Color
        </Typography>
        <TextField
          fullWidth
          label="Hex Color Code"
          value={customColor}
          onChange={handleCustomColorChange}
          placeholder="#FF5722"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: customColor.match(/^#[0-9A-F]{6}$/i) ? customColor : '#fff',
                    border: '1px solid #ccc',
                    borderRadius: 1,
                  }}
                />
              </InputAdornment>
            ),
          }}
          helperText="Enter a hex color code (e.g., #FF5722)"
        />

        {selectedColor && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: selectedColor, borderRadius: 1 }}>
            <Typography variant="body2">
              Preview: {selectedColor}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="warning">
          Clear Color
        </Button>
        <Button onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedColor}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColorPicker;