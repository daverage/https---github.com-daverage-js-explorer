/**
 * Path Navigation Module
 * Handles address bar display and breadcrumb navigation
 */

export class PathNavigation {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    updateAddressDisplay() {
        this.explorer.addressPath.innerHTML = '';
        
        const segments = this.explorer.currentPath.split(/[.\[\]]/).filter(s => s && s !== '"');
        let currentPath = '';
        
        segments.forEach((segment, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.textContent = '.';
                separator.style.color = '#586069';
                this.explorer.addressPath.appendChild(separator);
            }
            
            const segmentSpan = document.createElement('span');
            segmentSpan.className = 'breadcrumb-segment';
            segmentSpan.textContent = segment;
            
            if (index === 0) {
                currentPath = segment;
            } else {
                currentPath += '.' + segment;
            }
            
            segmentSpan.dataset.path = currentPath;
            segmentSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                this.explorer.navigateToPath(e.target.dataset.path);
            });
            
            this.explorer.addressPath.appendChild(segmentSpan);
        });
    }
    
    async navigateToExpression() {
        const expression = this.explorer.navigationInput.value.trim();
        if (!expression) return;
        
        try {
            // Test if the expression is valid
            const result = await this.explorer.devToolsAPI.evaluateExpression(`typeof (${expression})`);
            if (result.result !== 'undefined') {
                await this.explorer.navigateToPath(expression);
                this.explorer.navigationInput.value = ''; // Clear input after successful navigation
            } else {
                this.explorer.showError('Expression not found or undefined: ' + expression);
            }
        } catch (error) {
            this.explorer.showError('Invalid expression: ' + this.explorer.errorHandler.formatInspectorError(error));
        }
    }
    
    handleBreadcrumbClick(event) {
        const segment = event.target.closest('.breadcrumb-segment');
        if (segment && segment.dataset.path) {
            this.explorer.navigateToPath(segment.dataset.path);
        }
    }
}