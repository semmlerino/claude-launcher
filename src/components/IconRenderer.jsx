import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { Folder } from '@mui/icons-material';
import { convertFileSrc } from '@tauri-apps/api/core';
import { 
  getIconComponent, 
  isCustomIcon, 
  getCustomIconPath 
} from '../utils/iconMapping';

/**
 * Universal icon renderer that handles both predefined Material-UI icons
 * and custom user-uploaded icons
 */
const IconRenderer = ({ 
  iconName, 
  sx = {}, 
  fallbackIcon = Folder,
  ...props 
}) => {
  const [customIconPath, setCustomIconPath] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isCustomIcon(iconName)) {
      // Load custom icon path
      getCustomIconPath(iconName)
        .then(path => {
          if (path) {
            setCustomIconPath(path);
            setImageError(false);
          }
        })
        .catch(error => {
          console.error('Failed to load custom icon:', error);
          setImageError(true);
        });
    } else {
      // Reset custom icon state for non-custom icons
      setCustomIconPath(null);
      setImageError(false);
    }
  }, [iconName]);

  const handleImageError = () => {
    setImageError(true);
  };

  // Handle custom icons
  if (isCustomIcon(iconName)) {
    if (imageError || !customIconPath) {
      // Show fallback icon if custom icon failed to load
      const FallbackIcon = fallbackIcon;
      return <FallbackIcon sx={sx} {...props} />;
    }

    // Render custom icon as image
    try {
      const secureUrl = convertFileSrc(customIconPath);
      console.log('Loading custom icon:', customIconPath, '→', secureUrl);
      
      return (
        <Box
          component="img"
          src={secureUrl}
          alt="Custom icon"
          onError={handleImageError}
          sx={{
            width: sx.fontSize || 32,
            height: sx.fontSize || 32,
            objectFit: 'contain',
            display: 'block',
            borderRadius: (sx.fontSize || 32) > 48 ? 1 : 0, // Add slight rounding for large icons
            filter: (sx.fontSize || 32) > 64 ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none', // Add shadow for very large icons
            ...sx
          }}
          {...props}
        />
      );
    } catch (error) {
      console.error('Failed to convert file src for custom icon:', error);
      const FallbackIcon = fallbackIcon;
      return <FallbackIcon sx={sx} {...props} />;
    }
  }

  // Handle predefined Material-UI icons
  const IconComponent = getIconComponent(iconName);
  
  // If getIconComponent returned the special marker for custom icons,
  // or if it's not found, use fallback
  if (IconComponent === 'CUSTOM_ICON' || IconComponent === Folder) {
    const FallbackIcon = fallbackIcon;
    return <FallbackIcon sx={sx} {...props} />;
  }

  // Render predefined icon
  return <IconComponent sx={sx} {...props} />;
};

export default IconRenderer;