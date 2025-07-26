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
  Divider,
} from '@mui/material';
import { Check, Palette } from '@mui/icons-material';

const COLOR_PRESETS = {
  'Pastel Colors': [
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
  ],
  'Vibrant Colors': [
    { name: 'Red', value: '#FF0000' },
    { name: 'Orange', value: '#FF8C00' },
    { name: 'Yellow', value: '#FFD700' },
    { name: 'Lime', value: '#32CD32' },
    { name: 'Green', value: '#008000' },
    { name: 'Teal', value: '#008B8B' },
    { name: 'Blue', value: '#0000FF' },
    { name: 'Navy', value: '#000080' },
    { name: 'Purple', value: '#800080' },
    { name: 'Magenta', value: '#FF00FF' },
    { name: 'Hot Pink', value: '#FF69B4' },
    { name: 'Crimson', value: '#DC143C' },
  ],
  'Dark Mode Colors': [
    { name: 'Slate', value: '#2F4F4F' },
    { name: 'Charcoal', value: '#36454F' },
    { name: 'Midnight', value: '#191970' },
    { name: 'Forest', value: '#228B22' },
    { name: 'Maroon', value: '#800000' },
    { name: 'Deep Purple', value: '#483D8B' },
    { name: 'Dark Teal', value: '#2F4F4F' },
    { name: 'Burgundy', value: '#8B0000' },
    { name: 'Indigo', value: '#4B0082' },
    { name: 'Dark Olive', value: '#556B2F' },
    { name: 'Steel Blue', value: '#4682B4' },
    { name: 'Dim Gray', value: '#696969' },
  ],
  'Material Design': [
    { name: 'Material Red', value: '#F44336' },
    { name: 'Material Pink', value: '#E91E63' },
    { name: 'Material Purple', value: '#9C27B0' },
    { name: 'Material Indigo', value: '#3F51B5' },
    { name: 'Material Blue', value: '#2196F3' },
    { name: 'Material Cyan', value: '#00BCD4' },
    { name: 'Material Teal', value: '#009688' },
    { name: 'Material Green', value: '#4CAF50' },
    { name: 'Material Orange', value: '#FF9800' },
    { name: 'Material Amber', value: '#FFC107' },
    { name: 'Material Brown', value: '#795548' },
    { name: 'Material Gray', value: '#9E9E9E' },
  ],
};

const ColorPicker = ({ open, onClose, onColorSelect, currentColor }) => {
  const [customColor, setCustomColor] = useState('');
  const [selectedColor, setSelectedColor] = useState(currentColor || '');

  const handleColorClick = color => {
    setSelectedColor(color);
  };

  const handleCustomColorChange = event => {
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
        {Object.entries(COLOR_PRESETS).map(([category, colors]) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 'bold', mt: category !== 'Pastel Colors' ? 2 : 0 }}
            >
              {category}
            </Typography>
            <Grid container spacing={1}>
              {colors.map(color => (
                <Grid item xs={3} key={color.name}>
                  <Paper
                    elevation={selectedColor === color.value ? 3 : 1}
                    sx={{
                      height: 60,
                      backgroundColor: color.value,
                      cursor: 'pointer',
                      border:
                        selectedColor === color.value ? '2px solid #1976d2' : '1px solid #e0e0e0',
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
                    {selectedColor === color.value && <Check sx={{ color: 'text.primary' }} />}
                  </Paper>
                  <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5 }}>
                    {color.name}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
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
            <Typography variant="body2">Preview: {selectedColor}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="warning">
          Clear Color
        </Button>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedColor}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColorPicker;
