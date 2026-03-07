# Testing Guide

This guide covers testing practices and procedures for the Claude Launcher project.

## Overview

The project uses a comprehensive testing stack:
- **Frontend**: Vitest + React Testing Library + happy-dom
- **Integration**: Tauri mockIPC for frontend-backend interaction testing
- **E2E**: WebdriverIO with tauri-driver for full application testing
- **Backend**: Rust's built-in testing framework with in-memory SQLite
- **CI/CD**: GitHub Actions for automated testing on multiple platforms

## Frontend Testing

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm test -- --run

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

### Test Structure

Frontend tests are located alongside their components:
```
src/
├── components/
│   ├── ProjectCard.jsx
│   ├── ProjectCard.test.jsx
│   ├── ProjectGrid.jsx
│   └── ProjectGrid.test.jsx
├── App.jsx
├── App.test.jsx
└── test/
    ├── setup.js         # Test environment setup
    ├── testUtils.jsx    # Common test utilities
    ├── integration/     # Integration tests
    │   └── App.integration.test.jsx
    └── e2e/            # End-to-end tests
        └── app.e2e.js
```

### Key Testing Patterns

#### 1. Component Testing
```javascript
import { renderWithTheme, createMockProject } from '../test/testUtils.jsx';

describe('ProjectCard', () => {
  test('renders project information', () => {
    const project = createMockProject({ name: 'Test Project' });
    renderWithTheme(<ProjectCard project={project} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});
```

#### 2. User Interaction Testing
```javascript
test('handles pin toggle', async () => {
  const onPin = vi.fn();
  renderWithTheme(<ProjectCard project={project} onPin={onPin} />);
  
  const pinButton = screen.getByRole('button', { name: /pin/i });
  await userEvent.click(pinButton);
  
  expect(onPin).toHaveBeenCalledWith(project.id, true);
});
```

#### 3. Async Operations
```javascript
test('shows loading state during save', () => {
  const loadingOperations = { update: project.id };
  renderWithTheme(
    <ProjectCard 
      project={project} 
      loadingOperations={loadingOperations}
    />
  );
  
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Test Environment Configuration

The project uses `happy-dom` instead of `jsdom` due to Material-UI v6 compatibility issues. The setup includes:

1. **Material-UI Mocks**: Comprehensive mocks prevent hanging during module initialization
2. **Tauri API Mocks**: Mocked using `@tauri-apps/api/mocks`
3. **WebCrypto Polyfill**: Required for certain browser APIs

## Integration Testing

### Overview

Integration tests verify the interaction between React components and Tauri backend commands using mockIPC.

### Running Integration Tests

```bash
# Run all integration tests
npm test src/test/integration

# Run specific integration test
npm test src/test/integration/App.integration.test.jsx
```

### Key Integration Testing Patterns

#### 1. Mocking Tauri Commands
```javascript
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

beforeEach(() => {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'get_projects':
        return mockProjects;
      case 'add_project':
        return { id: '123', path: args.path, name: 'New Project' };
      default:
        return null;
    }
  });
});

afterEach(() => {
  clearMocks();
});
```

#### 2. Testing Frontend-Backend Flows
```javascript
it('should add a project via file dialog', async () => {
  const { open } = await import('@tauri-apps/plugin-dialog');
  open.mockResolvedValue('/path/to/project');
  
  render(<App />);
  
  const addButton = screen.getByRole('button', { name: /add/i });
  await user.click(addButton);
  
  await waitFor(() => {
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });
});
```

#### 3. Testing State Synchronization
```javascript
it('should persist settings', async () => {
  let savedTheme = 'light';
  
  mockIPC((cmd, args) => {
    if (cmd === 'set_setting' && args.key === 'theme') {
      savedTheme = args.value;
      return { status: 'success' };
    }
    if (cmd === 'get_setting' && args.key === 'theme') {
      return savedTheme;
    }
  });
  
  render(<App />);
  // Test theme persistence...
});
```

## E2E Testing

### Overview

End-to-end tests verify the complete application flow using WebdriverIO with the actual built Tauri application.

### Prerequisites

```bash
# Install tauri-driver
cargo install tauri-driver --locked

# Platform-specific WebDriver requirements:
# Linux: WebKitWebDriver
# Windows: Microsoft Edge Driver
```

### Running E2E Tests

```bash
# Build app and run E2E tests
npm run test:e2e

