import React, { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Apps,
  Check,
  Search,
  CloudUpload,
  Delete,
  // Development Icons
  Code,
  Terminal,
  Storage,
  Api,
  DataObject,
  IntegrationInstructions,
  BugReport,
  Science,
  // Project Type Icons
  Web,
  PhoneAndroid,
  Computer,
  SportsEsports,
  SmartToy,
  CloudQueue,
  Dashboard,
  Analytics,
  // Tool Icons
  Build,
  Settings,
  Engineering,
  Construction,
  Handyman,
  Architecture,
  DesignServices,
  AutoFixHigh,
  // General Icons
  Star,
  Favorite,
  Bolt,
  Rocket,
  Lightbulb,
  Flag,
  Bookmark,
  Label,
  // Business Icons
  Business,
  TrendingUp,
  Assessment,
  BarChart,
  PieChart,
  ShowChart,
  Timeline,
  Work,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import CustomIconUpload from './CustomIconUpload';
import IconRenderer from './IconRenderer';
import { isCustomIcon } from '../utils/iconMapping';

const ICON_SIZE_OPTIONS = [
  { value: 24, label: 'Small (24px)' },
  { value: 32, label: 'Medium (32px)' },
  { value: 48, label: 'Large (48px)' },
  { value: 64, label: 'Extra Large (64px)' },
  { value: 80, label: 'Huge (80px)' },
];

const ICON_PRESETS = {
  'Development': [
    { name: 'Code', value: 'Code', icon: Code },
    { name: 'Terminal', value: 'Terminal', icon: Terminal },
    { name: 'Database', value: 'Storage', icon: Storage },
    { name: 'API', value: 'Api', icon: Api },
    { name: 'Data', value: 'DataObject', icon: DataObject },
    { name: 'Integration', value: 'IntegrationInstructions', icon: IntegrationInstructions },
    { name: 'Debug', value: 'BugReport', icon: BugReport },
    { name: 'Science', value: 'Science', icon: Science },
  ],
  'Project Types': [
    { name: 'Web App', value: 'Web', icon: Web },
    { name: 'Mobile', value: 'PhoneAndroid', icon: PhoneAndroid },
    { name: 'Desktop', value: 'Computer', icon: Computer },
    { name: 'Game', value: 'SportsEsports', icon: SportsEsports },
    { name: 'AI/ML', value: 'SmartToy', icon: SmartToy },
    { name: 'Cloud', value: 'CloudQueue', icon: CloudQueue },
    { name: 'Dashboard', value: 'Dashboard', icon: Dashboard },
    { name: 'Analytics', value: 'Analytics', icon: Analytics },
  ],
  'Tools': [
    { name: 'Build', value: 'Build', icon: Build },
    { name: 'Settings', value: 'Settings', icon: Settings },
    { name: 'Engineering', value: 'Engineering', icon: Engineering },
    { name: 'Construction', value: 'Construction', icon: Construction },
    { name: 'Tools', value: 'Handyman', icon: Handyman },
    { name: 'Architecture', value: 'Architecture', icon: Architecture },
    { name: 'Design', value: 'DesignServices', icon: DesignServices },
    { name: 'Magic', value: 'AutoFixHigh', icon: AutoFixHigh },
  ],
  'General': [
    { name: 'Star', value: 'Star', icon: Star },
    { name: 'Heart', value: 'Favorite', icon: Favorite },
    { name: 'Lightning', value: 'Bolt', icon: Bolt },
    { name: 'Rocket', value: 'Rocket', icon: Rocket },
    { name: 'Idea', value: 'Lightbulb', icon: Lightbulb },
    { name: 'Flag', value: 'Flag', icon: Flag },
    { name: 'Bookmark', value: 'Bookmark', icon: Bookmark },
    { name: 'Label', value: 'Label', icon: Label },
  ],
  'Business': [
    { name: 'Business', value: 'Business', icon: Business },
    { name: 'Trending', value: 'TrendingUp', icon: TrendingUp },
    { name: 'Report', value: 'Assessment', icon: Assessment },
    { name: 'Bar Chart', value: 'BarChart', icon: BarChart },
    { name: 'Pie Chart', value: 'PieChart', icon: PieChart },
    { name: 'Line Chart', value: 'ShowChart', icon: ShowChart },
    { name: 'Timeline', value: 'Timeline', icon: Timeline },
    { name: 'Work', value: 'Work', icon: Work },
  ],
};

const IconPicker = ({ open, onClose, onIconSelect, currentIcon, currentIconSize, onIconSizeSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || '');
  const [selectedIconSize, setSelectedIconSize] = useState(currentIconSize || 32);
  const [currentTab, setCurrentTab] = useState(0); // 0 = predefined, 1 = custom
  const [customIcons, setCustomIcons] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load custom icons when the component mounts or when tab changes
  useEffect(() => {
    if (open && currentTab === 1) {
      loadCustomIcons();
    }
  }, [open, currentTab]);

  // Set initial tab based on current icon
  useEffect(() => {
    if (open && currentIcon) {
      if (isCustomIcon(currentIcon)) {
        setCurrentTab(1);
      } else {
        setCurrentTab(0);
      }
    }
  }, [open, currentIcon]);

  const loadCustomIcons = async () => {
    setLoading(true);
    try {
      const icons = await invoke('get_custom_icons');
      setCustomIcons(icons || []);
    } catch (error) {
      console.error('Failed to load custom icons:', error);
      setCustomIcons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleIconClick = iconValue => {
    setSelectedIcon(iconValue);
  };

  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  };

  const handleSave = () => {
    if (selectedIcon) {
      onIconSelect(selectedIcon);
    }
    if (onIconSizeSelect) {
      onIconSizeSelect(selectedIconSize);
    }
    onClose();
  };

  const handleReset = () => {
    setSelectedIcon('');
    setSelectedIconSize(32);
    setSearchQuery('');
  };

  const handleClear = () => {
    onIconSelect(null);
    onClose();
  };

  const handleIconUploaded = (newIcon) => {
    // Refresh custom icons list
    loadCustomIcons();
    // Auto-select the newly uploaded icon
    setSelectedIcon(newIcon.path);
    // Switch to custom icons tab
    setCurrentTab(1);
  };

  const handleDeleteCustomIcon = async (iconId) => {
    try {
      await invoke('delete_custom_icon', { iconId });
      // Refresh the list
      loadCustomIcons();
      // Clear selection if the deleted icon was selected
      if (selectedIcon === `custom://${iconId}`) {
        setSelectedIcon('');
      }
    } catch (error) {
      console.error('Failed to delete custom icon:', error);
    }
  };

  // Filter icons based on search query
  const filterIcons = (icons) => {
    if (!searchQuery) return icons;
    const query = searchQuery.toLowerCase();
    return icons.filter(icon => 
      icon.name.toLowerCase().includes(query) || 
      (icon.value && icon.value.toLowerCase().includes(query)) ||
      (icon.id && icon.id.toLowerCase().includes(query))
    );
  };

  // Filter custom icons based on search query
  const filterCustomIcons = (icons) => {
    if (!searchQuery) return icons;
    const query = searchQuery.toLowerCase();
    return icons.filter(icon => 
      icon.name.toLowerCase().includes(query) ||
      icon.id.toLowerCase().includes(query)
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Apps />
            Choose Project Icon
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Predefined Icons" />
              <Tab label="Custom Icons" />
            </Tabs>
          </Box>

          {/* Search Box */}
          <TextField
            fullWidth
            placeholder="Search icons..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Icon Size Selector */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Icon Size</InputLabel>
            <Select
              value={selectedIconSize}
              label="Icon Size"
              onChange={(e) => setSelectedIconSize(e.target.value)}
            >
              {ICON_SIZE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Predefined Icons Tab */}
          {currentTab === 0 && (
            <>
              {Object.entries(ICON_PRESETS).map(([category, icons]) => {
                const filteredIcons = filterIcons(icons);
                if (filteredIcons.length === 0 && searchQuery) return null;

                return (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      sx={{ fontWeight: 'bold', mt: category !== 'Development' ? 2 : 0 }}
                    >
                      {category}
                    </Typography>
                    <Grid container spacing={1}>
                      {filteredIcons.map(iconData => {
                        const IconComponent = iconData.icon;
                        return (
                          <Grid item xs={3} sm={2} md={1.5} key={iconData.value}>
                            <Paper
                              elevation={selectedIcon === iconData.value ? 3 : 1}
                              sx={{
                                height: 80,
                                cursor: 'pointer',
                                border: selectedIcon === iconData.value 
                                  ? '2px solid #1976d2' 
                                  : '1px solid #e0e0e0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  elevation: 2,
                                  transform: 'scale(1.05)',
                                },
                              }}
                              onClick={() => handleIconClick(iconData.value)}
                            >
                              <IconComponent 
                                sx={{ 
                                  fontSize: selectedIconSize,
                                  color: selectedIcon === iconData.value ? 'primary.main' : 'text.primary'
                                }} 
                              />
                              {selectedIcon === iconData.value && (
                                <Check sx={{ fontSize: 16, color: 'primary.main' }} />
                              )}
                            </Paper>
                            <Typography 
                              variant="caption" 
                              align="center" 
                              display="block" 
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                            >
                              {iconData.name}
                            </Typography>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                );
              })}
            </>
          )}

          {/* Custom Icons Tab */}
          {currentTab === 1 && (
            <Box>
              {/* Upload Button */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={() => setUploadDialogOpen(true)}
                  sx={{ mb: 2 }}
                >
                  Upload Custom Icon
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Upload your own icons (SVG, PNG, JPG, ICO, WebP)
                </Typography>
              </Box>

              {/* Custom Icons Grid */}
              {customIcons.length > 0 ? (
                <Grid container spacing={1}>
                  {filterCustomIcons(customIcons).map(iconData => (
                    <Grid item xs={3} sm={2} md={1.5} key={iconData.id}>
                      <Paper
                        elevation={selectedIcon === iconData.path ? 3 : 1}
                        sx={{
                          height: 80,
                          cursor: 'pointer',
                          border: selectedIcon === iconData.path 
                            ? '2px solid #1976d2' 
                            : '1px solid #e0e0e0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          '&:hover': {
                            elevation: 2,
                            transform: 'scale(1.05)',
                          },
                          '&:hover .delete-button': {
                            opacity: 1,
                          },
                        }}
                        onClick={() => handleIconClick(iconData.path)}
                      >
                        <IconRenderer 
                          iconName={iconData.path}
                          sx={{ 
                            fontSize: selectedIconSize,
                            color: selectedIcon === iconData.path ? 'primary.main' : 'text.primary'
                          }} 
                        />
                        {selectedIcon === iconData.path && (
                          <Check sx={{ fontSize: 16, color: 'primary.main' }} />
                        )}
                        
                        {/* Delete Button */}
                        <Tooltip title="Delete icon">
                          <IconButton
                            className="delete-button"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomIcon(iconData.id);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              backgroundColor: 'error.main',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'error.dark',
                              },
                              width: 20,
                              height: 20,
                            }}
                          >
                            <Delete sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                      <Typography 
                        variant="caption" 
                        align="center" 
                        display="block" 
                        sx={{ mt: 0.5, fontSize: '0.7rem', wordBreak: 'break-all' }}
                      >
                        {iconData.name}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No custom icons yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload your first custom icon to get started
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Selected Icon Display */}
          {selectedIcon && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Selected Icon: <strong>{selectedIcon}</strong> 
                <span>({selectedIconSize}px)</span>
                <IconRenderer iconName={selectedIcon} sx={{ ml: 1, fontSize: selectedIconSize }} />
              </Typography>
            </Box>
          )}
        </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="warning">
          Clear Icon
        </Button>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedIcon}>
          Apply
        </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Icon Upload Dialog */}
      <CustomIconUpload
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onIconUploaded={handleIconUploaded}
      />
    </>
  );
};

export default IconPicker;