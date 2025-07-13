/**
 * JavaScript Explorer DevTools Extension
 * Main panel script - now using modular architecture
 */

// Import all modules
import { JavaScriptExplorer } from './core/JavaScriptExplorer.js';
import { DevToolsAPI } from './utils/DevToolsAPI.js';



// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Verify DevTools API availability first
    if (!chrome.devtools || !chrome.devtools.inspectedWindow) {
        document.body.innerHTML = `<div class="error-message">DevTools API not available. Please ensure this is running as a DevTools extension.</div>`;
        return;
    }

    // Verify we can access the inspected window and have a valid tab
    if (!chrome.devtools.inspectedWindow.tabId) {
        document.body.innerHTML = `<div class="error-message">No inspected window available. Please ensure you are on a valid web page.</div>`;
        return;
    }

    chrome.tabs.get(chrome.devtools.inspectedWindow.tabId, async (tab) => {
        if (chrome.runtime.lastError || !tab) {
            document.body.innerHTML = `<div class="error-message">Failed to get inspected tab information. Please refresh the page and try again.</div>`;
            return;
        }

        if (tab.url && tab.url.startsWith('devtools://')) {
            document.body.innerHTML = `<div class="error-message">JavaScript Explorer cannot be used on DevTools pages. Please open DevTools on a regular web page instead.</div>`;
            return;
        }

        try {
            // Verify we can access the window object
            await new Promise((resolve, reject) => {
                chrome.devtools.inspectedWindow.eval(
                    'typeof window === "object" && window !== null && typeof window.document === "object" && window.document !== null && typeof window.document.body === "object" && window.document.body !== null',
                    (result, error) => {
                        if (error) {
                            // Always reject on any error to avoid suppressing initialization failures
                            reject(new Error(
                                'Cannot access inspected window. Error details: ' +
                                JSON.stringify(error)
                            ));
                        } else if (result === true) {
                            // Window object, document, and body exist and are accessible
                            resolve();
                        } else {
                            reject(new Error('Inspected window is not fully loaded or accessible. Please ensure you are on a valid web page and the page is fully loaded.'));
                        }
                    }
                );
            });

            // Create and expose the DevToolsAPI instance for error handling
            const devToolsAPI = new DevToolsAPI();
            window.devToolsAPI = devToolsAPI;
            
            // Initialize with configuration options
            const explorer = new JavaScriptExplorer({
                devToolsAPI: devToolsAPI,
                // Configure protocol error prevention settings
                maxProperties: 200,
                detectCircularReferences: true,
                maxSafeObjectSize: 10000
            });
            
            // Expose the explorer instance for debugging
            window.explorer = explorer;

            // Wait for initial data to load
            await explorer.loadInitialData();
        } catch (error) {
            console.error('Failed to initialize JavaScript Explorer:', error);
            let errorMessage = error.message;
            let suggestion = '';

            if (error.suggestion) {
                suggestion = `<br><br>Suggestion: ${error.suggestion}`;
            }

            document.body.innerHTML = `<div class="error-message">Failed to initialize JavaScript Explorer: ${errorMessage}${suggestion}<br><br>Please ensure you are on a valid web page and refresh the DevTools panel.</div>`;
        }
    });
});