# Run E2E tests against development build
npm run test:e2e:dev
```

### E2E Test Configuration

The `wdio.conf.js` file configures WebdriverIO for Tauri:

```javascript
export const config = {
  capabilities: [{
    browserName: 'tauri',
    'tauri:options': {
      application: './src-tauri/target/release/claude-launcher',
    }
  }],
  framework: 'mocha',
  // ...
};
```

### Key E2E Testing Patterns

#### 1. Application Launch
```javascript
it('should launch the application', async () => {
  const title = await browser.getTitle();
  expect(title).toBe('Claude Launcher');
});
```

#### 2. UI Interaction
```javascript
it('should add a project', async () => {
  const addButton = await $('button[aria-label="add"]');
  await addButton.click();
  
  // Handle file dialog...
  await browser.pause(1000);
  
  const projectCard = await $('.project-card');
  await expect(projectCard).toBeDisplayed();
});
```

#### 3. Cross-Platform Testing
```javascript
it('should handle window controls', async () => {
  const size = await browser.getWindowSize();
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);
});
```

### Common Testing Issues & Solutions

#### Material-UI v6 Hanging
**Problem**: Tests hang during Material-UI module initialization with jsdom  
**Solution**: Use happy-dom environment and comprehensive MUI mocks in `setup.js`

#### Tauri API Mocking
**Problem**: Tauri APIs not available in test environment  
**Solution**: Import and use Tauri mocks:
```javascript
import { mockWindows, clearMocks } from '@tauri-apps/api/mocks';

beforeEach(() => {
  mockWindows('main');
});

afterEach(() => {
  clearMocks();
});
```

#### React Act Warnings
**Problem**: "Warning: An update to App inside a test was not wrapped in act(...)"  
**Solution**: Wrap async operations that trigger state updates:
```javascript
import { act } from '@testing-library/react';

// For user interactions
await act(async () => {
  await user.type(searchInput, 'search text');
});

// For async state updates
await waitFor(() => {
  expect(screen.getByText('Updated text')).toBeInTheDocument();
});
```

#### Multiple Elements with Same Text
**Problem**: Tests fail when multiple elements have the same text (e.g., tags in filters and project cards)  
**Solution**: Use `getAllByText` and select the correct element:
```javascript
// Instead of: screen.getByText('react')
const reactTags = screen.getAllByText('react');
await user.click(reactTags[0]); // Click the first one (filter tag)
```

#### Multiple Action Buttons (Launch, Edit, Delete)
**Problem**: Tests fail when multiple project cards have the same action buttons (e.g., multiple "Launch" buttons)  
**Solution**: Use `within()` to find elements within specific component contexts:
```javascript
// Instead of: screen.getByRole('button', { name: /launch/i })
const project1Title = screen.getByText('Project 1');
const project1Card = project1Title.closest('.project-card');
const launchButton = within(project1Card).getByRole('button', { name: /launch/i });
await user.click(launchButton);
```

#### Aria-Label vs Data-TestId
**Problem**: Tests using data-testid fail when components use aria-labels  
**Solution**: Prefer semantic queries that match accessibility patterns:
```javascript
// Instead of: screen.getByTestId('theme-toggle')
const themeButton = screen.getByRole('button', { name: 'Switch to dark theme' });

// For buttons with specific text
const deleteButton = screen.getByRole('button', { name: 'Delete project' });
```

#### Debounced Operations
**Problem**: Tests fail due to debounce timing in search or other delayed operations  
**Solution**: Increase timeout and use proper async handling:
```javascript
// Wait for debounced search (300ms debounce)
await waitFor(() => {
  expect(screen.queryByText('Filtered item')).not.toBeInTheDocument();
}, { timeout: 2000 }); // Generous timeout for debounced operations
```

#### Mutex Deadlocks in Rust Tests
**Problem**: Rust tests hang when a function holds a mutex lock while calling another function that needs the same lock  
**Solution**: Use scoped blocks to release locks before calling other methods:
```rust
fn update_project(&self, id: String, updates: ProjectUpdate) -> Result<Project, String> {
    // Execute update in a scoped block to release the lock
    {
        let conn = self.conn.lock().unwrap();
        // ... update logic ...
    } // Lock is released here
    
    // Now safe to call other methods that need the lock
    self.get_project_by_id(&id)
}
```

#### Error Message Format Consistency
**Problem**: Tests fail because error message format doesn't match expected text  
**Solution**: Ensure tests match the actual error message format, including Error object string conversion:
```javascript
// Error object toString() adds "Error: " prefix
throw new Error('Database error');
// Results in: "Failed to load projects: Error: Database error"

