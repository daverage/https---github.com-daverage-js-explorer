/**
 * Content Renderer Module
 * Handles rendering of object properties, functions, and primitive values
 */

export class ContentRenderer {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    renderContentView() {
        if (!this.explorer.currentObject) {
            this.explorer.contentView.innerHTML = '<div class="loading-message">No data available</div>';
            return;
        }
        
        if (this.explorer.currentObject.type === 'search-results') {
            this.renderSearchResults();
        } else if (this.explorer.currentObject.type === 'function' && this.explorer.currentObject.source) {
            this.renderFunctionSource();
        } else if (this.explorer.currentObject.properties) {
            this.renderPropertiesTable();
        } else {
            this.renderPrimitiveValue();
        }
    }
    
    renderFunctionSource() {
        this.explorer.contentTitle.textContent = 'Function Source';
        
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'function-source';
        sourceDiv.textContent = this.explorer.currentObject.source;
        
        this.explorer.contentView.innerHTML = '';
        this.explorer.contentView.appendChild(sourceDiv);
        
        if (this.explorer.currentObject.properties && this.explorer.currentObject.properties.length > 0) {
            const propertiesTitle = document.createElement('h4');
            propertiesTitle.textContent = 'Function Properties';
            propertiesTitle.style.marginTop = '20px';
            propertiesTitle.style.marginBottom = '10px';
            this.explorer.contentView.appendChild(propertiesTitle);
            
            const table = this.createPropertiesTable(this.explorer.currentObject.properties);
            this.explorer.contentView.appendChild(table);
        }
    }
    
    renderPropertiesTable() {
        this.explorer.contentTitle.textContent = 'Properties';
        
        if (this.explorer.currentObject.properties.length === 0) {
            this.explorer.contentView.innerHTML = '<div class="loading-message">No enumerable properties</div>';
            return;
        }
        
        const table = this.createPropertiesTable(this.explorer.currentObject.properties);
        this.explorer.contentView.innerHTML = '';
        this.explorer.contentView.appendChild(table);
    }
    
    createPropertiesTable(properties) {
        const table = document.createElement('table');
        table.className = 'properties-table';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Value'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        properties.forEach(prop => {
            const row = document.createElement('tr');
            
            // Name
            const nameCell = document.createElement('td');
            nameCell.className = 'property-name';
            nameCell.textContent = prop.name;
            row.appendChild(nameCell);
            
            // Type
            const typeCell = document.createElement('td');
            typeCell.className = 'property-type';
            typeCell.textContent = prop.type;
            row.appendChild(typeCell);
            
            // Value
            const valueCell = document.createElement('td');
            valueCell.className = `property-value ${prop.type}`;
            valueCell.textContent = prop.value;
            
            if (prop.type === 'object' || prop.type === 'function') {
                valueCell.style.cursor = 'pointer';
                valueCell.addEventListener('click', () => {
                    this.explorer.navigateToPath(prop.path);
                });
            }
            
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        return table;
    }
    
    renderPrimitiveValue() {
        this.explorer.contentTitle.textContent = 'Value';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = `property-value ${this.explorer.currentObject.type}`;
        valueDiv.style.padding = '20px';
        valueDiv.style.fontSize = '14px';
        
        if (this.explorer.currentObject.type === 'string') {
            valueDiv.textContent = `"${this.explorer.currentObject.value}"`;
        } else {
            valueDiv.textContent = String(this.explorer.currentObject.value);
        }
        
        this.explorer.contentView.innerHTML = '';
        this.explorer.contentView.appendChild(valueDiv);
    }
    
    renderSearchResults() {
        this.explorer.contentTitle.textContent = this.explorer.currentPath;
        
        if (this.explorer.currentObject.properties.length === 0) {
            this.explorer.contentView.innerHTML = '<div class="loading-message">No search results</div>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'properties-table search-results-table';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Value', 'Path'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        this.explorer.currentObject.properties.forEach(result => {
            const row = document.createElement('tr');
            row.className = 'search-result-row';
            row.style.cursor = 'pointer';
            
            // Name
            const nameCell = document.createElement('td');
            nameCell.className = 'property-name';
            nameCell.textContent = result.name;
            row.appendChild(nameCell);
            
            // Type
            const typeCell = document.createElement('td');
            typeCell.className = 'property-type';
            typeCell.textContent = result.type;
            row.appendChild(typeCell);
            
            // Value
            const valueCell = document.createElement('td');
            valueCell.className = `property-value ${result.type}`;
            valueCell.textContent = result.value;
            row.appendChild(valueCell);
            
            // Path
            const pathCell = document.createElement('td');
            pathCell.className = 'search-result-path';
            pathCell.textContent = result.path;
            pathCell.style.fontSize = '12px';
            pathCell.style.color = '#666';
            row.appendChild(pathCell);
            
            // Click handler to navigate to the result
            row.addEventListener('click', () => {
                this.explorer.navigateToPath(result.path);
            });
            
            // Context menu support
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                row.dataset.path = result.path;
                row.dataset.type = result.type;
                this.explorer.contextMenu.showContextMenu(event.clientX, event.clientY, row);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        this.explorer.contentView.innerHTML = '';
        this.explorer.contentView.appendChild(table);
    }
}