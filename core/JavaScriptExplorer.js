/**
 * JavaScript Explorer - Main Class
 * Coordinates all modules and manages the overall application state
 */

import { TreeNavigation } from '../navigation/TreeNavigation.js';
import { PathNavigation } from '../navigation/PathNavigation.js';
import { GlobalSearch } from '../search/GlobalSearch.js';
import { AutoComplete } from '../search/AutoComplete.js';
import { ContentRenderer } from '../ui/ContentRenderer.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import { DevToolsAPI } from '../utils/DevToolsAPI.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class JavaScriptExplorer {
    constructor() {
        this.currentPath = 'window';
        this.currentObject = null;
        this.selectedNode = null;
        
        this.initializeElements();
        this.initializeModules();
        this.initializeEventListeners();
        this.initializeResizer();
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
        this.devToolsAPI = new DevToolsAPI();
        this.errorHandler = new ErrorHandler(this);
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
            await this.treeNavigation.loadRootNodes();
            await this.navigateToPath('window');
        } catch (error) {
            this.showError('Failed to load initial data: ' + this.errorHandler.formatInspectorError(error));
        }
    }
    
    async navigateToPath(path) {
        try {
            this.currentPath = path;
            this.pathNavigation.updateAddressDisplay();
            
            // Update tree selection to reflect current path
            await this.treeNavigation.updateTreeSelection(path);
            
            // Validate path before attempting navigation
            if (!this.isValidNavigationPath(path)) {
                this.showError('Invalid path: Navigation not allowed for this type of object');
                return;
            }
            
            // Check if path is too long and might cause "Invalid string length" error
            if (path.length > 8000) {
                this.showError('Path is too long to navigate. Please use a shorter path.');
                return;
            }
            
            // Use a more efficient approach by splitting the evaluation
            const result = await this.evaluateObjectSafely(path);
            
            this.currentObject = result;
            this.contentRenderer.renderContentView();
            
        } catch (error) {
            this.showError('Failed to navigate to path: ' + this.errorHandler.formatInspectorError(error));
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
        try {
            // For very long paths, use a different approach
            if (path.length > 5000) {
                // Try to evaluate just the existence first with a simpler approach
                try {
                    const simpleCheck = await this.devToolsAPI.evaluateExpression(`typeof (${path.substring(0, 100)}...)`);
                    throw new Error('Path too long for safe evaluation');
                } catch (e) {
                    throw new Error('Path is too complex or long to navigate safely');
                }
            }
            
            // First, check if the object exists and get its basic type
            const basicInfo = await this.devToolsAPI.evaluateExpression(`
                (function() {
                    try {
                        const obj = ${path};
                        const type = typeof obj;
                        
                        if (obj === null) return { type: 'null', value: null, exists: true };
                        if (obj === undefined) return { type: 'undefined', value: undefined, exists: true };
                        
                        return { 
                            type: type, 
                            value: type === 'function' ? 'function' : type === 'object' ? 'object' : obj,
                            exists: true,
                            isFunction: type === 'function',
                            isObject: type === 'object'
                        };
                    } catch (e) {
                        return { exists: false, error: e.message };
                    }
                })()
            `);
            
            if (!basicInfo.result.exists) {
                throw new Error(basicInfo.result.error || 'Object does not exist');
            }
            
            const objInfo = basicInfo.result;
            
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
                    source = '[Function source unavailable]';
                }
            }
            
            // Get properties in smaller chunks to avoid string length issues
            const properties = await this.getObjectPropertiesSafely(path);
            
            return {
                type: objInfo.isFunction ? 'function' : 'object',
                source: source,
                properties: properties
            };
            
        } catch (error) {
            throw error;
        }
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
            
            // Get enumerable properties first
            const pathExpression = safePath === 'window' ? `(function() { try { return eval(${JSON.stringify(path)}); } catch(e) { return null; } })()` : path;
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
                                let preview = '';
                                
                                if (value === null) preview = 'null';
                                else if (value === undefined) preview = 'undefined';
                                else if (type === 'string') {
                                    const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
                                    preview = JSON.stringify(truncated);
                                }
                                else if (type === 'number' || type === 'boolean') preview = String(value);
                                else if (type === 'function') preview = 'ƒ ' + (value.name || 'anonymous');
                                else if (type === 'object') {
                                    if (Array.isArray(value)) preview = '[Array(' + value.length + ')]';
                                    else if (value.constructor) preview = '[' + value.constructor.name + ']';
                                    else preview = '[Object]';
                                }
                                else preview = '[' + type + ']';
                                
                                // Safely construct the property path
                                const safePropPath = basePath + '[' + JSON.stringify(key) + ']';
                                
                                properties.push({
                                    name: key,
                                    type: type,
                                    value: preview,
                                    path: safePropPath
                                });
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
                                        const type = typeof value;
                                        let preview = '';
                                        
                                        if (value === null) preview = 'null';
                                        else if (value === undefined) preview = 'undefined';
                                        else if (type === 'string') {
                                            const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
                                            preview = JSON.stringify(truncated);
                                        }
                                        else if (type === 'number' || type === 'boolean') preview = String(value);
                                        else if (type === 'function') preview = 'ƒ ' + (value.name || 'anonymous');
                                        else if (type === 'object') {
                                            if (Array.isArray(value)) preview = '[Array(' + value.length + ')]';
                                            else if (value.constructor) preview = '[' + value.constructor.name + ']';
                                            else preview = '[Object]';
                                        }
                                        else preview = '[' + type + ']';
                                        
                                        // Safely construct the property path
                                        const safePropPath = basePath + '[' + JSON.stringify(key) + ']';
                                        
                                        properties.push({
                                            name: key,
                                            type: type,
                                            value: preview,
                                            path: safePropPath
                                        });
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
                console.warn('Failed to get own properties:', e);
            }
            
            // Sort and return
            return allProperties.sort((a, b) => a.name.localeCompare(b.name));
            
        } catch (error) {
            console.error('Error getting properties:', error);
            return [];
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        this.contentView.innerHTML = '';
        this.contentView.appendChild(errorDiv);
        
        console.error('JavaScript Explorer Error:', message);
    }
    
    showSuccess(message) {
        // Simple success notification - could be enhanced with a toast system
        console.log('JavaScript Explorer Success:', message);
    }
}

// Initialize the JavaScript Explorer when the panel loads
document.addEventListener('DOMContentLoaded', () => {
    new JavaScriptExplorer();
});