// Test should match the actual format
expect(screen.getByText(/Failed to load projects: Error: Database error/)).toBeInTheDocument();
```

#### Drag and Drop Event Testing
**Problem**: Drag events in tests don't trigger state updates properly  
**Solution**: Wrap drag events in act() and use proper DOM event handling:
```javascript
// Wrap drag events in act() for proper state updates
await act(async () => {
  const dragOverEvent = new Event('dragover', { bubbles: true });
  dragOverEvent.preventDefault = vi.fn();
  appContainer.dispatchEvent(dragOverEvent);
});
```

#### Projects in Multiple Sections
**Problem**: Tests fail when projects appear in both recent and main sections  
**Solution**: Use smarter assertions that account for multiple instances:
```javascript
// Instead of expecting single instance
const alphaIndex = projectNames.indexOf('Alpha');

// Check for at least one correct ordering across all instances
const hasCorrectOrder = alphaIndices.some(alphaIdx => 
  betaIndices.some(betaIdx => 
    zebraIndices.some(zebraIdx => 
      alphaIdx < betaIdx && betaIdx < zebraIdx
    )
  )
);
expect(hasCorrectOrder).toBe(true);
```

#### Recent Projects Section Filtering
**Problem**: Recent projects section shows when tag filtering is active  
**Solution**: Hide recent projects when any filter is active:
```javascript
// Fixed implementation
recentProjects={searchQuery || activeTags.length > 0 ? [] : recentProjects}
```

## Backend Testing

### Running Tests

```bash
# Run Rust tests (from project root)
npm run test:rust

# Or directly with cargo (from src-tauri directory)
cd src-tauri && cargo test

# Run with backtrace for debugging
RUST_BACKTRACE=1 cargo test
```

### Test Structure

Backend tests use Rust's built-in testing framework with in-memory SQLite databases:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_db() -> Result<AppDatabase, Box<dyn std::error::Error>> {
        let conn = Connection::open_in_memory()?;
        // Initialize tables...
        Ok(AppDatabase { conn: Mutex::new(conn) })
    }
    
    #[test]
    fn test_add_project() {
        let db = create_test_db().unwrap();
        let result = db.add_project("/test/path".to_string());
        assert!(result.is_ok());
    }
}
```

### Key Testing Patterns

#### 1. Database Operations
- Use in-memory SQLite for fast, isolated tests
- Test both success and error cases
- Verify database constraints (e.g., unique paths)

#### 2. Edge Cases
- Duplicate project paths
- Invalid data
- Concurrent operations (with Mutex)

#### 3. Integration Points
- Settings persistence
- Project CRUD operations
- Launch command building

### WSL Considerations

When running tests in WSL:
```bash
# Ensure Rust is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Run tests with timeout
timeout 300 npm run test:rust
```

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes automated testing on push and pull requests:

1. **Frontend Tests**
   - Runs on Ubuntu latest
   - Includes coverage reporting
   - Uploads to Codecov

2. **Rust Tests**  
   - Runs on multiple platforms (Ubuntu, Windows, macOS)
   - Includes formatting and linting checks
   - Uses cargo cache for faster builds

3. **Integration Tests**
   - Builds complete Tauri application
   - Verifies frontend and backend integration
   - Runs after unit tests pass

4. **Code Quality**
   - ESLint for JavaScript/React
   - Prettier for code formatting
   - Cargo fmt and clippy for Rust

### Running CI Locally

Simulate CI environment:
```bash
# Frontend
npm ci
npm test -- --run
npm run lint
npm run format:check

# Backend
cargo test --all-features
cargo fmt -- --check
cargo clippy -- -D warnings
```

## Writing New Tests

### Frontend Test Checklist
- [ ] Test renders without errors
- [ ] Test user interactions (clicks, input changes)
- [ ] Test loading states
- [ ] Test error states
- [ ] Test edge cases (empty data, special characters)
- [ ] Use semantic queries (getByRole, getByLabelText)
- [ ] Mock external dependencies properly
- [ ] Wrap async state updates in act() when needed
- [ ] Handle multiple elements with same text using getAllBy queries
- [ ] Use aria-labels for accessibility and testing
- [ ] Account for debounced operations with appropriate timeouts

### Integration Test Checklist
- [ ] Mock all Tauri commands used by the component
- [ ] Test complete user flows (e.g., add project → see it in list)
- [ ] Verify frontend state updates based on backend responses
- [ ] Test error handling from backend commands
- [ ] Clear mocks between tests
- [ ] Use realistic mock data

