/**
 * Auto Complete Module
 * Handles auto-completion for navigation input
 */

export class AutoComplete {
    constructor(explorer) {
        this.explorer = explorer;
        this.debounceTimer = null;
        this.suggestionIndex = -1;
        this.suggestions = [];
    }
    
    handleInput(event) {
        const query = event.target.value.trim();
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        if (query.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.debounceTimer = setTimeout(() => {
            this.generateSuggestions(query);
        }, 250);
    }
    
    handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (this.suggestionIndex >= 0 && this.suggestions[this.suggestionIndex]) {
                this.selectSuggestion(this.suggestions[this.suggestionIndex]);
            } else {
                this.explorer.pathNavigation.navigateToExpression();
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.navigateSuggestions(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.navigateSuggestions(-1);
        } else if (event.key === 'Escape') {
            this.hideSuggestions();
        }
    }
    
    async generateSuggestions(query) {
        try {
            // Parse the query to find the base object and partial property
            const lastDotIndex = query.lastIndexOf('.');
            const lastBracketIndex = query.lastIndexOf('[');
            const splitIndex = Math.max(lastDotIndex, lastBracketIndex);
            
            let basePath = '';
            let partial = query;
            
            if (splitIndex > 0) {
                basePath = query.substring(0, splitIndex);
                partial = query.substring(splitIndex + 1);
                
                // Remove quotes and closing bracket if present
                partial = partial.replace(/^["']|["']\]?$/g, '');
            }
            
            const result = await this.explorer.devToolsAPI.evaluateExpression(`
                (function() {
                    try {
                        const baseObj = ${basePath || 'window'};
                        if (!baseObj) return [];
                        
                        const suggestions = [];
                        const partial = '${partial}'.toLowerCase();
                        
                        // Get enumerable properties
                        for (const key in baseObj) {
                            if (key.toLowerCase().includes(partial)) {
                                suggestions.push(key);
                            }
                        }
                        
                        // Get own properties
                        try {
                            const ownProps = Object.getOwnPropertyNames(baseObj);
                            ownProps.forEach(key => {
                                if (key.toLowerCase().includes(partial) && !suggestions.includes(key)) {
                                    suggestions.push(key);
                                }
                            });
                        } catch (e) {}
                        
                        return suggestions.sort().slice(0, 10);
                    } catch (e) {
                        return [];
                    }
                })()
            `);
            
            this.suggestions = result.result || [];
            this.displaySuggestions(basePath, partial);
            
        } catch (error) {
            this.suggestions = [];
            this.hideSuggestions();
        }
    }
    
    displaySuggestions(basePath, partial) {
        if (this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.explorer.suggestionsDropdown.innerHTML = '';
        this.suggestionIndex = -1;
        
        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            const fullSuggestion = basePath ? `${basePath}.${suggestion}` : suggestion;
            item.textContent = fullSuggestion;
            item.dataset.suggestion = fullSuggestion;
            
            item.addEventListener('click', () => {
                this.selectSuggestion(fullSuggestion);
            });
            
            this.explorer.suggestionsDropdown.appendChild(item);
        });
        
        this.explorer.suggestionsDropdown.style.display = 'block';
    }
    
    navigateSuggestions(direction) {
        if (this.suggestions.length === 0) return;
        
        const items = this.explorer.suggestionsDropdown.querySelectorAll('.suggestion-item');
        
        if (items.length === 0) return;
        
        // Remove current selection
        if (this.suggestionIndex >= 0) {
            items[this.suggestionIndex].classList.remove('selected');
        }
        
        // Update index
        this.suggestionIndex += direction;
        
        if (this.suggestionIndex < 0) {
            this.suggestionIndex = items.length - 1;
        } else if (this.suggestionIndex >= items.length) {
            this.suggestionIndex = 0;
        }
        
        // Add new selection
        items[this.suggestionIndex].classList.add('selected');
        items[this.suggestionIndex].scrollIntoView({ block: 'nearest' });
    }
    
    selectSuggestion(suggestion) {
        this.explorer.navigationInput.value = suggestion;
        this.hideSuggestions();
        this.explorer.pathNavigation.navigateToExpression();
    }
    
    hideSuggestions() {
        this.explorer.suggestionsDropdown.style.display = 'none';
        this.suggestionIndex = -1;
        this.suggestions = [];
    }
}