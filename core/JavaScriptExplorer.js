/**
 * JavaScript Explorer - Main Application
 * Provides an interactive interface for exploring JavaScript objects and their properties
 * Enhanced with performance monitoring and optimized utility classes
 */

import { TreeNavigation } from '../navigation/TreeNavigation.js';
import { PathNavigation } from '../navigation/PathNavigation.js';
import { GlobalSearch } from '../search/GlobalSearch.js';
import { AutoComplete } from '../search/AutoComplete.js';
import { ContentRenderer } from '../ui/ContentRenderer.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import { DevToolsAPI } from '../utils/DevToolsAPI.js';

import { PropertyPreviewUtils } from '../utils/PropertyPreviewUtils.js';
import { PathUtils } from '../utils/PathUtils.js';


export class JavaScriptExplorer {
    // Static configuration properties with default values
    static MAX_PROPERTIES = 200; // Maximum number of properties to fetch
    static DETECT_CIRCULAR_REFERENCES = true; // Enable circular reference detection
    static MAX_SAFE_OBJECT_SIZE = 10000; // Maximum safe object size to prevent protocol errors
    
    constructor(options = {}) {
        this.currentPath = 'window';
        this.currentObject = null;
        this.selectedNode = null;
        this.pathHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Apply configuration options
        if (options.maxProperties !== undefined) {
            this.constructor.MAX_PROPERTIES = options.maxProperties;
        }
        
        if (options.detectCircularReferences !== undefined) {
            this.constructor.DETECT_CIRCULAR_REFERENCES = options.detectCircularReferences;
        }
        
        if (options.maxSafeObjectSize !== undefined) {
            this.constructor.MAX_SAFE_OBJECT_SIZE = options.maxSafeObjectSize;
        }
        
        // Initialize DevToolsAPI
        this.devToolsAPI = options.devToolsAPI || new DevToolsAPI();
        
        this.initializeElements();
        this.initializeModules();
        this.initializeEventListeners();
        this.initializeResizer();
        this.setupKeyboardShortcuts();
        this.loadInitialData();
    }
    
    initializeElements() {
        this.addressPath = document.getElementById('addressPath');
        this.navigationInput = document.getElementById('navigationInput');
        this.globalSearchInput = document.getElementById('globalSearchInput');
        this.goButton = document.getElementById('goButton');
        this.searchButton = document.getElementById('searchButton');
        this.searchScope = document.getElementById('searchScope');
        this.searchResults = document.getElementById('searchResults');
        this.suggestionsDropdown = document.getElementById('suggestions');
        this.navigationTree = document.getElementById('navigationTree');
        this.contentView = document.getElementById('contentView');
        this.contentTitle = document.getElementById('contentTitle');
        this.contextMenuElement = document.getElementById('contextMenu');
        this.leftPane = document.querySelector('.left-pane');
        this.rightPane = document.querySelector('.right-pane');
        this.resizer = document.getElementById('resizer');
    }
    
    initializeModules() {
        // DevToolsAPI and ErrorHandler are now initialized in the constructor
        // to allow for dependency injection and configuration
        
        this.treeNavigation = new TreeNavigation(this);
        this.pathNavigation = new PathNavigation(this);
        this.globalSearch = new GlobalSearch(this);
        this.autoComplete = new AutoComplete(this);
        this.contentRenderer = new ContentRenderer(this);
        this.contextMenu = new ContextMenu(this);
    }
    