### E2E Test Checklist
- [ ] Test critical user journeys
- [ ] Verify application launches correctly
- [ ] Test platform-specific features carefully
- [ ] Add appropriate waits for async operations
- [ ] Keep tests independent and repeatable
- [ ] Test both success and error scenarios

### Backend Test Checklist
- [ ] Use in-memory database for isolation
- [ ] Test both success and failure paths
- [ ] Verify database constraints
- [ ] Test concurrent access if applicable
- [ ] Clean up resources in tests
- [ ] Use descriptive test names

## Best Practices

1. **Keep Tests Fast**: Use mocks and in-memory databases
2. **Keep Tests Isolated**: Each test should be independent
3. **Keep Tests Readable**: Clear test names and arrange-act-assert pattern
4. **Test Behavior, Not Implementation**: Focus on what the code does, not how
5. **Use Test Utilities**: Leverage `testUtils.jsx` for common patterns
6. **Handle Async Properly**: Use `waitFor` and `findBy` queries for async operations
7. **Match Implementation**: Ensure test selectors match actual component props (e.g., aria-labels)
8. **Settings Keys**: Use exact setting keys from implementation (theme_preference, sort_preference)
9. **Typography Variants**: Mock Typography to render correct heading levels (h1-h6)
10. **Avoid Deadlocks**: In Rust, release mutex locks before calling other methods that need the same lock
11. **Error Message Consistency**: Test error messages with the exact format including Error object prefixes
12. **Multiple Element Handling**: Use `getAllByText` and smart assertions when elements appear multiple times
13. **Section-Aware Testing**: Account for projects appearing in both recent and main sections during sorting/filtering
14. **Drag Event Wrapping**: Wrap drag events in act() to prevent React state update warnings
15. **Filter Logic Integration**: Ensure all filtering logic (search, tags) properly affects all UI sections
16. **Implementation-First Testing**: Always read the actual implementation before writing or fixing tests - adapt tests to match the code, not the other way around
17. **Context-Aware Element Selection**: Use `within()` to find elements within specific component contexts when multiple instances exist

## Debugging Tests

### Frontend
```bash
# Run specific test file
npm test ProjectCard.test.jsx

# Run tests matching pattern
npm test -- -t "handles pin toggle"

# Debug in UI mode
npm run test:ui
```

### Backend
```bash
# Run specific test
cargo test test_add_project

# Show test output
cargo test -- --nocapture

# Run with backtrace
RUST_BACKTRACE=1 cargo test
```

## Coverage Reports

Generate and view coverage:
```bash
# Frontend coverage
npm run test:coverage
# Report at: coverage/index.html

# Backend coverage (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
# Report at: tarpaulin-report.html
```

## Troubleshooting

### Common Issues

1. **Tests hanging indefinitely**
   - Check for unmocked async operations
   - Ensure Material-UI is properly mocked
   - Verify test timeouts are adequate

2. **Flaky tests**
   - Add proper wait conditions for async operations
   - Check for race conditions
   - Ensure proper cleanup between tests

3. **WSL-specific issues**
   - Export Rust PATH before running tests
   - Use adequate timeouts for slower file operations
   - Consider running backend tests natively on Windows

### Getting Help

- Check test output carefully for error messages
- Use `--verbose` flag for more detailed output
- Review similar tests in the codebase
- Check GitHub Actions logs for CI failures

## Mock Reduction Plan: Transitioning to Minimal Mocking

### Background

Our current testing setup over-mocks Material UI components, which goes against MUI's recommended testing practices and creates maintenance overhead. This plan outlines a systematic approach to reduce mocking while maintaining test reliability.

### Research Findings

#### Material UI v6 + jsdom/happy-dom Issues
- **Performance**: JSDOM 23.2.0+ has significant performance degradation, causing tests to hang
- **DataGrid Issues**: MUI DataGrid v6.2.1+ has compatibility issues with JSDOM environments
- **Ripple Effects**: MUI v6 ripple effects require `await act()` wrapping for proper testing
- **CSS Injection**: Some MUI components inject CSS that may cause "Could not parse CSS stylesheet" errors

#### Official MUI Testing Recommendations
- Test components through semantic queries (roles, labels) rather than implementation details
- Don't mock Material UI components - test them as they would be used
- Focus on user behavior and accessibility
- Only mock external dependencies and APIs

### Implementation Plan

#### Phase 1: Assessment and Preparation
1. **Backup Current Setup**: Keep original `setup.js` as `setup.js.backup`
2. **Analyze Test Failures**: Document which tests may break during transition
3. **Identify Critical Mocks**: Determine which mocks are truly necessary

