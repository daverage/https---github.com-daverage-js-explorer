/**
 * Property Preview Utilities
 * Centralized logic for generating consistent property previews across the application
 * Eliminates code duplication between JavaScriptExplorer, GlobalSearch, and TreeNavigation
 */

export class PropertyPreviewUtils {
    /**
     * Generate a preview string for any JavaScript value
     * @param {*} value - The value to preview
     * @param {Object} options - Preview options
     * @param {number} options.maxLength - Maximum preview length (default: 50)
     * @param {boolean} options.includeQuotes - Include quotes for strings (default: true)
     * @param {boolean} options.showFunctionName - Show function names (default: true)
     * @returns {string} Formatted preview string
     */
    static generatePreview(value, options = {}) {
        const {
            maxLength = 50,
            includeQuotes = true,
            showFunctionName = true
        } = options;

        try {
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';

            const type = typeof value;

            switch (type) {
                case 'string':
                    return this.formatStringPreview(value, maxLength, includeQuotes);
                
                case 'number':
                case 'boolean':
                case 'bigint':
                    return String(value);
                
                case 'symbol':
                    return value.toString();
                
                case 'function':
                    return this.formatFunctionPreview(value, showFunctionName);
                
                case 'object':
                    return this.formatObjectPreview(value, maxLength);
                
                default:
                    return `[${type}]`;
            }
        } catch (error) {
            return '[Error accessing value]';
        }
    }

    /**
     * Format string values with proper truncation and escaping
     */
    static formatStringPreview(value, maxLength, includeQuotes) {
        let preview = value;
        
        // Handle very long strings
        if (preview.length > maxLength) {
            preview = preview.substring(0, maxLength) + '...';
        }
        
        // Escape special characters for display
        preview = preview
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/"/g, '\\"');
        
        return includeQuotes ? `"${preview}"` : preview;
    }

    /**
     * Format function values with name and signature info
     */
    static formatFunctionPreview(value, showFunctionName) {
        try {
            const name = value.name || 'anonymous';
            
            if (!showFunctionName) {
                return 'ƒ';
            }
            
            // Try to get parameter info
            const funcStr = value.toString();
            const paramMatch = funcStr.match(/^(?:async\s+)?function[^(]*\(([^)]*)\)/);
            
            if (paramMatch) {
                const params = paramMatch[1].trim();
                const paramCount = params ? params.split(',').length : 0;
                return `ƒ ${name}(${paramCount > 0 ? `${paramCount} params` : ''})`;
            }
            
            return `ƒ ${name}`;
        } catch (error) {
            return 'ƒ [Function]';
        }
    }

    /**
     * Format object values with type and size information
     */
    static formatObjectPreview(value, maxLength) {
        try {
            if (Array.isArray(value)) {
                const length = value.length;
                const preview = length <= 3 
                    ? `[${value.slice(0, 3).map(v => this.generatePreview(v, { maxLength: 10, includeQuotes: false })).join(', ')}]`
                    : `[Array(${length})]`;
                return preview.length > maxLength ? `[Array(${length})]` : preview;
            }
            
            if (value instanceof Date) {
                return `[Date: ${value.toISOString().split('T')[0]}]`;
            }
            
            if (value instanceof RegExp) {
                return `[RegExp: ${value.toString()}]`;
            }
            
            if (value instanceof Error) {
                return `[${value.constructor.name}: ${value.message}]`;
            }
            
            if (value.constructor && value.constructor.name !== 'Object') {
                return `[${value.constructor.name}]`;
            }
            
            // Generic object - show key count
            try {
                const keys = Object.keys(value);
                const keyCount = keys.length;
                
                if (keyCount === 0) {
                    return '{}';
                }
                
                if (keyCount <= 2) {
                    const preview = keys.slice(0, 2)
                        .map(key => `${key}: ${this.generatePreview(value[key], { maxLength: 10, includeQuotes: false })}`)
                        .join(', ');
                    const result = `{${preview}}`;
                    return result.length > maxLength ? `{${keyCount} keys}` : result;
                }
                
                return `{${keyCount} keys}`;
            } catch (error) {
                return '[Object]';
            }
        } catch (error) {
            return '[Object]';
        }
    }

    /**
     * Get the display type for a value (more descriptive than typeof)
     */
    static getDisplayType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        const type = typeof value;
        
        if (type === 'object') {
            if (Array.isArray(value)) return 'array';
            if (value instanceof Date) return 'date';
            if (value instanceof RegExp) return 'regexp';
            if (value instanceof Error) return 'error';
            if (value.constructor && value.constructor.name !== 'Object') {
                return value.constructor.name.toLowerCase();
            }
            return 'object';
        }
        
        return type;
    }

    /**
     * Generate property info object with consistent structure
     */
    static generatePropertyInfo(name, value, path, options = {}) {
        const type = this.getDisplayType(value);
        const preview = this.generatePreview(value, options);
        
        return {
            name: String(name),
            type: type,
            value: preview,
            path: path,
            isExpandable: this.isExpandable(value),
            isEnumerable: this.isEnumerable(value, name),
            descriptor: this.getPropertyDescriptor(value, name)
        };
    }

    /**
     * Check if a value can be expanded (has properties to explore)
     */
    static isExpandable(value) {
        if (value === null || value === undefined) return false;
        
        const type = typeof value;
        if (type === 'function') return true;
        if (type === 'object') {
            try {
                // Check if object has any enumerable or own properties
                return Object.getOwnPropertyNames(value).length > 0 || 
                       Object.keys(value).length > 0;
            } catch (error) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * Check if a property is enumerable
     */
    static isEnumerable(obj, propertyName) {
        try {
            return obj.propertyIsEnumerable(propertyName);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get property descriptor information
     */
    static getPropertyDescriptor(obj, propertyName) {
        try {
            return Object.getOwnPropertyDescriptor(obj, propertyName) || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Batch process multiple properties for better performance
     */
    static generateMultiplePropertyInfo(obj, propertyNames, basePath, options = {}) {
        const results = [];
        const maxProperties = options.maxProperties || 1000;
        
        for (let i = 0; i < Math.min(propertyNames.length, maxProperties); i++) {
            const name = propertyNames[i];
            try {
                const value = obj[name];
                const path = this.constructSafePath(basePath, name);
                const info = this.generatePropertyInfo(name, value, path, options);
                results.push(info);
            } catch (error) {
                results.push({
                    name: String(name),
                    type: 'error',
                    value: '[Error accessing property]',
                    path: this.constructSafePath(basePath, name),
                    isExpandable: false,
                    isEnumerable: false,
                    descriptor: {}
                });
            }
        }
        
        return results;
    }

    /**
     * Safely construct property paths
     */
    static constructSafePath(basePath, propertyName) {
        // Handle array indices
        if (typeof propertyName === 'number' || /^\d+$/.test(propertyName)) {
            return `${basePath}[${propertyName}]`;
        }
        
        // Handle valid identifiers
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propertyName)) {
            return `${basePath}.${propertyName}`;
        }
        
        // Handle special characters with bracket notation
        return `${basePath}[${JSON.stringify(propertyName)}]`;
    }
}