/**
 * Global Search Module
 * Handles global search functionality across JavaScript objects
 */

export class GlobalSearch {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    async performSearch() {
        const query = this.explorer.globalSearchInput.value.trim();
        const scope = this.explorer.searchScope.value;
        
        if (!query) {
            this.explorer.showError('Enter a search query');
            return;
        }
        
        // Show loading in right panel
        this.explorer.contentView.innerHTML = '<div class="loading-message">Searching...</div>';
        this.explorer.contentTitle.textContent = `Search Results for "${query}"`;
        
        try {
            const results = await this.executeGlobalSearch(query, scope);
            this.displaySearchResults(results, query, scope);
        } catch (error) {
            this.explorer.showError('Search failed: ' + this.explorer.errorHandler.formatInspectorError(error));
        }
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
                                    let preview = '';
                                    if (value === null) preview = 'null';
                                    else if (value === undefined) preview = 'undefined';
                                    else if (type === 'string') preview = '"' + (value.length > 50 ? value.substring(0, 50) + '...' : value) + '"';
                                    else if (type === 'number' || type === 'boolean') preview = String(value);
                                    else if (type === 'function') preview = 'ƒ ' + (value.name || 'anonymous');
                                    else if (type === 'object') {
                                        if (Array.isArray(value)) preview = '[Array(' + value.length + ')]';
                                        else if (value.constructor) preview = '[' + value.constructor.name + ']';
                                        else preview = '[Object]';
                                    }
                                    
                                    results.push({
                                        name: key,
                                        path: fullPath,
                                        type: type,
                                        value: preview
                                    });
                                }
                                
                                if ((type === 'object' && value !== null) || type === 'function') {
                                    searchObject(value, fullPath, maxDepth, currentDepth + 1);
                                }
                            } catch (e) {
                                // Skip inaccessible properties
                            }
                        }
                    } catch (e) {
                        // Skip if object enumeration fails
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
                        const currentObj = eval(${JSON.stringify(currentPath)});
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
        return result.result || [];
    }
    
    parseSearchQuery(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }
        
        const terms = [];
        const parts = query.split(/\s+(AND|OR)\s+/i);
        
        for (let i = 0; i < parts.length; i += 2) {
            const term = parts[i] ? parts[i].trim() : '';
            if (!term) continue;
            
            const operator = parts[i + 1];
            
            if (operator && (operator.toUpperCase() === 'AND' || operator.toUpperCase() === 'OR')) {
                const nextTerm = parts[i + 2] ? parts[i + 2].trim() : '';
                if (nextTerm) {
                    terms.push({
                        operator: operator.toUpperCase(),
                        patterns: [term.toLowerCase(), nextTerm.toLowerCase()]
                    });
                    i++; // Skip the next term as it's already processed
                } else {
                    // If no next term, treat as regular pattern
                    terms.push({
                        pattern: term.toLowerCase()
                    });
                }
            } else {
                terms.push({
                    pattern: term.toLowerCase()
                });
            }
        }
        
        return terms.filter(term => term.pattern || (term.patterns && term.patterns.length > 0));
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