#### Phase 2: Systematic Mock Removal

##### Priority 1: Remove Basic Component Mocks
- **Components to unmock**: Box, Typography, Paper, Container, Button, TextField, Checkbox
- **Approach**: Remove mocks and update tests to use semantic queries
- **Testing**: Ensure these components render correctly in happy-dom

##### Priority 2: Remove Icon Mocks
- **Current**: Icons mocked as strings (e.g., `StarIcon: () => 'StarIcon'`)
- **New**: Let icons render as actual components or simple spans
- **Testing**: Update tests to not rely on icon mock strings

##### Priority 3: Remove Custom Component Mocks
- **Components**: ContextMenu, ColorPicker
- **Approach**: Test actual components for better integration confidence
- **Benefit**: Catch real integration issues between components

##### Priority 4: Handle Complex Components
- **Keep mocked**: Masonry (known to hang), DataGrid (if used)
- **Evaluate**: Menu, Dialog, Select components for necessity
- **Strategy**: Try removing, add back only if causing issues

#### Phase 3: Test Migration Strategy

##### Query Strategy Changes
```javascript
// OLD: Implementation-based queries
expect(screen.getByText('StarIcon')).toBeInTheDocument()

// NEW: Semantic/user-based queries
const pinButton = screen.getByRole('button', { name: /pin project/i })
expect(pinButton).toBeInTheDocument()
```

##### Testing Approach Updates
- Use `getByRole` for interactive elements
- Use `getByLabelText` for form inputs  
- Use `getByText` for content verification
- Use `getAllByText` when multiple elements exist
- Use `within()` for component-scoped queries

##### MUI v6 Specific Handling
```javascript
// For ripple effects in v6
await act(async () => {
  fireEvent.click(button)
})

// For async state updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

#### Phase 4: Minimal Mock Configuration

##### Essential Mocks to Keep
```javascript
// Performance-critical mocks
vi.mock('@mui/lab', () => ({
  Masonry: ({ children }) => createElement('div', { 'data-testid': 'masonry' }, children)
}))

// External API mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

// Browser API mocks (not available in test environment)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})
```

##### Removed Mocks
- All basic MUI components (Box, Typography, Button, etc.)
- All MUI icons
- Our custom components (ContextMenu, ColorPicker)
- Form components (TextField, Checkbox, Select)
- Layout components (Container, Paper, Card)

#### Phase 5: Implementation Steps

1. **Step 1**: Create new minimal `setup.js` with only essential mocks
2. **Step 2**: Update `ProjectCard.test.jsx` to use semantic queries
3. **Step 3**: Update `App.test.jsx` with same approach
4. **Step 4**: Run tests and fix failures by improving queries, not adding mocks
5. **Step 5**: Verify all tests pass and maintain coverage
6. **Step 6**: Document new testing patterns and update guidelines

#### Phase 6: Validation and Monitoring

##### Success Criteria
- All tests pass with minimal mocking
- Test performance is acceptable (no hanging tests)
- Test coverage is maintained or improved
- Tests are more resilient to MUI internal changes

##### Monitoring
- Track test execution time before/after
- Monitor for flaky tests
- Check for memory usage improvements
- Validate CI/CD pipeline stability

##### Rollback Strategy
- Keep backup of original setup
- Document any components that must remain mocked
- Provide clear migration guide for team

### Expected Benefits

1. **More Realistic Testing**: Tests run against actual MUI components
2. **Better Integration Confidence**: Catch real component interaction issues
3. **Easier Maintenance**: Less mock code to maintain
4. **MUI Best Practices**: Align with official MUI testing recommendations
5. **Resilient Tests**: Tests survive MUI internal changes
6. **Performance**: Potentially faster tests with less mocking overhead

### Potential Risks

1. **Initial Test Failures**: Some tests may break during migration
2. **Performance Impact**: Real components may be slower than mocks
3. **Flaky Tests**: Real components may introduce timing issues
4. **Learning Curve**: Team needs to adopt semantic query patterns

### Implementation Timeline

- **Phase 1-2**: Research and basic mock removal (1-2 days)
- **Phase 3-4**: Test migration and minimal setup (2-3 days)  
- **Phase 5-6**: Implementation and validation (2-3 days)
- **Total**: 5-8 days depending on test complexity

This plan provides a systematic approach to achieving minimal mocking while maintaining test reliability and following Material UI best practices.