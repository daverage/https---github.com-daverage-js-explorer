/**
 * Content Renderer Module
 * Handles rendering of object properties, functions, and search results in the right pane
 * Enhanced with virtual scrolling and optimized property preview generation
 */

import { PropertyPreviewUtils } from '../utils/PropertyPreviewUtils.js';


export class ContentRenderer {
    constructor(explorer) {
        this.explorer = explorer;
        this.virtualScrollContainer = null;
        this.virtualScrollData = [];
        this.virtualScrollItemHeight = 25;
        this.virtualScrollVisibleCount = 20;
         this.virtualScrollStartIndex = 0;
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
        this.explorer.contentView.scrollTop = 0;
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
        this.explorer.contentView.scrollTop = 0;
        this.explorer.contentView.appendChild(table);
    }
    
    createPropertiesTable(properties) {
        // Use virtual scrolling for large property lists
        if (properties.length > 100) {
            return this.createVirtualScrollTable(properties);
        }
        
        return this.createStandardTable(properties);
    }
    
    createStandardTable(properties) {
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
            const row = this.createPropertyRow(prop);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        return table;
    }
    
    createVirtualScrollTable(properties) {
        const container = document.createElement('div');
        container.className = 'virtual-scroll-container';
        container.style.cssText = `
            height: 400px;
            overflow-y: auto;
            border: 1px solid #e1e4e8;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'virtual-scroll-header';
        header.style.cssText = `
            display: flex;
            background-color: #f6f8fa;
            border-bottom: 1px solid #e1e4e8;
            font-weight: 600;
            padding: 8px;
            position: sticky;
            top: 0;
            z-index: 1;
        `;
        
        const nameHeader = document.createElement('div');
        nameHeader.textContent = 'Name';
        nameHeader.style.cssText = 'flex: 1; padding-right: 8px;';
        
        const typeHeader = document.createElement('div');
        typeHeader.textContent = 'Type';
        typeHeader.style.cssText = 'flex: 0 0 100px; padding-right: 8px;';
        
        const valueHeader = document.createElement('div');
        valueHeader.textContent = 'Value';
        valueHeader.style.cssText = 'flex: 2;';
        
        header.appendChild(nameHeader);
        header.appendChild(typeHeader);
        header.appendChild(valueHeader);
        
        // Create scrollable content
        const content = document.createElement('div');
        content.className = 'virtual-scroll-content';
        content.style.cssText = `
            height: ${properties.length * this.virtualScrollItemHeight}px;
            position: relative;
        `;
        
        const viewport = document.createElement('div');
        viewport.className = 'virtual-scroll-viewport';
        viewport.style.cssText = 'position: absolute; top: 0; left: 0; right: 0;';
        
        content.appendChild(viewport);
        container.appendChild(header);
        container.appendChild(content);
        
        // Store data for virtual scrolling
        this.virtualScrollData = properties;
        this.virtualScrollContainer = container;
        
        // Initial render
        this.updateVirtualScrollViewport(viewport, 0);
        
        // Add scroll listener
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const startIndex = Math.floor(scrollTop / this.virtualScrollItemHeight);
            this.updateVirtualScrollViewport(viewport, startIndex);
        });
        
        return container;
    }
    
    updateVirtualScrollViewport(viewport, startIndex) {
        const endIndex = Math.min(startIndex + this.virtualScrollVisibleCount + 5, this.virtualScrollData.length);
        const actualStartIndex = Math.max(0, startIndex - 2);
        
        viewport.innerHTML = '';
        viewport.style.transform = `translateY(${actualStartIndex * this.virtualScrollItemHeight}px)`;
        
        for (let i = actualStartIndex; i < endIndex; i++) {
            const prop = this.virtualScrollData[i];
            const row = this.createVirtualPropertyRow(prop, i);
            viewport.appendChild(row);
        }
    }
    
    createVirtualPropertyRow(prop, index) {
        const row = document.createElement('div');
        row.className = 'virtual-property-row';
        row.style.cssText = `
            display: flex;
            height: ${this.virtualScrollItemHeight}px;
            align-items: center;
            padding: 4px 8px;
            border-bottom: 1px solid #f6f8fa;
            cursor: ${prop.isExpandable ? 'pointer' : 'default'};
        `;
        
        if (index % 2 === 0) {
            row.style.backgroundColor = '#fafbfc';
        }
        
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f1f8ff';
        });
        
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = index % 2 === 0 ? '#fafbfc' : 'transparent';
        });
        
        // Property name
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'flex: 1; padding-right: 8px; font-family: monospace; font-weight: 600; color: #005cc5; overflow: hidden; text-overflow: ellipsis;';
        nameDiv.textContent = prop.name;
        nameDiv.title = prop.name;
        
        // Property type
        const typeDiv = document.createElement('div');
        typeDiv.style.cssText = 'flex: 0 0 100px; padding-right: 8px; font-family: monospace; color: #6f42c1; font-size: 11px; overflow: hidden; text-overflow: ellipsis;';
        typeDiv.textContent = prop.type;
        typeDiv.title = prop.type;
        
        // Property value
        const valueDiv = document.createElement('div');
        valueDiv.style.cssText = 'flex: 2; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        valueDiv.textContent = prop.value;
        valueDiv.title = prop.value;
        
        // Apply type-specific styling
        switch (prop.type) {
            case 'string':
                valueDiv.style.color = '#032f62';
                break;
            case 'number':
                valueDiv.style.color = '#005cc5';
                break;
            case 'boolean':
                valueDiv.style.color = '#d73a49';
                break;
            case 'null':
            case 'undefined':
                valueDiv.style.color = '#6a737d';
                valueDiv.style.fontStyle = 'italic';
                break;
            case 'object':
            case 'function':
                valueDiv.style.color = prop.type === 'function' ? '#d73a49' : '#6f42c1';
                valueDiv.style.cursor = 'pointer';
                break;
        }
        
        // Add click handler for navigatable types
        if (prop.isExpandable) {
            row.addEventListener('click', () => {
                this.explorer.navigateToPath(prop.path);
            });
        }
        
        row.appendChild(nameDiv);
        row.appendChild(typeDiv);
        row.appendChild(valueDiv);
        
        return row;
    }
    
    createPropertyRow(prop) {
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
        
        if (prop.isExpandable) {
            valueCell.style.cursor = 'pointer';
            valueCell.addEventListener('click', () => {
                this.explorer.navigateToPath(prop.path);
            });
        }
        
        row.appendChild(valueCell);
        
        return row;
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
            row.style.cursor = result.isExpandable ? 'pointer' : 'default';
            
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
            if (result.isExpandable) {
                row.addEventListener('click', () => {
                    this.explorer.navigateToPath(result.path);
                });
            }
            
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