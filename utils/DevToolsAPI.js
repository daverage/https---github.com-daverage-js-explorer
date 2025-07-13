/**
 * DevTools API Module
 * Handles all Chrome DevTools API interactions and evaluations
 */

export class DevToolsAPI {
    constructor() {
        if (!chrome.devtools || !chrome.devtools.inspectedWindow) {
            throw new Error('DevTools API not available. Please ensure this is running as a DevTools extension.');
        }
    }

    /**
     * Apply fixes for known root causes of protocol errors
     * @private
     * @param {string} rootCause - The identified root cause type
     * @param {string} errorMessage - The original error message
     * @param {object} fullError - The complete error object (optional)
     * @returns {boolean} Whether a fix was successfully applied
     */
    applyRootCauseFix(rootCause, errorMessage, fullError = null) {
        switch (rootCause) {
            case 'DEEP_OBJECT_HIERARCHY':
                return this.fixDeepObjectHierarchy(errorMessage, fullError);
                
            case 'EXCESSIVE_DATA_SIZE':
                return this.fixExcessiveDataSize(errorMessage, fullError);
                
            case 'CIRCULAR_REFERENCE':
                return this.fixCircularReference(errorMessage, fullError);
                
            default:
                return false;
        }
    }
    
    /**
     * Fix for deep object hierarchies that exceed Chrome DevTools limits
     * @private
     * @param {string} errorMessage - The original error message
     * @param {object} fullError - The complete error object (optional)
     * @returns {boolean} Whether the fix was successfully applied
     */
    fixDeepObjectHierarchy(errorMessage, fullError = null) {
        // Update the MAX_EVALUATION_DEPTH in PathUtils
        try {
            // Dynamically adjust the evaluation depth based on the error
            const currentDepth = window.PathUtils ? window.PathUtils.MAX_EVALUATION_DEPTH : 50;
            const newDepth = Math.max(10, currentDepth - 10); // Reduce depth to avoid hitting limits
            
            if (window.PathUtils) {
                window.PathUtils.MAX_EVALUATION_DEPTH = newDepth;
                return true;
            }
        } catch (error) {
        }
        
        return false;
    }
    
    /**
     * Fix for excessive data size that exceeds Chrome DevTools limits
     * @private
     * @param {string} errorMessage - The original error message
     * @param {object} fullError - The complete error object (optional)
     * @returns {boolean} Whether the fix was successfully applied
     */
    fixExcessiveDataSize(errorMessage, fullError = null) {
        try {
            // Adjust the string preview length in PropertyPreviewUtils
            if (window.PropertyPreviewUtils) {
                const currentMaxLength = window.PropertyPreviewUtils.MAX_STRING_PREVIEW_LENGTH || 100;
                const newMaxLength = Math.max(20, currentMaxLength / 2); // Reduce by half but keep reasonable minimum
                
                window.PropertyPreviewUtils.MAX_STRING_PREVIEW_LENGTH = newMaxLength;
                
                // Also adjust the max properties to fetch
                if (window.JavaScriptExplorer) {
                    const currentMaxProps = window.JavaScriptExplorer.MAX_PROPERTIES || 200;
                    const newMaxProps = Math.max(50, currentMaxProps / 2);
                    window.JavaScriptExplorer.MAX_PROPERTIES = newMaxProps;
                }
                
                return true;
            }
        } catch (error) {
        }
        
        return false;
    }
    
    /**
     * Fix for circular references that cause protocol errors
     * @private
     * @param {string} errorMessage - The original error message
     * @param {object} fullError - The complete error object (optional)
     * @returns {boolean} Whether the fix was successfully applied
     */
    fixCircularReference(errorMessage, fullError = null) {
        try {
            // Implement a circular reference detection mechanism
            // This is a more complex fix that requires modifying how objects are evaluated
            
            // Set a flag to enable circular reference detection in JavaScriptExplorer
            if (window.JavaScriptExplorer) {
                window.JavaScriptExplorer.DETECT_CIRCULAR_REFERENCES = true;
                return true;
            }
        } catch (error) {
        }
        
        return false;
    }
    
