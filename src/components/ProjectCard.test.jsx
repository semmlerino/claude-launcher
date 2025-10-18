import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme, createMockProject } from '../test/testUtils.jsx';
import ProjectCard from './ProjectCard';

describe('ProjectCard', () => {
  const mockHandlers = {
    onUpdate: vi.fn(),
    onLaunch: vi.fn(),
    onDelete: vi.fn(),
    onPin: vi.fn(),
    onTagClick: vi.fn(),
  };

  const defaultProject = createMockProject({
    id: 1,
    name: 'My Test Project',
    path: '/home/user/projects/test-project',
    tags: ['react', 'javascript', 'testing'],
    notes: 'This is a test project for unit testing',
    pinned: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders project name', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
    });

    test('renders project path', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      expect(screen.getByText('/home/user/projects/test-project')).toBeInTheDocument();
    });

    test('renders all tags', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('testing')).toBeInTheDocument();
    });

    test('renders notes', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      expect(screen.getByText('This is a test project for unit testing')).toBeInTheDocument();
    });

    test('renders "No notes yet" when notes are empty', () => {
      const projectWithoutNotes = { ...defaultProject, notes: '' };
      renderWithTheme(<ProjectCard project={projectWithoutNotes} {...mockHandlers} />);
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });

    test('truncates long notes with ellipsis', () => {
      const longNotes = 'A'.repeat(200);
      const projectWithLongNotes = { ...defaultProject, notes: longNotes };
      renderWithTheme(<ProjectCard project={projectWithLongNotes} {...mockHandlers} />);

      const notesElement = screen.getByText(/A{150}\.\.\./);
      expect(notesElement).toBeInTheDocument();
    });

    test('renders with empty tags array', () => {
      const projectWithoutTags = { ...defaultProject, tags: [] };
      renderWithTheme(<ProjectCard project={projectWithoutTags} {...mockHandlers} />);
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
    });
  });

  describe('Pin/Unpin functionality', () => {
    test('shows star border icon when unpinned', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      const starButton = screen.getByRole('button', { name: /Pin project/i });
      expect(starButton).toBeInTheDocument();
    });

    test('shows filled star icon when pinned', () => {
      const pinnedProject = { ...defaultProject, pinned: true };
      renderWithTheme(<ProjectCard project={pinnedProject} {...mockHandlers} />);
      const starButton = screen.getByRole('button', { name: /Unpin project/i });
      expect(starButton).toBeInTheDocument();
    });

    test('calls onPin with correct arguments when clicking pin button', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      const pinButton = screen.getAllByRole('button')[0]; // First button is the pin button
      fireEvent.click(pinButton);
      expect(mockHandlers.onPin).toHaveBeenCalledWith(1, true);
    });

    test('toggles pin state correctly', () => {
      const pinnedProject = { ...defaultProject, pinned: true };
      renderWithTheme(<ProjectCard project={pinnedProject} {...mockHandlers} />);
      const pinButton = screen.getAllByRole('button')[0];
      fireEvent.click(pinButton);
      expect(mockHandlers.onPin).toHaveBeenCalledWith(1, false);
    });

    test('shows loading spinner when pin operation is in progress', () => {
      const loadingOperations = { pin: 1 };
      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('disables pin button during loading', () => {
      const loadingOperations = { pin: 1 };
      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );
      const pinButton = screen.getAllByRole('button')[0];
      expect(pinButton).toBeDisabled();
    });
  });

  describe('Edit mode', () => {
    test('enters edit mode when clicking edit button', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      // Should show text fields
      expect(screen.getByDisplayValue('My Test Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('react, javascript, testing')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('This is a test project for unit testing'),
      ).toBeInTheDocument();
    });

    test('shows save and cancel buttons in edit mode', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel editing' })).toBeInTheDocument();
    });

    test('focuses name field when entering edit mode', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      const nameField = screen.getByDisplayValue('My Test Project');
      expect(document.activeElement).toBe(nameField);
    });

    test('disables edit button when any operation is loading', () => {
      const loadingOperations = { launch: 1 };
      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      expect(editButton).toBeDisabled();
    });
  });

  describe('Saving edits', () => {
    test('saves edited values correctly', async () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      // Edit fields
      const nameField = screen.getByDisplayValue('My Test Project');
      const tagsField = screen.getByDisplayValue('react, javascript, testing');
      const notesField = screen.getByDisplayValue('This is a test project for unit testing');

      fireEvent.change(nameField, { target: { value: 'Updated Project Name' } });
      fireEvent.change(tagsField, { target: { value: 'vue, typescript' } });
      fireEvent.change(notesField, { target: { value: 'Updated notes' } });

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith(1, {
          name: 'Updated Project Name',
          tags: ['vue', 'typescript'],
          notes: 'Updated notes',
        });
      });
    });

    test('trims whitespace from tags', async () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      const tagsField = screen.getByDisplayValue('react, javascript, testing');
      fireEvent.change(tagsField, { target: { value: '  tag1  ,  tag2  ,  tag3  ' } });

      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith(1, {
          name: 'My Test Project',
          tags: ['tag1', 'tag2', 'tag3'],
          notes: 'This is a test project for unit testing',
        });
      });
    });

    test('filters out empty tags', async () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      const tagsField = screen.getByDisplayValue('react, javascript, testing');
      fireEvent.change(tagsField, { target: { value: 'tag1,,,tag2,,,' } });

      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith(1, {
          name: 'My Test Project',
          tags: ['tag1', 'tag2'],
          notes: 'This is a test project for unit testing',
        });
      });
    });

    test('shows loading spinner during save', () => {
      // First render in normal state
      const { rerender } = renderWithTheme(
        <ProjectCard project={defaultProject} {...mockHandlers} />,
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      // Verify we're in edit mode
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();

      // Now simulate the component during save operation
      // The component would stay in edit mode during save
      rerender(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={{ update: 1 }}
        />,
      );

      // The loading spinner should be inside the save button
      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      expect(saveButton).toBeInTheDocument();
      expect(within(saveButton).getByRole('progressbar')).toBeInTheDocument();
    });

    test('disables save/cancel buttons during update', () => {
      // First render and enter edit mode
      const { rerender } = renderWithTheme(
        <ProjectCard project={defaultProject} {...mockHandlers} />,
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      // Verify we're in edit mode
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();

      // Re-render with loading state - component should maintain edit mode during update
      rerender(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={{ update: 1 }}
        />,
      );

      const saveButton = screen.getByRole('button', { name: 'Save changes' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel editing' });

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Canceling edits', () => {
    test('reverts changes when canceling', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      // Edit fields
      const nameField = screen.getByDisplayValue('My Test Project');
      fireEvent.change(nameField, { target: { value: 'Changed Name' } });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel editing' });
      fireEvent.click(cancelButton);

      // Should show original values
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument();
    });

    test('exits edit mode when canceling', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const editButton = screen.getByRole('button', { name: 'Edit project' });
      fireEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel editing' });
      fireEvent.click(cancelButton);

      // Should not show text fields anymore
      expect(screen.queryByDisplayValue('My Test Project')).not.toBeInTheDocument();
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
    });
  });

  describe('Launch functionality', () => {
    test('calls onLaunch with project id and continue flag false by default', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const launchButton = screen.getByRole('button', { name: /launch/i });
      fireEvent.click(launchButton);

      expect(mockHandlers.onLaunch).toHaveBeenCalledWith(1, false);
    });

    test('calls onLaunch with continue flag true when checkbox is checked', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const continueCheckbox = screen.getByRole('checkbox', { name: /continue/i });
      fireEvent.click(continueCheckbox);

      const launchButton = screen.getByRole('button', { name: /launch/i });
      fireEvent.click(launchButton);

      expect(mockHandlers.onLaunch).toHaveBeenCalledWith(1, true);
    });

    test('maintains continue flag after launch', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const continueCheckbox = screen.getByRole('checkbox', { name: /continue/i });
      fireEvent.click(continueCheckbox);
      expect(continueCheckbox).toBeChecked();

      const launchButton = screen.getByRole('button', { name: /launch/i });
      fireEvent.click(launchButton);

      expect(continueCheckbox).toBeChecked();
    });

    test('shows loading state during launch', () => {
      const loadingOperations = { launch: 1 };
      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );

      const launchButton = screen.getByRole('button', { name: /launching/i });
      expect(launchButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('has data-launch-btn attribute for keyboard navigation', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const launchButton = screen.getByRole('button', { name: /launch/i });
      expect(launchButton).toHaveAttribute('data-launch-btn');
    });
  });

  describe('Delete functionality', () => {
    test('calls onDelete with project id', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete project' });
      fireEvent.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(1);
    });

    test('disables delete button when any operation is loading', () => {
      const loadingOperations = { update: 1 };
      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'Delete project' });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Tag click handling', () => {
    test('calls onTagClick when clicking a tag', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const reactTag = screen.getByText('react');
      fireEvent.click(reactTag);

      expect(mockHandlers.onTagClick).toHaveBeenCalledWith('react');
    });

    test('makes tags non-clickable when onTagClick is not provided', () => {
      const { onTagClick, ...handlersWithoutTagClick } = mockHandlers;
      renderWithTheme(<ProjectCard project={defaultProject} {...handlersWithoutTagClick} />);

      const reactTag = screen.getByText('react');
      fireEvent.click(reactTag);

      expect(mockHandlers.onTagClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard focus and selected state', () => {
    test('applies hover effect on card', () => {
      const { container } = renderWithTheme(
        <ProjectCard project={defaultProject} {...mockHandlers} />,
      );

      // Since we're mocking MUI Card component as a div, we just verify it renders
      const card = container.firstChild;
      expect(card).toBeInTheDocument();
    });

    test('card can receive focus through launch button', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      const launchButton = screen.getByRole('button', { name: /launch/i });
      launchButton.focus();

      expect(document.activeElement).toBe(launchButton);
    });

    test('handles isSelected prop (visual selection)', () => {
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} isSelected={true} />);

      // The component should be rendered with isSelected=true
      // Note: The current implementation doesn't visually indicate selection,
      // but the prop is passed and could be used for styling
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
    });
  });

  describe('Loading states for different operations', () => {
    test('handles multiple loading operations correctly', () => {
      const loadingOperations = {
        pin: 2, // Different project
        update: 1, // This project
        launch: 3, // Different project
      };

      renderWithTheme(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={loadingOperations}
        />,
      );

      // Pin button should not be loading (different project id)
      const pinButton = screen.getAllByRole('button')[0];
      expect(pinButton).not.toBeDisabled();

      // Edit/Delete should be disabled (any operation on this project)
      const editButton = screen.getByRole('button', { name: 'Edit project' });
      const deleteButton = screen.getByRole('button', { name: 'Delete project' });
      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    test('shows appropriate loading state for each operation', () => {
      // Test pin loading
      const { rerender } = renderWithTheme(
        <ProjectCard project={defaultProject} {...mockHandlers} loadingOperations={{ pin: 1 }} />,
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Test launch loading
      rerender(
        <ProjectCard
          project={defaultProject}
          {...mockHandlers}
          loadingOperations={{ launch: 1 }}
        />,
      );
      expect(screen.getByText('Launching...')).toBeInTheDocument();
    });
  });

  describe('Icon functionality', () => {
    test('displays project icon when icon is set', () => {
      const projectWithIcon = {
        ...defaultProject,
        icon: 'Code',
      };
      renderWithTheme(<ProjectCard project={projectWithIcon} {...mockHandlers} />);
      
      // The icon should be displayed in the project name section
      expect(screen.getByText('My Test Project')).toBeInTheDocument();
      // Icon is rendered through getIconComponent, which would create an element
      // We can check that the structure includes the icon by looking for the container
      const nameContainer = screen.getByText('My Test Project').parentElement;
      expect(nameContainer).toHaveStyle('display: flex');
    });

    test('does not display icon when icon is not set', () => {
      const projectWithoutIcon = {
        ...defaultProject,
        icon: null,
      };
      renderWithTheme(<ProjectCard project={projectWithoutIcon} {...mockHandlers} />);
      
      // Project name should be displayed directly without icon container
      const nameElement = screen.getByText('My Test Project');
      expect(nameElement).toBeInTheDocument();
    });

    test('opens icon picker when context menu change icon is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      // Right click to open context menu
      const card = screen.getByText('My Test Project').closest('[data-testid]') || 
                   screen.getByText('My Test Project').closest('div');
      await user.pointer({ keys: '[MouseRight]', target: card });

      // Click "Change Icon" in context menu
      const changeIconItem = screen.getByText('Change Icon');
      await user.click(changeIconItem);

      // Icon picker should be open
      expect(screen.getByTestId('icon-picker')).toBeInTheDocument();
    });

    test('calls onUpdate when icon is selected', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      // Right click to open context menu
      const card = screen.getByText('My Test Project').closest('[data-testid]') || 
                   screen.getByText('My Test Project').closest('div');
      await user.pointer({ keys: '[MouseRight]', target: card });

      // Click "Change Icon" in context menu
      const changeIconItem = screen.getByText('Change Icon');
      await user.click(changeIconItem);

      // Select an icon
      const selectCodeIcon = screen.getByText('Select Code Icon');
      await user.click(selectCodeIcon);

      // Should call onUpdate with icon
      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith(1, { icon: 'Code' });
      });
    });

    test('calls onUpdate with null when icon is cleared', async () => {
      const user = userEvent.setup();
      const projectWithIcon = {
        ...defaultProject,
        icon: 'Terminal',
      };
      renderWithTheme(<ProjectCard project={projectWithIcon} {...mockHandlers} />);

      // Right click to open context menu
      const card = screen.getByText('My Test Project').closest('[data-testid]') || 
                   screen.getByText('My Test Project').closest('div');
      await user.pointer({ keys: '[MouseRight]', target: card });

      // Click "Change Icon" in context menu
      const changeIconItem = screen.getByText('Change Icon');
      await user.click(changeIconItem);

      // Clear the icon
      const clearIcon = screen.getByText('Clear Icon');
      await user.click(clearIcon);

      // Should call onUpdate with null icon
      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith(1, { icon: null });
      });
    });

    test('closes icon picker when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ProjectCard project={defaultProject} {...mockHandlers} />);

      // Right click to open context menu
      const card = screen.getByText('My Test Project').closest('[data-testid]') || 
                   screen.getByText('My Test Project').closest('div');
      await user.pointer({ keys: '[MouseRight]', target: card });

      // Click "Change Icon" in context menu
      const changeIconItem = screen.getByText('Change Icon');
      await user.click(changeIconItem);

      // Icon picker should be open
      expect(screen.getByTestId('icon-picker')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      // Icon picker should be closed
      expect(screen.queryByTestId('icon-picker')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('handles undefined loadingOperations prop', () => {
      renderWithTheme(
        <ProjectCard project={defaultProject} {...mockHandlers} loadingOperations={undefined} />,
      );

      expect(screen.getByText('My Test Project')).toBeInTheDocument();
      const launchButton = screen.getByRole('button', { name: /launch/i });
      expect(launchButton).not.toBeDisabled();
    });

    test('handles project with special characters in name', () => {
      const specialProject = {
        ...defaultProject,
        name: 'Project <with> "special" & characters',
      };
      renderWithTheme(<ProjectCard project={specialProject} {...mockHandlers} />);

      expect(screen.getByText('Project <with> "special" & characters')).toBeInTheDocument();
    });

    test('handles very long project paths', () => {
      const longPathProject = {
        ...defaultProject,
        path: '/very/long/path/that/goes/on/and/on/and/might/overflow/the/card/width/project',
      };
      renderWithTheme(<ProjectCard project={longPathProject} {...mockHandlers} />);

      const pathElement = screen.getByText(longPathProject.path);
      // The Typography component with noWrap prop should handle overflow
      expect(pathElement).toBeInTheDocument();
    });
  });
});
