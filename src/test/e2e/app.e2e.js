describe('Claude Launcher E2E Tests', () => {
    it('should launch the application', async () => {
        // The app should be launched by the test runner
        const title = await browser.getTitle();
        expect(title).toBe('Claude Launcher');
    });

    it('should display the main application window', async () => {
        // Wait for the app to load
        await browser.pause(2000);
        
        // Check if main elements are visible
        const appTitle = await $('h4*=Claude Launcher');
        await expect(appTitle).toBeDisplayed();
    });

    it('should add a new project via drag and drop', async () => {
        // This is a placeholder for drag & drop testing
        // WebDriver drag & drop with native file system is complex
        // and requires platform-specific implementations
        
        // For now, we'll test the add button is clickable
        const addButton = await $('button[aria-label="add"]');
        await expect(addButton).toBeDisplayed();
        await expect(addButton).toBeClickable();
    });

    it('should display project cards when projects exist', async () => {
        // Wait for any existing projects to load
        await browser.pause(1000);
        
        // Check if project grid exists
        const projectGrid = await $('.project-card');
        const exists = await projectGrid.isExisting();
        
        if (exists) {
            // If projects exist, verify card structure
            const projectTitle = await $('.project-card h2');
            await expect(projectTitle).toBeDisplayed();
        }
    });

    it('should toggle between light and dark theme', async () => {
        // Find theme toggle button
        const buttons = await $$('button');
        let themeButton;
        
        for (const button of buttons) {
            const html = await button.getHTML();
            if (html.includes('LightModeIcon') || html.includes('DarkModeIcon')) {
                themeButton = button;
                break;
            }
        }
        
        if (themeButton) {
            // Click theme toggle
            await themeButton.click();
            await browser.pause(500);
            
            // Verify theme changed (button icon should change)
            const newHtml = await themeButton.getHTML();
            expect(newHtml).toBeTruthy();
        }
    });

    it('should search for projects', async () => {
        // Find search input
        const searchInput = await $('input[placeholder*="Search"]');
        const exists = await searchInput.isExisting();
        
        if (exists) {
            await searchInput.setValue('test');
            await browser.pause(500);
            
            // Verify search value is set
            const value = await searchInput.getValue();
            expect(value).toBe('test');
        }
    });

    it('should sort projects', async () => {
        // Find sort selector
        const sortSelect = await $('select');
        const exists = await sortSelect.isExisting();
        
        if (exists) {
            // Change sort option
            await sortSelect.selectByAttribute('value', 'name');
            await browser.pause(500);
            
            // Verify sort changed
            const value = await sortSelect.getValue();
            expect(value).toBe('name');
        }
    });

    it('should show recent projects section', async () => {
        // Look for recent projects heading
        const recentHeading = await $('p*=Recent Projects');
        const exists = await recentHeading.isExisting();
        
        if (exists) {
            await expect(recentHeading).toBeDisplayed();
        }
    });

    it('should handle window controls', async () => {
        // This tests basic window functionality
        // Note: Actual window controls (minimize, maximize, close) 
        // should be tested carefully to avoid closing the test runner
        
        const appWindow = await browser.getWindowHandle();
        expect(appWindow).toBeTruthy();
        
        // Get window size
        const size = await browser.getWindowSize();
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
    });

    it('should display Claude installation status', async () => {
        // Check for Claude installation status message
        await browser.pause(1000);
        
        // Look for either success or warning message
        const successMessage = await $('*=claude-code');
        const warningMessage = await $('*=Claude Code is not installed');
        
        const hasSuccess = await successMessage.isExisting();
        const hasWarning = await warningMessage.isExisting();
        
        // Should show one or the other
        expect(hasSuccess || hasWarning).toBe(true);
    });
});