import { useRef } from 'react';
import { Box, Typography, Divider, useTheme, useMediaQuery } from '@mui/material';
import { Masonry } from '@mui/lab';
import ProjectCard from './ProjectCard';
import GroupSection from './GroupSection';

const ProjectGrid = ({
  projects,
  recentProjects,
  groups = [],
  onUpdateProject,
  onLaunchProject,
  onDeleteProject,
  onPinProject,
  onTagClick,
  onToggleGroupCollapse,
  onMoveToGroup,
  loadingOperations,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const gridRef = useRef(null);

  // Separate pinned and unpinned projects
  const pinnedProjects = projects.filter(p => p.pinned);
  // Ungrouped = not pinned and no group_id
  const ungroupedProjects = projects.filter(p => !p.pinned && !p.group_id);
  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  const renderProjectCard = (project) => {
    return (
      <Box
        key={project.id}
        className="project-card"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('projectId', project.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        sx={{
          outline: 'none',
          cursor: 'grab',
          '& > .MuiCard-root': {
            boxShadow: theme.shadows[1],
            borderColor: 'transparent',
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
          isSelected={false}
          loadingOperations={loadingOperations}
          groups={groups}
          onMoveToGroup={onMoveToGroup}
        />
      </Box>
    );
  };

  // Get projects for a specific group (excluding pinned ones that show in Pinned section)
  const getGroupProjects = (groupId) => {
    return projects.filter(p => p.group_id === groupId && !p.pinned);
  };

  // Check if any groups have projects or if we should show empty state
  const hasAnyGroupedProjects = sortedGroups.some(g => getGroupProjects(g.id).length > 0);

  return (
    <Box ref={gridRef}>
      {/* Pinned Projects Section */}
      {pinnedProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Pinned Projects
          </Typography>
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {pinnedProjects.map((project) => renderProjectCard(project))}
          </Masonry>
          <Divider sx={{ mt: 3 }} />
        </Box>
      )}

      {/* Recent Projects Section */}
      {recentProjects && recentProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Recent Projects
          </Typography>
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {recentProjects.map((project) => renderProjectCard(project))}
          </Masonry>
          <Divider sx={{ mt: 3 }} />
        </Box>
      )}

      {/* Group Sections */}
      {sortedGroups.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Groups
          </Typography>
          {sortedGroups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              projects={getGroupProjects(group.id)}
              onUpdateProject={onUpdateProject}
              onLaunchProject={onLaunchProject}
              onDeleteProject={onDeleteProject}
              onPinProject={onPinProject}
              onTagClick={onTagClick}
              onToggleCollapse={onToggleGroupCollapse}
              onMoveToGroup={onMoveToGroup}
              loadingOperations={loadingOperations}
              renderProjectCard={renderProjectCard}
            />
          ))}
          {(ungroupedProjects.length > 0 || !hasAnyGroupedProjects) && <Divider sx={{ mt: 2 }} />}
        </Box>
      )}

      {/* Ungrouped/Other Projects Section */}
      <Box>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          {sortedGroups.length > 0 ? 'Ungrouped' : pinnedProjects.length > 0 ? 'Other Projects' : 'All Projects'}
        </Typography>
        {ungroupedProjects.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">
              {projects.length === 0 ? 'No projects yet' : 'All projects are grouped or pinned'}
            </Typography>
            <Typography variant="body2">
              {projects.length === 0
                ? 'Add a project by dragging a folder here or clicking the Add button'
                : 'Create more groups or add new projects'}
            </Typography>
          </Box>
        ) : (
          <Masonry columns={isSmallScreen ? 1 : 2} spacing={2}>
            {ungroupedProjects.map((project) => renderProjectCard(project))}
          </Masonry>
        )}
      </Box>
    </Box>
  );
};

export default ProjectGrid;
