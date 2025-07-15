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
  selectedProjectIndex,
  onTagClick,
  loadingOperations,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const gridRef = useRef(null);

  // Scroll selected project into view
  useEffect(() => {
    if (typeof selectedProjectIndex === 'number' && selectedProjectIndex >= 0) {
      const cards = gridRef.current?.querySelectorAll('.project-card');
      if (cards && cards[selectedProjectIndex]) {
        cards[selectedProjectIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
  }, [selectedProjectIndex]);

  // Separate pinned and unpinned projects
  const pinnedProjects = projects.filter(p => p.pinned);
  const unpinnedProjects = projects.filter(p => !p.pinned);

  const renderProjectCard = (project, globalIndex) => {
    const isSelected = globalIndex === selectedProjectIndex;
    
    return (
      <Box
        key={project.id}
        className="project-card"
        tabIndex={0}
        sx={{
          outline: 'none',
          '& > .MuiCard-root': {
            boxShadow: isSelected ? theme.shadows[8] : theme.shadows[1],
            borderColor: isSelected ? theme.palette.primary.main : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            transition: 'all 0.2s ease-in-out',
          },
        }}
      >
        <ProjectCard
          project={project}
          onUpdate={onUpdateProject}
          onLaunch={onLaunchProject}
          onDelete={onDeleteProject}
          onPin={onPinProject}
          onTagClick={onTagClick}
          isSelected={isSelected}
          loadingOperations={loadingOperations}
        />
      </Box>
    );
  };

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