    async evaluateExpression(expression) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.isAvailable()) {
                    return reject(new Error('DevTools API not available. Please ensure you are using this as a DevTools extension.'));
                }
                
                if (!chrome.devtools.inspectedWindow.tabId) {
                    return reject(new Error('No inspected window available. Please ensure you are on a valid web page.'));
                }

                // Directly execute the evaluation since panel.js already handles DevTools page checks
                this.executeEvaluation(expression, resolve, reject);
            } catch (error) {
                reject(new Error(`Failed to evaluate expression: ${error.message}`));
            }
        });
    }

    executeEvaluation(expression, resolve, reject) {
        try {
            chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
                if (exceptionInfo) {
                    // Create a more detailed error object
                    const errorDetails = {
                        message: this.formatExceptionInfo(exceptionInfo),
                        originalException: exceptionInfo,
                        expression: expression.length > 200 ? expression.substring(0, 200) + '...' : expression
                    };
                    
                    // Check for specific protocol error cases
                    if (errorDetails.message.includes('Inspector protocol error')) {
                        const protocolError = this.formatProtocolError(errorDetails.message, exceptionInfo);
                        const error = new Error(protocolError.message);
                        error.rootCause = protocolError.rootCause;
                        error.suggestion = protocolError.suggestion;
                        error.originalException = exceptionInfo;
                        return reject(error);
                    }
                    
                    const error = new Error(errorDetails.message);
                    error.originalException = exceptionInfo;
                    error.expression = errorDetails.expression;
                    reject(error);
                } else {
                    resolve({ result });
                }
            });
        } catch (error) {
            reject(new Error(`Failed to execute evaluation: ${error.message}`));
        }
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
     * @param {Error|string|object} exceptionInfo - The exception information to format
     * @returns {string} A formatted error message with detailed information
     */
    formatExceptionInfo(exceptionInfo) {
        // Log the complete original error for debugging purposes
        
        
        if (!exceptionInfo) {
            return 'Unknown error (no error information provided)';
        }
        
        // Handle different types of exception info
        if (typeof exceptionInfo === 'string') {
            // Check for protocol error with placeholder
            if (exceptionInfo.includes('Inspector protocol error: %s')) {
    
                // Try to extract more detailed information
                return this.formatProtocolError(exceptionInfo);
            }
            return exceptionInfo;
        }
        
        // Handle objects with description property
        if (exceptionInfo.description) {
            return exceptionInfo.description;
        }
        
        // Handle objects with value property
        if (exceptionInfo.value !== undefined) {
            if (typeof exceptionInfo.value === 'string') {
                // Check for protocol error with placeholder in value
                if (exceptionInfo.value.includes('Inspector protocol error: %s')) {
        
                    return this.formatProtocolError(exceptionInfo.value, exceptionInfo);
                }
                return exceptionInfo.value;
            }
            if (exceptionInfo.value && exceptionInfo.value.message) {
                return exceptionInfo.value.message;
            }
        }
        
        // Handle objects with message property
        if (exceptionInfo.message) {
            // Check for protocol error with placeholder in message
            if (typeof exceptionInfo.message === 'string' && 
                exceptionInfo.message.includes('Inspector protocol error: %s')) {
    
                return this.formatProtocolError(exceptionInfo.message, exceptionInfo);
            }
            return exceptionInfo.message;
        }
        
        // Handle objects with exceptionDetails property (Chrome DevTools Protocol)
        if (exceptionInfo.exceptionDetails) {
            try {
                const details = exceptionInfo.exceptionDetails;
                if (details.exception && details.exception.description) {
                    return details.exception.description;
                }
                if (details.text) {
                    return details.text;
                }
                if (details.exception && details.exception.value) {
                    return String(details.exception.value);
                }
            } catch (e) {
    
            }
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
                    } else if (value && typeof value === 'object') {
                        // For objects, try to extract useful properties
                        try {
                            if (value.message) relevantInfo[`${key}.message`] = value.message;
                            if (value.name) relevantInfo[`${key}.name`] = value.name;
                            if (value.code) relevantInfo[`${key}.code`] = value.code;
                        } catch (e) {
                            // Ignore errors in property extraction
                        }
                    }
                });
                
                if (Object.keys(relevantInfo).length > 0) {
                    return `Error: ${JSON.stringify(relevantInfo)}`;
                }
            }
        } catch (e) {
            // If JSON.stringify fails, return a generic message

        }
        
        return 'Evaluation error occurred (details not available)';
    }
    
    /**
     * Format protocol errors with more detailed information
     * @private
     * @param {string} errorMessage - The protocol error message with placeholder
     * @param {object} fullError - The complete error object (optional)
     * @returns {object} A formatted protocol error object with message, rootCause, details, and suggestion
     */
    formatProtocolError(errorMessage, fullError = null) {
        // Log the full error for debugging

        
        // Extract any details from the error object
        let details = 'See console for details';
        let suggestion = '';
        let rootCause = null;
        let fixApplied = false;
        
        // Check for specific protocol error types first and identify root causes
        if (errorMessage.includes('Object reference chain is too long')) {
            details = 'The object hierarchy is too deep for the DevTools to process';
            suggestion = 'Try accessing a more specific part of the object or use a shorter path';
            rootCause = 'DEEP_OBJECT_HIERARCHY';
        } else if (errorMessage.includes('Invalid string length')) {
            details = 'The string or object is too large for the DevTools to process';
            suggestion = 'Try accessing a smaller subset of data or use a more specific path';
            rootCause = 'EXCESSIVE_DATA_SIZE';
        } else if (errorMessage.includes('Maximum call stack size exceeded')) {
            details = 'The object contains circular references or is too complex';
            suggestion = 'Try accessing a simpler part of the object structure';
            rootCause = 'CIRCULAR_REFERENCE';
        } else if (fullError) {
            // Try to extract details from the error object
            if (fullError.exceptionDetails) {
                const exDetails = fullError.exceptionDetails;
                if (exDetails.exception && exDetails.exception.description) {
                    details = exDetails.exception.description;
                    // Check for common root causes in the description
                    if (details.includes('circular') || details.includes('cyclic')) {
                        rootCause = 'CIRCULAR_REFERENCE';
                    } else if (details.includes('too large') || details.includes('too big')) {
                        rootCause = 'EXCESSIVE_DATA_SIZE';
                    }
                } else if (exDetails.text) {
                    details = exDetails.text;
                } else if (exDetails.exception && exDetails.exception.value) {
                    details = String(exDetails.exception.value);
                }
            } else if (fullError.details && Array.isArray(fullError.details)) {
                details = fullError.details.join(', ');
            } else if (fullError.originalException) {
                const origEx = fullError.originalException;
                if (origEx.details) {
                    if (Array.isArray(origEx.details)) {
                        details = origEx.details.join(', ');
                    } else {
                        details = String(origEx.details);
                    }
                } else if (origEx.message) {
                    details = origEx.message;
                    // Check for common root causes in the message
                    if (details.includes('circular') || details.includes('cyclic')) {
                        rootCause = 'CIRCULAR_REFERENCE';
                    } else if (details.includes('too large') || details.includes('too big')) {
                        rootCause = 'EXCESSIVE_DATA_SIZE';
                    }
                }
            } else if (fullError.code) {
                details = `Error code: ${fullError.code}`;
            }
        }
        
        // Replace the placeholder with the details
        let formattedMessage = errorMessage;
        if (errorMessage.includes('%s')) {
            formattedMessage = errorMessage.replace('%s', details);
        }
        
        // Add suggestion if we have one
        if (suggestion) {
            formattedMessage = `${formattedMessage}\n\nSuggestion: ${suggestion}.`;
        }
        
        // Apply fixes for known root causes
        if (rootCause) {
            try {
                fixApplied = this.applyRootCauseFix(rootCause, errorMessage, fullError);
            } catch (fixError) {
    
            }
        }
        
        return {
            message: formattedMessage,
            rootCause: rootCause,
            details: details,
            suggestion: suggestion,
            originalError: errorMessage,
            fixApplied: fixApplied
        };
    }
}