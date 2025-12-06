
const IconRenderer = ({ iconName, sx = {}, fallbackIcon, ...props }) => {
  return (
    <div 
      data-testid="mock-icon-renderer"
      data-icon-name={iconName}
      style={sx}
      {...props}
    >
      MockIcon-{iconName || 'fallback'}
    </div>
  );
};

export default IconRenderer;
