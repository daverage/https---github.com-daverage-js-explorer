/**
 * Global Search Module
 * Handles searching across JavaScript objects with various scopes and filters
 * Enhanced with optimized property preview generation and better performance
 */

import { PropertyPreviewUtils } from '../utils/PropertyPreviewUtils.js';
import { PathUtils } from '../utils/PathUtils.js';


export class GlobalSearch {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    performSearch(query, scope = 'global') {
        if (this.explorer && this.explorer.contentTitle) {
            this.explorer.contentTitle.textContent = 'Search Results';
        }
        if (this.explorer && this.explorer.contentContainer) {
             this.explorer.contentContainer.innerHTML = '<div class="loading-message">Searching...</div>';
         }
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            // First validate the query
            this.parseSearchQuery(query);
            this.executeGlobalSearch(query, scope);
        }, 10);
    }
    
    async executeGlobalSearch(query, scope, maxDepth = 99) {
        const searchTerms = this.parseSearchQuery(query);
        const currentPath = this.explorer.currentPath || 'window';
        
        // Validate search terms to prevent syntax errors
        if (!searchTerms || searchTerms.length === 0) {
            throw new Error('Invalid search query');
        }

        const searchCode = `
            (function() {
                const results = [];
                const visited = new WeakSet();
                
                function matchesQuery(name, value, type, searchTerms) {
                    const nameStr = String(name).toLowerCase();
                    const valueStr = String(value).toLowerCase();
                    const typeStr = String(type).toLowerCase();
                    
                    return searchTerms.every(term => {
                        if (term.operator === 'AND') {
                            return term.patterns.every(pattern => 
                                matchesPattern(nameStr, pattern) || 
                                matchesPattern(valueStr, pattern) || 
                                matchesPattern(typeStr, pattern)
                            );
                        } else if (term.operator === 'OR') {
                            return term.patterns.some(pattern => 
                                matchesPattern(nameStr, pattern) || 
                                matchesPattern(valueStr, pattern) || 
                                matchesPattern(typeStr, pattern)
                            );
                        } else {
                            return matchesPattern(nameStr, term.pattern) || 
                                   matchesPattern(valueStr, term.pattern) || 
                                   matchesPattern(typeStr, term.pattern);
                        }
                    });
                }
                
                function matchesPattern(str, pattern) {
                    if (pattern.includes('*') || pattern.includes('?')) {
                        const escapedPattern = pattern.replace(/[.+^\${}()|[\]\\]/g, '\\$&');
                        const regexPattern = escapedPattern
                            .replace(/\\\*/g, '.*')
                            .replace(/\\\?/g, '.');
                        return new RegExp(regexPattern, 'i').test(str);
                    }
                    return str.includes(pattern);
                }
                
                function searchObject(obj, path, maxDepth = ${maxDepth}, currentDepth = 0) {
                    if (currentDepth >= maxDepth || !obj || visited.has(obj)) return;
                    
                    try {
                        visited.add(obj);
                        
                        const keys = Object.getOwnPropertyNames(obj);
                        for (const key of keys) {
                            try {
                                const value = obj[key];
                                const type = typeof value;
                                const fullPath = path + '[' + JSON.stringify(key) + ']';
                                
                                if (matchesQuery(key, value, type, ${JSON.stringify(searchTerms)})) {
                                    results.push({
                                        name: key,
                                        path: fullPath,
                                        type: type,
                                        value: value, // Store actual value
                                        preview: PropertyPreviewUtils.generatePreview(value) // Generate preview using utility
                                    });
                                }
                                
                                if ((type === 'object' && value !== null) || type === 'function') {
                                    searchObject(value, fullPath, maxDepth, currentDepth + 1);
                                }
                            } catch (e) {
                                throw e; // Propagate property access errors
                            }
                        }
                    } catch (e) {
                        throw e; // Propagate enumeration errors
                    }
                }
                
                // Determine search scope
                const scope = ${JSON.stringify(scope)};
                if (scope === 'global') {
                    searchObject(window, 'window');
                } else if (scope === 'dom') {
                    searchObject(document, 'document');
                } else {
                    // Current object scope
                    try {
                        // Replace eval with safe property traversal
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
                        const currentObj = getObjectByPath(window, ${JSON.stringify(currentPath)});
                        searchObject(currentObj, ${JSON.stringify(currentPath)});
                    } catch (e) {
                        // Fallback to window if current path evaluation fails
                        searchObject(window, 'window');
                    }
                }
                
                // Sort results to show variety of types
                results.sort((a, b) => {
                    // Prioritize non-function types for better diversity
                    if (a.type !== 'function' && b.type === 'function') return -1;
                    if (a.type === 'function' && b.type !== 'function') return 1;
                    
                    // Then sort by type
                    if (a.type !== b.type) return a.type.localeCompare(b.type);
                    
                    // Finally sort by name
                    return a.name.localeCompare(b.name);
                });
                
                return results.slice(0, 100); // Limit results
            })()
        `;
        
        const result = await this.explorer.devToolsAPI.evaluateExpression(searchCode);
        const searchResults = result.result || [];

        // Format search results for ContentRenderer
        const formattedResults = searchResults.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            value: item.preview, // Use the generated preview for display
            actualValue: item.value, // Keep actual value for expandability check
            isExpandable: PropertyPreviewUtils.isExpandable(item.value) 
        }));

        // Display results using ContentRenderer
        if (this.explorer && this.explorer.contentContainer) {
            this.explorer.contentContainer.innerHTML = ''; // Clear loading message
            if (formattedResults.length > 0) {
                const table = this.explorer.contentRenderer.createPropertiesTable(formattedResults);
                this.explorer.contentContainer.appendChild(table);
            } else {
                this.explorer.contentContainer.innerHTML = '<div class="loading-message">No results found.</div>';
            }
        }

        return formattedResults; // Return formatted results
    }
    
    parseSearchQuery(query) {
        if (!query || typeof query !== 'string' || query.trim() === '') {
            throw new Error('Search query must be a non-empty string');
        }
        
        // Relax validation: allow brackets but still block control chars and comments
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Control characters
            /\/\*.*\*\//, // Block comments
            /\/\/.*\n/, // Line comments
            /['"`]\s*\+/ // String concatenation
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(query)) {
                throw new Error('Search query contains invalid characters');
            }
        }
        
        // Simplify: split by whitespace only, no AND/OR or brackets
        const parts = query.trim().toLowerCase().split(/\s+/);
        
        return parts.map(pattern => ({ pattern }));
    }
    
    displaySearchResults(results, query, scope) {
        if (results.length === 0) {
            this.explorer.contentView.innerHTML = '<div class="no-results-message">No results found for "' + query + '"</div>';
            return;
        }
        
        // Create search results as a properties table for consistency
        const searchResultsObject = {
            type: 'search-results',
            properties: results.map(result => ({
                name: result.name,
                type: result.type,
                value: result.value,
                path: result.path
            }))
        };
        
        // Store the search results as current object
        this.explorer.currentObject = searchResultsObject;
        this.explorer.currentPath = `Search: "${query}" in ${scope}`;
        
        // Use ContentRenderer to display results consistently
        this.explorer.contentRenderer.renderContentView();
    }
}