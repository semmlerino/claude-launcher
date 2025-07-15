export const config = {
    //
    // ====================
    // Runner Configuration
    // ====================
    runner: 'local',
    
    //
    // ==================
    // Specify Test Files
    // ==================
    specs: [
        './src/test/e2e/**/*.e2e.js'
    ],
    // Patterns to exclude.
    exclude: [
        // 'path/to/excluded/files'
    ],
    
    //
    // ============
    // Capabilities
    // ============
    maxInstances: 1,
    capabilities: [{
        browserName: 'tauri',
        'tauri:options': {
            application: './src-tauri/target/release/claude-launcher',
        }
    }],
    
    //
    // ===================
    // Test Configurations
    // ===================
    // Level of logging verbosity: trace | debug | info | warn | error | silent
    logLevel: 'info',
    
    // If you only want to run your tests until a specific amount of tests have failed use
    // bail (default is 0 - don't bail, run all tests).
    bail: 0,
    
    // Set a base URL in order to shorten url command calls
    baseUrl: 'http://localhost',
    
    // Default timeout for all waitFor* commands.
    waitforTimeout: 10000,
    
    // Default timeout in milliseconds for request
    // if browser driver or grid doesn't send response
    connectionRetryTimeout: 120000,
    
    // Default request retries count
    connectionRetryCount: 3,
    
    // Test runner services
    services: ['tauri'],
    
    // Framework you want to run your specs with.
    framework: 'mocha',
    
    // The number of times to retry the entire specfile when it fails as a whole
    specFileRetries: 1,
    
    // Delay in seconds between the spec file retry attempts
    specFileRetriesDelay: 0,
    
    // Whether or not retried spec files should be retried immediately or deferred to the end of the queue
    specFileRetriesDeferred: false,
    
    // Test reporter for stdout.
    reporters: ['spec'],

    // Options to be passed to Mocha.
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    
    //
    // =====
    // Hooks
    // =====
    /**
     * Gets executed once before all workers get launched.
     * @param {object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     */
    onPrepare: function (config, capabilities) {
        console.log('Starting E2E tests for Tauri application...');
    },
    
    /**
     * Gets executed before test execution begins. At this point you can access to all global
     * variables like `browser`. It is the perfect place to define custom commands.
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs        List of spec file paths that are to be run
     * @param {object}         browser      instance of created browser/device session
     */
    before: function (capabilities, specs) {
        browser.setTimeout({ 'implicit': 5000 });
    },
    
    /**
     * Runs after a WebdriverIO command gets executed
     * @param {string} commandName hook command name
     * @param {Array} args arguments that command would receive
     * @param {number} result 0 - command success, 1 - command error
     * @param {object} error error object if any
     */
    afterCommand: function (commandName, args, result, error) {
        // Log failed commands for debugging
        if (error) {
            console.error(`Command ${commandName} failed:`, error);
        }
    },
    
    /**
     * Gets executed after all tests are done. You still have access to all global variables from
     * the test.
     * @param {number} result 0 - test pass, 1 - test fail
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    after: function (result, capabilities, specs) {
        console.log('E2E tests completed with result:', result);
    },
};