    initializeEventListeners() {
        // Navigation input events
        this.navigationInput.addEventListener('input', (e) => this.autoComplete.handleInput(e));
        this.navigationInput.addEventListener('keydown', (e) => this.autoComplete.handleKeydown(e));
        this.navigationInput.addEventListener('blur', () => this.autoComplete.hideSuggestions());
        
        // Global search events
        this.globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.globalSearch.performSearch();
            }
        });
        this.searchButton.addEventListener('click', () => this.globalSearch.performSearch());
        
        // Go button
        this.goButton.addEventListener('click', () => this.pathNavigation.navigateToExpression());
        
        // Address path breadcrumb navigation
        this.addressPath.addEventListener('click', (e) => this.pathNavigation.handleBreadcrumbClick(e));
        
        // Context menu
        document.addEventListener('contextmenu', (e) => this.contextMenu.handleContextMenu(e));
        document.addEventListener('click', () => this.contextMenu.hideContextMenu());
        this.contextMenuElement.addEventListener('click', (e) => this.contextMenu.handleContextMenuAction(e));
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navigationInput.contains(e.target) && !this.suggestionsDropdown.contains(e.target)) {
                this.autoComplete.hideSuggestions();
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Left Arrow - Go back
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goBack();
            }
            
            // Ctrl/Cmd + Right Arrow - Go forward
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
                e.preventDefault();
                this.goForward();
            }
            
            // Ctrl/Cmd + F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.globalSearchInput.focus();
            }
            
            // Ctrl/Cmd + L - Focus address bar
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.navigationInput.focus();
                this.navigationInput.select();
            }
            
            // Escape - Clear focus
            if (e.key === 'Escape') {
                document.activeElement.blur();
            }
        });
    }
    
    initializeResizer() {
        let isResizing = false;
        
        this.resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const containerRect = document.querySelector('.main-container').getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            
            if (newWidth >= 200 && newWidth <= containerRect.width - 200) {
                this.leftPane.style.width = newWidth + 'px';
            }
        };
        
        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
    
    async loadInitialData() {
        try {
            // First verify we can access the window object
            try {
                const result = await this.devToolsAPI.evaluateExpression('typeof window');
                if (result.result !== 'object') {
                    throw new Error('Cannot access window object. Please ensure you are on a valid web page.');
                }
            } catch (error) {
                // Only throw for serious protocol errors
                if (error.message && error.message.includes('Inspector protocol error')) {
                    throw new Error('Cannot access inspected window. Please ensure you are on a valid web page and the page is fully loaded.');
                }
                // For other errors, log but continue - the window might still be accessible
                console.warn('Window access check had an error, but proceeding:', error);
            }

            this.contentView.innerHTML = '<div class="loading-message">Loading root nodes...</div>';
            try {
                await this.treeNavigation.loadRootNodes();
            } catch (error) {
                if (error.message && error.message.includes('Inspector protocol error')) {
                    throw new Error('Failed to load root nodes. Please ensure you are on a valid web page and the page is fully loaded.');
                }
                throw new Error(`Failed to load root nodes: ${error.message}`);
            }

            this.contentView.innerHTML = '<div class="loading-message">Loading initial data...</div>';
            try {
                await this.navigateToPath('window');
            } catch (error) {
                if (error.message && error.message.includes('Inspector protocol error')) {
                    throw new Error('Failed to access window object. Please ensure the page is fully loaded and try refreshing the DevTools panel.');
                }
                throw new Error(`Failed to navigate to window object: ${error.message}`);
            }
        } catch (error) {
            throw error; // Re-throw the error to allow it to propagate naturally
        }
    }
    
    async navigateToPath(path, addToHistory = true) {
        try {
            const validation = PathUtils.validatePath(path);
            if (!validation.isValid) {
                this.showError(`Invalid path: ${validation.reason}`);
                return;
            }
            
            if (addToHistory && path !== this.currentPath) {
                this.addToHistory(this.currentPath);
            }
            
            this.currentPath = path;
            this.pathNavigation.updateAddressDisplay();
            await this.treeNavigation.updateTreeSelection(path);
            
            if (!this.isValidNavigationPath(path)) {
                this.showError('Invalid path: Navigation not allowed for this type of object');
                return;
            }
            
            if (path.length > 8000) {
                this.showError('Path is too long to navigate. Please use a shorter path.');
                return;
            }
            
            const result = await this.evaluateObjectSafely(path);
            this.currentObject = result;
            this.contentRenderer.renderContentView();
            
        } catch (error) {
            let errorMessage = 'Failed to navigate to path';
            
            // Provide more specific error messages based on error type
            if (error.message) {
                if (error.message.includes('Cannot access window object')) {
                    errorMessage = 'Cannot access window object. Please ensure the page is fully loaded.';
                } else if (error.message.includes('Inspector protocol error')) {
                    errorMessage = 'Cannot access inspected window. Please refresh the DevTools panel.';
                } else if (error.message.includes('Invalid path') || 
                           error.message.includes('Failed to create evaluation wrapper')) {
                    errorMessage = error.message;
                }
            }
            
            throw error; // Re-throw the error to allow it to propagate naturally
        }
    }
    
    addToHistory(path) {
        if (this.historyIndex < this.pathHistory.length - 1) {
            this.pathHistory = this.pathHistory.slice(0, this.historyIndex + 1);
        }
        
        this.pathHistory.push(path);
        
        if (this.pathHistory.length > this.maxHistorySize) {
            this.pathHistory.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const path = this.pathHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }
    
    goForward() {
        if (this.historyIndex < this.pathHistory.length - 1) {
            this.historyIndex++;
            const path = this.pathHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }
    
    isValidNavigationPath(path) {
        // Basic validation to prevent navigation to problematic paths
        if (typeof path !== 'string' || path.trim() === '') {
            return false;
        }
        
        // Check for potentially problematic patterns
        const problematicPatterns = [
            /^\s*["']/,  // Starts with quotes (likely a string literal)
            /^\s*\d+\s*$/,  // Pure numbers
            /^\s*(true|false|null|undefined)\s*$/,  // Primitive literals
            /[\r\n]/,  // Contains line breaks
            /[{}]/,  // Contains object literal syntax
            /^\s*function\s*\(/,  // Function definitions
            /^\s*\(/  // Starts with parentheses (likely expression)
        ];
        
        for (const pattern of problematicPatterns) {
            if (pattern.test(path)) {
                return false;
            }
        }
        
        // Path length validation
        if (path.length > 10000) {
            return false;
        }
        
        return true;
    }
    
    async evaluateObjectSafely(path) {
        // First validate the path before creating evaluation wrapper
        const validation = PathUtils.validatePath(path);
        if (!validation.isValid) {
            throw new Error(`Invalid path: ${validation.reason}`);
        }
        
        // Try to create the evaluation wrapper
        let evaluationWrapper;
        try {
            evaluationWrapper = PathUtils.createSafeEvaluationWrapper(path);
        } catch (wrapperError) {
            throw new Error(`Failed to create evaluation wrapper: ${wrapperError.message}`);
        }
        
        // Evaluate the expression
        const result = await this.devToolsAPI.evaluateExpression(evaluationWrapper);

        if (result.exceptionDetails) {
            // Extract the most informative error message from exceptionDetails
            const details = result.exceptionDetails;
            
            // Log the full exception details for debugging
            let errorMsg = details.text || details.description || 
                (details.value && (typeof details.value === 'string' ? details.value : details.value.message)) || 
                details.message || 
                (details.code ? `Protocol code: ${details.code}` : null);
            
            if (errorMsg && errorMsg.includes('Inspector protocol error')) {
                errorMsg = 'Cannot access window object. Please ensure the page is fully loaded.';
            }
            
            if (!errorMsg) {
                try {
                    errorMsg = JSON.stringify(details, null, 2);
                } catch (e) {
                    errorMsg = 'Evaluation failed';
                }
            }
            
            // Create a custom error with additional context
            const error = new Error(errorMsg);
            error.originalException = details;
            error.evaluationPath = path;
            throw error;
        }

        const objInfo = result.result;

        if (!objInfo || !objInfo.exists) {
            throw new Error(objInfo.error || 'Object does not exist or could not be evaluated');
        }

        // If it's a simple value, return it directly
        if (!objInfo.isFunction && !objInfo.isObject) {
            return {
                type: objInfo.type,
                value: objInfo.value
            };
        }

        // For functions, get the source separately
        let source = null;
        if (objInfo.isFunction) {
            try {
                const sourceResult = await this.devToolsAPI.evaluateExpression(`
                    (function() {
                        try {
                            const obj = ${path};
                            return obj.toString();
                        } catch (e) {
                            return '[Function source unavailable]';
                        }
                    })()
                `);
                source = sourceResult.result;
            } catch (e) {
                throw e; // Re-throw the original error
            }
        }

        // Get properties in smaller chunks to avoid string length issues
        const properties = await this.getObjectPropertiesSafely(path);

        return {
            type: objInfo.isFunction ? 'function' : 'object',
            source: source,
            properties: properties
        };
    }
    
    async getObjectPropertiesSafely(path) {
        try {
            // For very long paths, limit the property retrieval
            if (path.length > 3000) {
                return [{
                    name: '[Path too long]',
                    type: 'error',
                    value: 'Path is too long to safely retrieve properties',
                    path: path
                }];
            }
            
            // Create a safe path representation for the evaluation
            const safePath = path.length > 1000 ? 'window' : path;
            const pathForDisplay = path.length > 100 ? path.substring(0, 100) + '...' : path;
            
            // Check for circular references first
            try {
                const circularCheck = await this.devToolsAPI.evaluateExpression(`
                    (function() {
                        try {
                            const obj = ${safePath === 'window' ? `getObjectByPath(window, ${JSON.stringify(path)})` : path};
                            if (obj === null || obj === undefined || typeof obj !== 'object') {
                                return { hasCircular: false };
                            }
                            
                            // Simple circular reference check
                            const seen = new WeakSet();
                            seen.add(obj);
                            let hasCircular = false;
                            
                            // Check first-level properties for circular references
                            for (const key in obj) {
                                try {
                                    const value = obj[key];
                                    if (value && typeof value === 'object') {
                                        if (seen.has(value)) {
                                            hasCircular = true;
                                            break;
                                        }
                                        seen.add(value);
                                    }
                                } catch (e) {
                                    // Skip properties that can't be accessed
                                }
                            }
                            
                            return { hasCircular };
                        } catch (e) {
                            return { hasCircular: false, error: e.message };
                        }
                    })()
                `);
                
                if (circularCheck.result && circularCheck.result.hasCircular) {
                    return [{
                        name: '[Circular Reference Detected]',
                        type: 'warning',
                        value: 'This object contains circular references',
                        path: path,
                        isExpandable: false
                    }];
                }
            } catch (error) {
            }
            
            // Get enumerable properties first
            const pathExpression = safePath === 'window' ? `(
                function() {
                    try {
                        function getObjectByPath(root, path) {
                            if (!path || path === 'window') return root;
                            var parts = path.replace(/^window\.?/, '').split(/\.|\[(?:'|")?|(?:'|")?\]/).filter(Boolean);
                            var obj = root;
                            for (var i = 0; i < parts.length; i++) {
                                if (obj == null) return undefined;
                                var key = parts[i];
                                if (key in obj) {
                                    obj = obj[key];
                                } else {
                                    return undefined;
                                }
                            }
                            return obj;
                        }
                        return getObjectByPath(window, ${JSON.stringify(path)});
                    } catch(e) { return null; }
                })()` : path;
            const enumerableProps = await this.devToolsAPI.evaluateExpression(`
                (function() {
                    try {
                        const obj = ${pathExpression};
                        if (obj === null || obj === undefined) {
                            return [];
                        }
                        
                        const properties = [];
                        const maxProps = 200; // Limit to prevent too large responses
                        let count = 0;
                        const basePath = ${JSON.stringify(pathForDisplay)};
                        
                        for (const key in obj) {
                            if (count >= maxProps) break;
                            count++;
                            
                            try {
                                const value = obj[key];
                                const type = typeof value;
                                const safePropPath = PathUtils.constructSafePath(basePath, key);
                                const info = PropertyPreviewUtils.generatePropertyInfo(key, value, safePropPath);
                                properties.push(info);
                            } catch (e) {
                                properties.push({
                                    name: key,
                                    type: 'error',
                                    value: '[Error accessing property]',
                                    path: basePath + '[' + JSON.stringify(key) + ']'
                                });
                            }
                        }
                        
                        return properties;
                    } catch (e) {
                        return [];
                    }
                })()
            `);
            
            let allProperties = enumerableProps.result || [];
            
            // Get own properties (non-enumerable) in a separate call
            try {
                const ownProps = await this.devToolsAPI.evaluateExpression(`
                    (function() {
                        try {
                            const obj = ${pathExpression};
                            if (obj === null || obj === undefined) {
                                return [];
                            }
                            
                            const properties = [];
                            const seen = new Set(${JSON.stringify(allProperties.map(p => p.name))});
                            const maxProps = 100; // Limit additional properties
                            let count = 0;
                            const basePath = ${JSON.stringify(pathForDisplay)};
                            
                            const ownPropNames = Object.getOwnPropertyNames(obj);
                            for (const key of ownPropNames) {
                                if (seen.has(key) || count >= maxProps) continue;
                                count++;
                                
                                try {
                                    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                                    if (descriptor && 'value' in descriptor) {
                                        const value = descriptor.value;
                                        const safePropPath = PathUtils.constructSafePath(basePath, key);
                                        const info = PropertyPreviewUtils.generatePropertyInfo(key, value, safePropPath);
                                        properties.push(info);
                                    }
                                } catch (e) {
                                    properties.push({
                                        name: key,
                                        type: 'error',
                                        value: '[Error accessing property]',
                                        path: basePath + '[' + JSON.stringify(key) + ']'
                                    });
                                }
                            }
                            
                            return properties;
                        } catch (e) {
                            return [];
                        }
                    })()
                `);
                
                allProperties = allProperties.concat(ownProps.result || []);
            } catch (e) {
                // If getting own properties fails, continue with enumerable properties

            }
            
            // Sort and return
            return allProperties.sort((a, b) => a.name.localeCompare(b.name));
            
        } catch (error) {
            if (error.message && error.message.includes('Inspector protocol error')) {
                
                // Format protocol errors using the dedicated method if available
                if (error.message.includes('Object reference chain is too long')) {
                    return await this.getObjectPropertiesSafelyWithReducedDepth(path);
                } else if (error.message.includes('Invalid string length')) {
                    const currentMax = this.constructor.MAX_PROPERTIES || 200;
                    this.constructor.MAX_PROPERTIES = Math.max(50, currentMax / 2);
                    return await this.getObjectPropertiesSafely(path);
                }
                throw error; // Re-throw the original error
            }
            
            // Return a more informative error property
            return [{
                name: '[Error]',
                type: 'error',
                value: error.message || 'Failed to retrieve object properties',
                path: path
            }];
        }
    }
    
    /**
     * Get object properties with reduced depth to avoid protocol errors
     * @param {string} path - The path to the object
     * @returns {Array} Array of property information objects
     */
    async getObjectPropertiesSafelyWithReducedDepth(path) {
        try {
            // Use a more conservative approach to get properties
            const pathForDisplay = path;
            const pathExpression = PathUtils.createSafeEvaluationWrapper(path);
            
            // Use a simplified approach with fewer properties and less depth
            const props = await this.devToolsAPI.evaluateExpression(`
                (function() {
                    try {
                        const obj = ${pathExpression};
                        if (obj === null || obj === undefined) {
                            return [];
                        }
                        
                        const properties = [];
                        const maxProps = 50; // Significantly reduced limit
                        let count = 0;
                        const basePath = ${JSON.stringify(pathForDisplay)};
                        
                        // Only get direct enumerable properties
                        for (const key in obj) {
                            if (count >= maxProps) break;
                            count++;
                            
                            try {
                                // Don't access the actual value, just report the property exists
                                const type = typeof obj[key];
                                const safePropPath = PathUtils.constructSafePath(basePath, key);
                                
                                properties.push({
                                    name: key,
                                    type: type,
                                    value: type === 'object' ? '[Object]' : 
                                           type === 'function' ? '[Function]' : 
                                           '[' + type.charAt(0).toUpperCase() + type.slice(1) + ']',
                                    path: safePropPath,
                                    isExpandable: type === 'object' || type === 'function',
                                    isEnumerable: true
                                });
                            } catch (e) {
                                properties.push({
                                    name: key,
                                    type: 'error',
                                    value: '[Error accessing property]',
                                    path: basePath + '[' + JSON.stringify(key) + ']',
                                    isExpandable: false
                                });
                            }
                        }
                        
                        return properties;
                    } catch (e) {
                        return [];
                    }
                })()
            `);
            
            const allProperties = props.result || [];
            
            // Add a note about the limited view
            allProperties.unshift({
                name: '[Limited View]',
                type: 'info',
                value: 'Showing limited properties to avoid protocol errors. Some properties may be hidden.',
                path: path,
                isExpandable: false
            });
            
            return allProperties.sort((a, b) => {
                // Keep the info message at the top
                if (a.type === 'info') return -1;
                if (b.type === 'info') return 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {

            return [{
                name: '[Error]',
                type: 'error',
                value: 'Failed to retrieve object properties even with reduced depth',
                path: path
            }];
        }
    }
    
    /**
     * Display an error message in the content view
     * @param {string|object} error - The error message or error object to display
     */
    showError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        let message = '';
        let details = '';
        let suggestion = '';
        let fixApplied = false;
        
        // Handle different error formats
        if (typeof error === 'string') {
            message = error;
        } else if (error && typeof error === 'object') {
            message = error.message || 'Unknown error';
            details = error.details || '';
            suggestion = error.suggestion || '';
            fixApplied = error.fixApplied || false;
        } else {
            message = 'Unknown error';
        }
        
        // Create the error message content
        let errorContent = message;
        
        // Add details if available
        if (details) {
            errorContent += '\n\nDetails: ' + details;
        }
        
        // Add suggestion if available
        if (suggestion) {
            errorContent += '\n\nSuggestion: ' + suggestion;
        }
        
        // Add fix applied message if applicable
        if (fixApplied) {
            errorContent += '\n\n✓ An automatic fix has been applied. Please try again.';
        }
        
        // Handle multiline error messages by converting newlines to <br> tags
        if (errorContent.includes('\n')) {
            // Safely escape HTML to prevent XSS, then convert newlines to <br>
            const escapedMessage = errorContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\n/g, '<br>');
            
            errorDiv.innerHTML = escapedMessage;
        } else {
            errorDiv.textContent = errorContent;
        }
        
        // Apply special styling if a fix was applied
        if (fixApplied) {
            errorDiv.classList.add('fix-applied');
        }
        
        this.contentView.innerHTML = '';
        this.contentView.appendChild(errorDiv);
        

    }
    
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        
        // Handle multiline success messages by converting newlines to <br> tags
        if (message.includes('\n')) {
            // Safely escape HTML to prevent XSS, then convert newlines to <br>
            const escapedMessage = message
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\n/g, '<br>');
            
            successDiv.innerHTML = escapedMessage;
        } else {
            successDiv.textContent = message;
        }
        
        // Create a container for the success message
        const successContainer = document.createElement('div');
        successContainer.className = 'notification-container';
        successContainer.appendChild(successDiv);
        
        // Add to the DOM
        document.body.appendChild(successContainer);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successContainer && successContainer.parentNode) {
                successContainer.parentNode.removeChild(successContainer);
            }
        }, 3000);
        

    }
}

// Initialize the JavaScript Explorer when the panel loads
document.addEventListener('DOMContentLoaded', () => {
    new JavaScriptExplorer();
});