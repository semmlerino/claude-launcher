import {
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
  // Default fallback
  Folder,
} from '@mui/icons-material';

// Mapping object from string names to icon components
export const ICON_MAP = {
  // Development
  Code,
  Terminal,
  Storage,
  Api,
  DataObject,
  IntegrationInstructions,
  BugReport,
  Science,
  // Project Types
  Web,
  PhoneAndroid,
  Computer,
  SportsEsports,
  SmartToy,
  CloudQueue,
  Dashboard,
  Analytics,
  // Tools
  Build,
  Settings,
  Engineering,
  Construction,
  Handyman,
  Architecture,
  DesignServices,
  AutoFixHigh,
  // General
  Star,
  Favorite,
  Bolt,
  Rocket,
  Lightbulb,
  Flag,
  Bookmark,
  Label,
  // Business
  Business,
  TrendingUp,
  Assessment,
  BarChart,
  PieChart,
  ShowChart,
  Timeline,
  Work,
  // Default
  Folder,
};

/**
 * Get an icon component by name or custom path
 * @param {string} iconName - The name of the icon or custom path (custom://filename)
 * @returns {React.Component} The icon component, or Folder as fallback
 */
export const getIconComponent = (iconName) => {
  if (!iconName || typeof iconName !== 'string') {
    return Folder;
  }
  
  // Check if it's a custom icon path
  if (iconName.startsWith('custom://')) {
    // For custom icons, we'll return a special marker that the rendering
    // component can recognize and handle differently
    return 'CUSTOM_ICON';
  }
  
  return ICON_MAP[iconName] || Folder;
};

/**
 * Check if an icon name is valid
 * @param {string} iconName - The name of the icon to validate
 * @returns {boolean} True if the icon exists in the mapping or is a custom icon
 */
export const isValidIcon = (iconName) => {
  if (!iconName || typeof iconName !== 'string' || iconName.length === 0) {
    return false;
  }
  
  // Check if it's a custom icon path
  if (iconName.startsWith('custom://')) {
    return true; // We assume custom icons are valid if properly formatted
  }
  
  // Check if it's a predefined icon
  return !!(iconName in ICON_MAP);
};

/**
 * Check if an icon is a custom icon
 * @param {string} iconName - The name of the icon to check
 * @returns {boolean} True if the icon is a custom icon
 */
export const isCustomIcon = (iconName) => {
  return !!(iconName && typeof iconName === 'string' && iconName.startsWith('custom://'));
};

/**
 * Extract the filename from a custom icon path
 * @param {string} customIconPath - The custom icon path (custom://filename)
 * @returns {string} The filename, or null if not a valid custom icon path
 */
export const getCustomIconFilename = (customIconPath) => {
  if (!isCustomIcon(customIconPath)) {
    return null;
  }
  
  return customIconPath.replace('custom://', '');
};

/**
 * Get the full file path for a custom icon
 * @param {string} iconName - The icon name or custom path
 * @returns {Promise<string|null>} The full file path, or null if not a custom icon
 */
export const getCustomIconPath = async (iconName) => {
  if (!isCustomIcon(iconName)) {
    return null;
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const filename = getCustomIconFilename(iconName);
    if (!filename) return null;
    
    const fullPath = await invoke('get_custom_icon_path', { iconId: filename });
    return fullPath;
  } catch (error) {
    console.error('Failed to get custom icon path:', error);
    return null;
  }
};
