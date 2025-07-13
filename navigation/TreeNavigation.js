/**
 * Tree Navigation Module
 * Handles the left-side tree navigation functionality
 */

export class TreeNavigation {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    async loadRootNodes() {
        const rootNodes = [
            { name: 'window', type: 'object', path: 'window', hasChildren: true },
            { name: 'document', type: 'object', path: 'document', hasChildren: true },
            { name: 'localStorage', type: 'object', path: 'localStorage', hasChildren: true },
            { name: 'sessionStorage', type: 'object', path: 'sessionStorage', hasChildren: true },
            { name: 'console', type: 'object', path: 'console', hasChildren: true },
            { name: 'performance', type: 'object', path: 'performance', hasChildren: true },
            { name: 'navigator', type: 'object', path: 'navigator', hasChildren: true }
        ];
        
        // Check for popular frameworks
        const frameworks = ['jQuery', '$', 'React', 'Vue', 'Angular', 'angular'];
        for (const framework of frameworks) {
            try {
                const result = await this.explorer.devToolsAPI.evaluateExpression(`typeof ${framework} !== 'undefined'`);
                if (result && result.result === true) {
                    rootNodes.push({
                        name: framework,
                        type: 'object',
                        path: framework,
                        hasChildren: true
                    });
                }
            } catch (error) {
                // Framework not available, continue
            }
        }
        
        this.renderTreeNodes(this.explorer.navigationTree, rootNodes);
    }
    
    renderTreeNodes(container, nodes, level = 0) {
        container.innerHTML = '';
        
        nodes.forEach(node => {
            const nodeElement = this.createTreeNode(node, level);
            container.appendChild(nodeElement);
        });
    }
    
    createTreeNode(node, level) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.style.paddingLeft = (level * 16) + 'px';
        nodeDiv.dataset.path = node.path;
        nodeDiv.dataset.type = node.type;
        
        // Expand/collapse icon
        const iconDiv = document.createElement('div');
        iconDiv.className = `tree-icon ${node.hasChildren ? 'expandable' : ''} ${this.getIconType(node.type)}`;
        iconDiv.innerHTML = node.hasChildren ? '▶' : this.getFileIcon(node.type);
        
        // Node label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'tree-label';
        labelDiv.textContent = node.name;
        
        nodeDiv.appendChild(iconDiv);
        nodeDiv.appendChild(labelDiv);
        
