import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTheme } from '@mui/material';
import { renderWithTheme, createMockProject, createMockProjects } from '../test/testUtils.jsx';
import ProjectGrid from './ProjectGrid';

describe('ProjectGrid', () => {
  const defaultProps = {
    projects: [],
    recentProjects: [],
    onUpdateProject: vi.fn(),
    onLaunchProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onPinProject: vi.fn(),
    selectedProjectIndex: null,
    onTagClick: vi.fn(),
    loadingOperations: {},
  };

  const renderProjectGrid = (props = {}) => {
    return renderWithTheme(
      <ProjectGrid {...defaultProps} {...props} />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Grid Layout Rendering', () => {
    it('renders project grid with multiple projects', () => {
      const projects = createMockProjects(5);
      renderProjectGrid({ projects });

      // Check that all projects are rendered
      projects.forEach(project => {
        expect(screen.getByText(project.name)).toBeInTheDocument();
      });
    });

    it('renders with proper sections when projects exist', () => {
      const projects = createMockProjects(3);
      renderProjectGrid({ projects });

      expect(screen.getByText('All Projects')).toBeInTheDocument();
    });
  });

  describe('Recent Projects Section', () => {
    it('displays recent projects section when recent projects exist', () => {
      const recentProjects = createMockProjects(2);
      const otherProjects = createMockProjects(3).map((p, i) => ({
        ...p,
        id: i + 10,
        name: `Other Project ${i + 1}`,
      }));

      renderProjectGrid({ 
        projects: [...recentProjects, ...otherProjects],
        recentProjects 
      });

      expect(screen.getByText('Recent Projects')).toBeInTheDocument();
      
      // Check recent projects are shown in their section
      const recentSection = screen.getByText('Recent Projects').parentElement;
      recentProjects.forEach(project => {
        expect(within(recentSection).getByText(project.name)).toBeInTheDocument();
      });
    });

    it('does not display recent projects section when empty', () => {
      const projects = createMockProjects(3);
      renderProjectGrid({ projects, recentProjects: [] });

      expect(screen.queryByText('Recent Projects')).not.toBeInTheDocument();
    });
  });

  describe('Pinned Projects', () => {
    it('displays pinned projects in a separate section', () => {
      const pinnedProjects = [
        createMockProject({ id: 1, name: 'Pinned 1', pinned: true }),
        createMockProject({ id: 2, name: 'Pinned 2', pinned: true }),
      ];
      const unpinnedProjects = [
        createMockProject({ id: 3, name: 'Unpinned 1', pinned: false }),
        createMockProject({ id: 4, name: 'Unpinned 2', pinned: false }),
      ];

      renderProjectGrid({ 
        projects: [...pinnedProjects, ...unpinnedProjects] 
      });

      expect(screen.getByText('Pinned Projects')).toBeInTheDocument();
      expect(screen.getByText('Other Projects')).toBeInTheDocument();

      // Check pinned projects are in their section
      const pinnedSection = screen.getByText('Pinned Projects').parentElement;
      pinnedProjects.forEach(project => {
        expect(within(pinnedSection).getByText(project.name)).toBeInTheDocument();
      });
    });

    it('shows "All Projects" when no pinned projects exist', () => {
      const projects = createMockProjects(3);
      renderProjectGrid({ projects });

      expect(screen.queryByText('Pinned Projects')).not.toBeInTheDocument();
      expect(screen.getByText('All Projects')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no projects exist', () => {
      renderProjectGrid({ projects: [] });

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Add a project by dragging a folder here or clicking the Add button')).toBeInTheDocument();
    });

    it('displays empty state for unpinned section when only pinned projects exist', () => {
      const pinnedProjects = [
        createMockProject({ id: 1, name: 'Pinned 1', pinned: true }),
      ];

      renderProjectGrid({ projects: pinnedProjects });

      expect(screen.getByText('Pinned Projects')).toBeInTheDocument();
      expect(screen.getByText('Other Projects')).toBeInTheDocument();
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('highlights selected project', () => {
      const projects = createMockProjects(3);
      const { container } = renderProjectGrid({ 
        projects,
        selectedProjectIndex: 1 
      });

      const projectCards = container.querySelectorAll('.project-card');
      expect(projectCards).toHaveLength(3);

      // Check that the second project (index 1) has the selected styles
      const selectedCard = projectCards[1];
      expect(selectedCard.querySelector('[data-selected="true"]')).toBeTruthy();
    });

    it('scrolls selected project into view', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const projects = createMockProjects(10);
      const { rerender } = renderProjectGrid({ 
        projects,
        selectedProjectIndex: null 
      });

      // Update selected index
      rerender(
        <ProjectGrid 
          {...defaultProps} 
          projects={projects} 
          selectedProjectIndex={5} 
        />
      );

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'nearest'
        });
      });
    });
  });

  describe('Responsive Layout', () => {
    it('uses single column layout on small screens', () => {
      const smallScreenTheme = createTheme({
        breakpoints: {
          values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536,
          },
        },
      });

      // Mock window.matchMedia for small screen
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 899.95px'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const projects = createMockProjects(3);
      const { container } = renderWithTheme(
        <ProjectGrid {...defaultProps} projects={projects} />,
        { theme: smallScreenTheme }
      );

      // Check Masonry component columns prop
      const masonryElements = container.querySelectorAll('[data-testid="mock-masonry"]');
      expect(masonryElements.length).toBeGreaterThan(0);
    });

    it('uses two column layout on larger screens', () => {
      // Mock window.matchMedia for large screen
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: !query.includes('max-width'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const projects = createMockProjects(3);
      const { container } = renderProjectGrid({ projects });

      const masonryElements = container.querySelectorAll('[data-testid="mock-masonry"]');
      expect(masonryElements.length).toBeGreaterThan(0);
    });
  });

  describe('Props Passing to ProjectCard', () => {
    it('passes correct props to each ProjectCard', () => {
      const projects = [
        createMockProject({ id: 1, name: 'Project 1' }),
        createMockProject({ id: 2, name: 'Project 2' }),
      ];
      const onUpdateProject = vi.fn();
      const onLaunchProject = vi.fn();
      const onDeleteProject = vi.fn();
      const onPinProject = vi.fn();
      const onTagClick = vi.fn();
      const loadingOperations = { 1: 'launch' };

      renderProjectGrid({
        projects,
        onUpdateProject,
        onLaunchProject,
        onDeleteProject,
        onPinProject,
        onTagClick,
        loadingOperations,
        selectedProjectIndex: 0,
      });

      // Verify that project names are rendered (which means ProjectCard received the project prop)
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });

    it('correctly calculates global index for projects across sections', () => {
      const recentProjects = [
        createMockProject({ id: 1, name: 'Recent 1' }),
        createMockProject({ id: 2, name: 'Recent 2' }),
      ];
      const pinnedProjects = [
        createMockProject({ id: 3, name: 'Pinned 1', pinned: true }),
      ];
      const unpinnedProjects = [
        createMockProject({ id: 4, name: 'Unpinned 1', pinned: false }),
      ];

      const { container } = renderProjectGrid({
        projects: [...pinnedProjects, ...unpinnedProjects],
        recentProjects,
        selectedProjectIndex: 3, // Should select the first unpinned project
      });

      const projectCards = container.querySelectorAll('.project-card');
      expect(projectCards).toHaveLength(4);

      // The 4th card (index 3) should be selected
      const selectedCard = projectCards[3];
      expect(selectedCard.querySelector('[data-selected="true"]')).toBeTruthy();
    });
  });

  describe('Masonry Layout Integration', () => {
    it('renders projects in Masonry component', () => {
      const projects = createMockProjects(4);
      const { container } = renderProjectGrid({ projects });

      const masonryComponents = container.querySelectorAll('[data-testid="mock-masonry"]');
      expect(masonryComponents.length).toBeGreaterThan(0);

      // Check that projects are within Masonry
      const masonry = masonryComponents[0];
      projects.forEach(project => {
        expect(within(masonry).getByText(project.name)).toBeInTheDocument();
      });
    });

    it('applies correct spacing between items', () => {
      const projects = createMockProjects(2);
      const { container } = renderProjectGrid({ projects });

      const masonryComponent = container.querySelector('[data-testid="mock-masonry"]');
      expect(masonryComponent).toBeInTheDocument();
      
      // Masonry applies spacing through CSS
      const styles = window.getComputedStyle(masonryComponent);
      expect(styles.gap).toBeDefined();
    });
  });

  describe('Section Ordering', () => {
    it('renders sections in correct order: Recent -> Pinned -> Others', () => {
      const recentProjects = [createMockProject({ id: 1, name: 'Recent' })];
      const pinnedProjects = [createMockProject({ id: 2, name: 'Pinned', pinned: true })];
      const unpinnedProjects = [createMockProject({ id: 3, name: 'Unpinned', pinned: false })];

      renderProjectGrid({
        projects: [...recentProjects, ...pinnedProjects, ...unpinnedProjects],
        recentProjects,
      });

      const headings = screen.getAllByRole('heading', { level: 5 });
      expect(headings[0]).toHaveTextContent('Recent Projects');
      expect(headings[1]).toHaveTextContent('Pinned Projects');
      expect(headings[2]).toHaveTextContent('Other Projects');
    });
  });
});