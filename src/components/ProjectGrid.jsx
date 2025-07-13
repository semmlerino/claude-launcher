import React, { useEffect, useRef } from 'react';
import {
  Grid,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Masonry } from '@mui/lab';
import ProjectCard from './ProjectCard';

const ProjectGrid = ({
  projects,
  recentProjects,
  onUpdateProject,
  onLaunchProject,
  onDeleteProject,
  onPinProject,
  onKeyNavigation,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const gridRef = useRef(null);
  const selectedCardRef = useRef(0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!onKeyNavigation) return;

      const cards = gridRef.current?.querySelectorAll('.project-card');
      if (!cards || cards.length === 0) return;

      let newIndex = selectedCardRef.current;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(0, selectedCardRef.current - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(cards.length - 1, selectedCardRef.current + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Calculate cards per row
          const cardsPerRow = isSmallScreen ? 1 : 2;
          newIndex = Math.max(0, selectedCardRef.current - cardsPerRow);
          break;
        case 'ArrowDown':
          e.preventDefault();
          const perRow = isSmallScreen ? 1 : 2;
          newIndex = Math.min(cards.length - 1, selectedCardRef.current + perRow);
          break;
        case 'Enter':
          e.preventDefault();
          // Find the launch button in the selected card and click it
          const launchBtn = cards[selectedCardRef.current]?.querySelector('[data-launch-btn]');
          if (launchBtn) launchBtn.click();
          break;
        default:
          return;
      }

      if (newIndex !== selectedCardRef.current) {
        selectedCardRef.current = newIndex;
        cards[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        cards[newIndex]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSmallScreen, onKeyNavigation]);

  // Separate pinned and unpinned projects
  const pinnedProjects = projects.filter(p => p.pinned);
  const unpinnedProjects = projects.filter(p => !p.pinned);

  const renderProjectCard = (project, index) => (
    <Box
      key={project.id}
      className="project-card"
      tabIndex={0}
      sx={{
        outline: 'none',
        '&:focus': {
          '& > .MuiCard-root': {
            boxShadow: theme.shadows[8],
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
            borderStyle: 'solid',
          },
        },
      }}
    >
      <ProjectCard
        project={project}
        onUpdate={onUpdateProject}
        onLaunch={onLaunchProject}
        onDelete={onDeleteProject}
        onPin={onPinProject}
      />
    </Box>
  );

  return (
    <Box ref={gridRef}>
      {/* Recent Projects Section */}
      {recentProjects && recentProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Recent Projects
          </Typography>
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {recentProjects.map((project, index) => 
              renderProjectCard(project, index)
            )}
          </Masonry>
          <Divider sx={{ mt: 3 }} />
        </Box>
      )}

      {/* Pinned Projects Section */}
      {pinnedProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Pinned Projects
          </Typography>
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {pinnedProjects.map((project, index) => 
              renderProjectCard(project, recentProjects.length + index)
            )}
          </Masonry>
          <Divider sx={{ mt: 3 }} />
        </Box>
      )}

      {/* All Projects Section */}
      <Box>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          {pinnedProjects.length > 0 ? 'Other Projects' : 'All Projects'}
        </Typography>
        {unpinnedProjects.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">No projects yet</Typography>
            <Typography variant="body2">
              Add a project by dragging a folder here or clicking the Add button
            </Typography>
          </Box>
        ) : (
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {unpinnedProjects.map((project, index) => 
              renderProjectCard(
                project, 
                recentProjects.length + pinnedProjects.length + index
              )
            )}
          </Masonry>
        )}
      </Box>
    </Box>
  );
};

export default ProjectGrid;