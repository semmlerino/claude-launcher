import { Box, Typography, Collapse, IconButton, Chip, useTheme, useMediaQuery } from '@mui/material';
import { Masonry } from '@mui/lab';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';

const GroupSection = ({
  group,
  projects,
  onToggleCollapse,
  onMoveToGroup,
  renderProjectCard,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId && onMoveToGroup) {
      onMoveToGroup(projectId, group.id);
    }
  };

  const projectCount = projects.length;

  return (
    <Box
      sx={{ mb: 3 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Group Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            '& .group-expand-icon': {
              color: 'text.primary',
            },
          },
        }}
        onClick={() => onToggleCollapse(group.id)}
      >
        <IconButton
          size="small"
          className="group-expand-icon"
          sx={{ color: 'text.secondary', p: 0.5 }}
        >
          {group.collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
        <Box
          sx={{
            width: 12,
            height: 12,
            backgroundColor: group.color || '#607D8B',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 500, flex: 1 }}>
          {group.name}
        </Typography>
        <Chip
          label={projectCount}
          size="small"
          variant="outlined"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </Box>

      {/* Collapsible Content */}
      <Collapse in={!group.collapsed}>
        {projectCount === 0 ? (
          <Box
            sx={{
              py: 3,
              px: 2,
              textAlign: 'center',
              color: 'text.secondary',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: 1,
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2">
              Drag projects here or use context menu to add
            </Typography>
          </Box>
        ) : (
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {projects.map((project) => renderProjectCard(project))}
          </Masonry>
        )}
      </Collapse>
    </Box>
  );
};

export default GroupSection;