        // Event listeners
        if (node.hasChildren) {
            iconDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(nodeDiv, node);
            });
        }
        
        nodeDiv.addEventListener('click', () => {
            this.selectNode(nodeDiv, node);
        });
        
        return nodeDiv;
    }
    
    getIconType(type) {
        switch (type) {
            case 'function': return 'function';
            case 'object': return 'folder';
            default: return 'file';
        }
    }
    
    getFileIcon(type) {
        switch (type) {
            case 'function': return 'ƒ';
            case 'string': return '"';
            case 'number': return '#';
            case 'boolean': return 'B';
            case 'object': return '📁';
            default: return '📄';
        }
    }
    
    async toggleNode(nodeElement, node) {
        const icon = nodeElement.querySelector('.tree-icon');
        const existingChildren = nodeElement.nextElementSibling;
        
        if (existingChildren && existingChildren.classList.contains('tree-children')) {
            // Toggle existing children
            if (existingChildren.classList.contains('expanded')) {
                existingChildren.classList.remove('expanded');
                icon.innerHTML = '▶';
            } else {
                existingChildren.classList.add('expanded');
                icon.innerHTML = '▼';
            }
        } else {
            // Load children for the first time
            try {
                const children = await this.loadNodeChildren(node.path);
                if (children.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'tree-children expanded';
                    
                    children.forEach(child => {
                        const childNode = this.createTreeNode(child, this.getNodeLevel(nodeElement) + 1);
                        childrenContainer.appendChild(childNode);
                    });
                    
                    nodeElement.parentNode.insertBefore(childrenContainer, nodeElement.nextSibling);
                    icon.innerHTML = '▼';
                }
            } catch (error) {
                this.explorer.showError('Failed to load children: ' + this.explorer.errorHandler.formatInspectorError(error));
            }
        }
    }
    
    getNodeLevel(nodeElement) {
        const paddingLeft = parseInt(nodeElement.style.paddingLeft) || 0;
        return paddingLeft / 16;
    }
    
    async loadNodeChildren(path) {
        try {
            const result = await this.explorer.devToolsAPI.evaluateExpression(`
                (function() {
                    const obj = ${path};
                    if (obj === null || obj === undefined) return [];
                    
                    const children = [];
                    const seen = new Set();
                    
                    // Get enumerable properties
                    for (const key in obj) {
                        if (seen.has(key)) continue;
                        seen.add(key);
                        
                        try {
                            const value = obj[key];
                            const type = typeof value;
                            const hasChildren = (type === 'object' && value !== null) || type === 'function';
                            
                            children.push({
                                name: key,
                                type: type,
                                path: '${path}["' + key + '"]',
                                hasChildren: hasChildren
                            });
                        } catch (e) {
                            // Property access failed, skip
                        }
                    }
                    
                    // Get own property names (including non-enumerable)
                    try {
                        const ownProps = Object.getOwnPropertyNames(obj);
                        ownProps.forEach(key => {
                            if (seen.has(key)) return;
                            seen.add(key);
                            
                            try {
                                const value = obj[key];
                                const type = typeof value;
                                const hasChildren = (type === 'object' && value !== null) || type === 'function';
                                
                                children.push({
                                    name: key,
                                    type: type,
                                    path: '${path}["' + key + '"]',
                                    hasChildren: hasChildren
                                });
                            } catch (e) {
                                // Property access failed, skip
                            }
                        });
                    } catch (e) {
                        // getOwnPropertyNames failed, continue with what we have
                    }
                    
                    return children.sort((a, b) => a.name.localeCompare(b.name));
                })()
            `);
            
            return result.result || [];
        } catch (error) {
            console.error('Error loading node children:', error);
            return [];
        }
    }
    
    async selectNode(nodeElement, node) {
        // Update selection
        if (this.explorer.selectedNode) {
            this.explorer.selectedNode.classList.remove('selected');
        }
        this.explorer.selectedNode = nodeElement;
        nodeElement.classList.add('selected');
        
        // Update current path and navigate
        await this.explorer.navigateToPath(node.path);
    }
    
    async updateTreeSelection(currentPath) {
        // Clear current selection
        if (this.explorer.selectedNode) {
            this.explorer.selectedNode.classList.remove('selected');
            this.explorer.selectedNode = null;
        }
        
        // Try to find existing node first
        let targetNode = this.findNodeByPath(currentPath);
        if (targetNode) {
            targetNode.classList.add('selected');
            this.explorer.selectedNode = targetNode;
            this.ensureNodeVisible(targetNode);
            return;
        }
        
        // If node doesn't exist, try to expand the tree to reach it
        await this.expandToPath(currentPath);
        
        // Try to find the node again after expansion
        targetNode = this.findNodeByPath(currentPath);
        if (targetNode) {
            targetNode.classList.add('selected');
            this.explorer.selectedNode = targetNode;
            this.ensureNodeVisible(targetNode);
        }
    }
    
    findNodeByPath(path) {
        const allNodes = this.explorer.navigationTree.querySelectorAll('.tree-node');
        for (const node of allNodes) {
            if (node.dataset.path === path) {
                return node;
            }
        }
        return null;
    }
    
    async expandToPath(targetPath) {
        // Parse the path to get the hierarchy
        const pathSegments = this.parsePathSegments(targetPath);
        let currentPath = '';
        
        for (let i = 0; i < pathSegments.length - 1; i++) {
            currentPath = pathSegments.slice(0, i + 1).join('');
            const node = this.findNodeByPath(currentPath);
            
            if (node) {
                // Check if this node has children and expand if needed
                const nextSibling = node.nextElementSibling;
                if (!nextSibling || !nextSibling.classList.contains('tree-children')) {
                    // Load children for the first time
                    const nodeData = {
                        path: currentPath,
                        hasChildren: true
                    };
                    await this.toggleNode(node, nodeData);
                } else if (!nextSibling.classList.contains('expanded')) {
                    // Expand existing children
                    nextSibling.classList.add('expanded');
                    const icon = node.querySelector('.tree-icon');
                    if (icon) icon.innerHTML = '▼';
                }
            }
        }
    }
    
    parsePathSegments(path) {
        // Convert path like 'window["document"]["body"]' to segments
        const segments = [];
        let current = '';
        let inBrackets = false;
        let bracketContent = '';
        
        for (let i = 0; i < path.length; i++) {
            const char = path[i];
            
            if (char === '[' && !inBrackets) {
                if (current) {
                    segments.push(current);
                    current = current + '[';
                }
                inBrackets = true;
                bracketContent = '';
            } else if (char === ']' && inBrackets) {
                current += bracketContent + ']';
                segments.push(current);
                inBrackets = false;
                current = segments.join('');
            } else if (inBrackets) {
                bracketContent += char;
            } else if (char === '.' && !inBrackets) {
                if (current) {
                    segments.push(current);
                    current = current + '.';
                }
            } else if (!inBrackets) {
                current += char;
            }
        }
        
        if (current && !segments.includes(current)) {
            segments.push(current);
        }
        
        return segments.filter(s => s);
    }
    
    ensureNodeVisible(targetNode) {
        // Find all parent containers and expand them
        let current = targetNode.parentElement;
        while (current && current !== this.explorer.navigationTree) {
            if (current.classList.contains('tree-children')) {
                current.classList.add('expanded');
                
                // Update the expand icon of the parent node
                const parentNode = current.previousElementSibling;
                if (parentNode && parentNode.classList.contains('tree-node')) {
                    const icon = parentNode.querySelector('.tree-icon');
                    if (icon) {
                        icon.innerHTML = '▼';
                    }
                }
            }
            current = current.parentElement;
        }
    }
}