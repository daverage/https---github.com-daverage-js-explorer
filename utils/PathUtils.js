/**
 * Path Utilities
 * Centralized logic for JavaScript object path construction, validation, and manipulation
 * Eliminates duplication and provides consistent path handling across the application
 */

export class PathUtils {
    // Maximum safe path length to prevent browser issues
    static MAX_SAFE_PATH_LENGTH = 8000;
    
    // Maximum evaluation depth to prevent infinite recursion
    static MAX_EVALUATION_DEPTH = 50;

    /**
     * Validate if a path is safe for navigation
     * @param {string} path - The path to validate
     * @returns {Object} Validation result with isValid and reason
     */
    static validatePath(path) {
        if (typeof path !== 'string') {
            return { isValid: false, reason: 'Path must be a string' };
        }

        if (path.trim() === '') {
            return { isValid: false, reason: 'Path cannot be empty' };
        }

        if (path.length > this.MAX_SAFE_PATH_LENGTH) {
            return { isValid: false, reason: 'Path is too long for safe evaluation' };
        }

        // Check for potentially problematic patterns
        const problematicPatterns = [
            { pattern: /^\s*["']/, reason: 'Path cannot start with quotes (string literal)' },
            { pattern: /^\s*\d+\s*$/, reason: 'Path cannot be a pure number' },
            { pattern: /^\s*(true|false|null|undefined)\s*$/i, reason: 'Path cannot be a primitive literal' },
            { pattern: /[\r\n]/, reason: 'Path cannot contain line breaks' },
            { pattern: /[{}]/, reason: 'Path cannot contain object literal syntax' },
            { pattern: /^\s*function\s*\(/, reason: 'Path cannot be a function definition' },
            { pattern: /^\s*\(/, reason: 'Path cannot start with parentheses' },
            { pattern: /;/, reason: 'Path cannot contain semicolons' },
            { pattern: /\/\*|\*\/|\/\//, reason: 'Path cannot contain comments' }
        ];

        for (const { pattern, reason } of problematicPatterns) {
            if (pattern.test(path)) {
                return { isValid: false, reason };
            }
        }

        return { isValid: true, reason: null };
    }

    /**
     * Safely construct a property path
     * @param {string} basePath - The base path
     * @param {string|number} propertyName - The property name to append
     * @returns {string} The constructed path
     */
    static constructPath(basePath, propertyName) {
        if (!basePath) {
            return String(propertyName);
        }

        const propStr = String(propertyName);
        
        // Handle array indices
        if (typeof propertyName === 'number' || /^\d+$/.test(propStr)) {
            return `${basePath}[${propertyName}]`;
        }
        
        // Handle valid JavaScript identifiers
        if (this.isValidIdentifier(propStr)) {
            return `${basePath}.${propStr}`;
        }
        
        // Handle special characters with bracket notation
        return `${basePath}[${JSON.stringify(propStr)}]`;
    }

    /**
     * Check if a string is a valid JavaScript identifier
     * @param {string} str - The string to check
     * @returns {boolean} True if valid identifier
     */
    static isValidIdentifier(str) {
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) && !this.isReservedWord(str);
    }

    /**
     * Check if a string is a JavaScript reserved word
     * @param {string} str - The string to check
     * @returns {boolean} True if reserved word
     */
    static isReservedWord(str) {
        const reservedWords = [
            'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
            'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
            'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
            'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
            'var', 'void', 'while', 'with', 'yield', 'let', 'static',
            'enum', 'implements', 'interface', 'package', 'private',
            'protected', 'public', 'await', 'async'
        ];
        return reservedWords.includes(str);
    }

    /**
     * Parse a path into segments
     * @param {string} path - The path to parse
     * @returns {Array} Array of path segments
     */
    static parsePathSegments(path) {
        if (!path || typeof path !== 'string') {
            return [];
        }

        const segments = [];
        let current = '';
        let inBrackets = false;
        let inQuotes = false;
        let quoteChar = '';
        let i = 0;

        while (i < path.length) {
            const char = path[i];
            const nextChar = path[i + 1];

            if (!inQuotes && !inBrackets && char === '.') {
                if (current) {
                    segments.push(current);
                    current = '';
                }
            } else if (!inQuotes && char === '[') {
                if (current) {
                    segments.push(current);
                    current = '';
                }
                inBrackets = true;
            } else if (!inQuotes && char === ']' && inBrackets) {
                if (current) {
                    // Try to parse as number if it looks like one
                    const asNumber = Number(current);
                    if (!isNaN(asNumber) && isFinite(asNumber) && String(asNumber) === current) {
                        segments.push(asNumber);
                    } else {
                        segments.push(current);
                    }
                    current = '';
                }
                inBrackets = false;
            } else if (inBrackets && !inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
            } else if (inQuotes && char === quoteChar && path[i - 1] !== '\\') {
                inQuotes = false;
                quoteChar = '';
            } else if (char !== ' ' || inQuotes) {
                current += char;
            }

            i++;
        }

        if (current) {
            segments.push(current);
        }

        return segments;
    }

    /**
     * Reconstruct a path from segments
     * @param {Array} segments - Array of path segments
     * @returns {string} The reconstructed path
     */
    static reconstructPath(segments) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return '';
        }

        let path = String(segments[0]);
        
        for (let i = 1; i < segments.length; i++) {
            path = this.constructPath(path, segments[i]);
        }

        return path;
    }

    /**
     * Creates a safe evaluation wrapper for a given JavaScript path.
     * This wrapper evaluates the path within a try-catch block and returns
     * structured information about the object (type, existence, properties).
     * @param {string} path - The JavaScript path to evaluate (e.g., 'window.location').
     * @returns {string} A JavaScript expression string that can be evaluated safely.
     */
    static createSafeEvaluationWrapper(path) {
        // Basic validation to prevent immediate syntax errors
        const validation = PathUtils.validatePath(path);
        if (!validation.isValid) {
            return `(function() { return { exists: false, error: 'Invalid path: ${validation.reason}' }; })()`;
        }

        return `
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
                    // Capture more detailed error information
                    const errorDetails = {
                        exists: false, 
                        error: e.message || 'Unknown error',
                        errorType: e.constructor.name || 'Error',
                        path: ${JSON.stringify(path)}
                    };
                    
                    // Add additional context for common errors
                    if (e.message && e.message.includes('not defined')) {
                        errorDetails.suggestion = 'The object or property may not exist in the current context';
                    } else if (e.message && e.message.includes('Cannot read property')) {
                        errorDetails.suggestion = 'The object may be null or undefined';
                    }
                    

                    return errorDetails;
                }
            })()
        `;
    }

    /**
     * Get the parent path of a given path
     * @param {string} path - The path to get parent of
     * @returns {string|null} The parent path or null if no parent
     */
    static getParentPath(path) {
        const segments = this.parsePathSegments(path);
        if (segments.length <= 1) {
            return null;
        }
        return this.reconstructPath(segments.slice(0, -1));
    }

    /**
     * Get the last segment of a path
     * @param {string} path - The path to get last segment of
     * @returns {string|null} The last segment or null if empty path
     */
    static getLastSegment(path) {
        const segments = this.parsePathSegments(path);
        return segments.length > 0 ? segments[segments.length - 1] : null;
    }

    /**
     * Check if one path is a child of another
     * @param {string} parentPath - The potential parent path
     * @param {string} childPath - The potential child path
     * @returns {boolean} True if childPath is a child of parentPath
     */
    static isChildPath(parentPath, childPath) {
        if (!parentPath || !childPath) return false;
        
        const parentSegments = this.parsePathSegments(parentPath);
        const childSegments = this.parsePathSegments(childPath);
        
        if (childSegments.length <= parentSegments.length) return false;
        
        for (let i = 0; i < parentSegments.length; i++) {
            if (parentSegments[i] !== childSegments[i]) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Normalize a path by removing redundant segments
     * @param {string} path - The path to normalize
     * @returns {string} The normalized path
     */
    static normalizePath(path) {
        const segments = this.parsePathSegments(path);
        const normalized = [];
        
        for (const segment of segments) {
            if (segment && segment !== '.') {
                normalized.push(segment);
            }
        }
        
        return this.reconstructPath(normalized);
    }

    /**
     * Create a safe evaluation wrapper for a path
     * @param {string} path - The path to wrap
     * @returns {string} Safe evaluation code
     */
    static createSafeEvaluationWrapper(path) {
        const validation = this.validatePath(path);
        if (!validation.isValid) {
            throw new Error(`Invalid path: ${validation.reason}`);
        }

        return `
            (function() {
                try {
                    const result = ${path};
                    return { success: true, result: result };
                } catch (error) {
                    // Capture more detailed error information
                    let errorDetails = {
                        success: false,
                        error: error.message || 'Unknown error',
                        type: error.constructor.name || 'Error',
                        stack: error.stack || null,
                        path: ${JSON.stringify(path)}
                    };
                    
                    // Add additional context for common errors
                    if (error.message && error.message.includes('not defined')) {
                        errorDetails.suggestion = 'The object or property may not exist in the current context';
                    } else if (error.message && error.message.includes('Cannot read property')) {
                        errorDetails.suggestion = 'The object may be null or undefined';
                    }
                    

                    return errorDetails;
                }
            })()
        `;
    }

    /**
     * Extract the base object path from a complex path
     * @param {string} path - The full path
     * @param {number} maxLength - Maximum length for base path
     * @returns {string} The base path that's safe to evaluate
     */
    static extractBasePath(path, maxLength = 1000) {
        if (path.length <= maxLength) {
            return path;
        }

        const segments = this.parsePathSegments(path);
        let basePath = '';
        
        for (const segment of segments) {
            const testPath = this.constructPath(basePath, segment);
            if (testPath.length > maxLength) {
                break;
            }
            basePath = testPath;
        }
        
        return basePath || 'window';
    }

    /**
     * Generate breadcrumb data from a path
     * @param {string} path - The path to generate breadcrumbs for
     * @returns {Array} Array of breadcrumb objects
     */
    static generateBreadcrumbs(path) {
        const segments = this.parsePathSegments(path);
        const breadcrumbs = [];
        
        let currentPath = '';
        
        for (let i = 0; i < segments.length; i++) {
            currentPath = i === 0 ? String(segments[i]) : this.constructPath(currentPath, segments[i]);
            
            breadcrumbs.push({
                segment: String(segments[i]),
                path: currentPath,
                isLast: i === segments.length - 1
            });
        }
        
        return breadcrumbs;
    }
    
    /**
     * Safely construct a property path with proper escaping
     * @param {string} basePath - The base path
     * @param {string|number} propertyName - The property name to append
     * @returns {string} The constructed safe path
     */
    static constructSafePath(basePath, propertyName) {
        if (!basePath) {
            return String(propertyName);
        }
        
        // Handle array indices
        if (typeof propertyName === 'number' || /^\d+$/.test(propertyName)) {
            return `${basePath}[${propertyName}]`;
        }
        
        // Handle valid JavaScript identifiers
        if (this.isValidIdentifier(propertyName)) {
            return `${basePath}.${propertyName}`;
        }
        
        // Handle special characters with bracket notation and proper escaping
        return `${basePath}[${JSON.stringify(propertyName)}]`;
    }
}