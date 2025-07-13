/**
 * DevTools API Module
 * Handles all Chrome DevTools API interactions and evaluations
 */

export class DevToolsAPI {
    constructor() {
        // Initialize any DevTools API specific settings if needed
    }
    
    async evaluateExpression(expression) {
        return new Promise((resolve, reject) => {
            if (!chrome.devtools || !chrome.devtools.inspectedWindow) {
                reject(new Error('DevTools API not available'));
                return;
            }
            
            chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
                if (exceptionInfo) {
                    // Create a more detailed error object
                    const errorDetails = {
                        message: this.formatExceptionInfo(exceptionInfo),
                        originalException: exceptionInfo,
                        expression: expression.length > 200 ? expression.substring(0, 200) + '...' : expression
                    };
                    
                    console.error('Inspector evaluation error:', errorDetails);
                    
                    // Create a proper Error object with formatted message
                    const error = new Error(errorDetails.message);
                    error.originalException = exceptionInfo;
                    error.expression = errorDetails.expression;
                    
                    reject(error);
                } else {
                    resolve({ result });
                }
            });
        });
    }
    
    /**
     * Check if DevTools API is available
     */
    isAvailable() {
        return !!(chrome.devtools && chrome.devtools.inspectedWindow);
    }
    
    /**
     * Get information about the inspected window
     */
    getInspectedWindowInfo() {
        if (!this.isAvailable()) {
            return null;
        }
        
        return {
            tabId: chrome.devtools.inspectedWindow.tabId,
            // Add other relevant info as needed
        };
    }
    
    /**
     * Reload the inspected page
     */
    reloadInspectedWindow(options = {}) {
        if (!this.isAvailable()) {
            throw new Error('DevTools API not available');
        }
        
        chrome.devtools.inspectedWindow.reload(options);
    }
    
    /**
     * Format exception information into a readable error message
     */
    formatExceptionInfo(exceptionInfo) {
        if (!exceptionInfo) {
            return 'Unknown error';
        }
        
        // Handle different types of exception info
        if (typeof exceptionInfo === 'string') {
            return exceptionInfo;
        }
        
        if (exceptionInfo.description) {
            return exceptionInfo.description;
        }
        
        if (exceptionInfo.value) {
            if (typeof exceptionInfo.value === 'string') {
                return exceptionInfo.value;
            }
            if (exceptionInfo.value.message) {
                return exceptionInfo.value.message;
            }
        }
        
        if (exceptionInfo.message) {
            return exceptionInfo.message;
        }
        
        // Handle syntax errors specifically
        if (exceptionInfo.isError && exceptionInfo.code) {
            return `Syntax Error: ${exceptionInfo.code}`;
        }
        
        // Fallback to JSON representation, but safely
        try {
            const keys = Object.keys(exceptionInfo);
            if (keys.length > 0) {
                const relevantInfo = {};
                keys.forEach(key => {
                    const value = exceptionInfo[key];
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        relevantInfo[key] = value;
                    }
                });
                return `Error: ${JSON.stringify(relevantInfo)}`;
            }
        } catch (e) {
            // If JSON.stringify fails, return a generic message
        }
        
        return 'Evaluation error occurred';
    }
}