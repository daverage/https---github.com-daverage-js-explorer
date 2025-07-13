/**
 * Tree Navigation Module
 * Handles the hierarchical tree view of JavaScript objects
 * Enhanced with optimized property preview generation and virtual scrolling
 */

import { PropertyPreviewUtils } from '../utils/PropertyPreviewUtils.js';
import { PathUtils } from '../utils/PathUtils.js';


export class TreeNavigation {
    constructor(explorer) {
        this.explorer = explorer;
        this.expandedNodes = new Set();
        this.nodeCache = new Map();
        this.virtualScrollEnabled = false;
        this.visibleNodes = [];
        this.scrollTop = 0;
        this.nodeHeight = 24;
        this.containerHeight = 0;
    }
    
    async loadRootNodes() {
        if (this.isLoadingRootNodes) {
            return;
        }
        this.isLoadingRootNodes = true;
        
        try {
            // Verify DevTools API availability
            if (!this.explorer.devToolsAPI.isAvailable()) {
                throw new Error('DevTools API not available');
            }

            this.explorer.navigationTree.innerHTML = '';
            this.nodeCache.clear();
            this.expandedNodes.clear();
            
            // Verify each root object exists before adding it
            const rootNodes = [];
            
            const windowAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof window !== "undefined"');
            if (windowAvailable) {
                rootNodes.push({ name: 'window', type: 'object', path: 'window', hasChildren: true });
            }
            
            const documentAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof document !== "undefined"');
            if (documentAvailable) {
                rootNodes.push({ name: 'document', type: 'object', path: 'document', hasChildren: true });
            }
            
            const localStorageAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof localStorage !== "undefined"');
            if (localStorageAvailable) {
                rootNodes.push({ name: 'localStorage', type: 'object', path: 'localStorage', hasChildren: true });
            }
            
            const sessionStorageAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof sessionStorage !== "undefined"');
            if (sessionStorageAvailable) {
                rootNodes.push({ name: 'sessionStorage', type: 'object', path: 'sessionStorage', hasChildren: true });
            }
            const consoleAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof console !== "undefined"');
            if (consoleAvailable) {
                rootNodes.push({ name: 'console', type: 'object', path: 'console', hasChildren: true });
            }

            const performanceAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof performance !== "undefined"');
            if (performanceAvailable) {
                rootNodes.push({ name: 'performance', type: 'object', path: 'performance', hasChildren: true });
            }
            const navigatorAvailable = await this.explorer.devToolsAPI.evaluateExpression('typeof navigator !== "undefined"');
            if (navigatorAvailable) {
                rootNodes.push({ name: 'navigator', type: 'object', path: 'navigator', hasChildren: true });
            }

            if (rootNodes.length === 0) {
                throw new Error('No root objects available in the current context');
            }
            
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
        } catch (error) {
            console.error('Failed to load root nodes:', error);
            this.explorer.navigationTree.innerHTML = `
                <div class="error-message" style="padding: 16px; text-align: center;">
                    Failed to load root nodes: ${error.message}
                    <br><br>
                    Please ensure you are using this extension in a valid web page context.
                </div>
            `;
            throw error; // Propagate the error to JavaScriptExplorer
        } finally {
            this.isLoadingRootNodes = false;
        }
    }
    
    renderTreeNodes(container, nodes, level = 0) {
        container.innerHTML = '';
        
        nodes.forEach(node => {
            const nodeElement = this.createTreeNode(node, level);
            container.appendChild(nodeElement);
        });
    }
    
    createTreeNode(node, level) {
        // Check cache first
        const cacheKey = `${node.path}_${level}`;
        if (this.nodeCache.has(cacheKey)) {
            return this.nodeCache.get(cacheKey).cloneNode(true);
        }
        
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
        
        // Add tooltip with full path for long paths
        if (node.path.length > 50) {
            nodeDiv.title = node.path;
        }
        
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
        
        // Cache the node template
        this.nodeCache.set(cacheKey, nodeDiv.cloneNode(true));
        
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
                this.expandedNodes.delete(node.path);
            } else {
                existingChildren.classList.add('expanded');
                icon.innerHTML = '▼';
                this.expandedNodes.add(node.path);
            }
        } else {
            // Load children for the first time
            try {
                const validation = PathUtils.validatePath(node.path);
                if (!validation.isValid) {
                    this.explorer.showError(`Cannot expand: ${validation.error}`);
                    return;
                }
                
                const children = await this.loadNodeChildren(node.path);
                if (children.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'tree-children expanded';
                    
                    // Limit children for performance
                    const level = this.getNodeLevel(nodeElement);
                    const maxChildren = level > 3 ? 50 : 100;
                    const limitedChildren = children.slice(0, maxChildren);
                    
                    limitedChildren.forEach(child => {
                        const childNode = this.createTreeNode(child, level + 1);
                        childrenContainer.appendChild(childNode);
                    });
                    
                    // Show truncation message if needed
                    if (children.length > maxChildren) {
                        const truncatedNode = document.createElement('div');
                        truncatedNode.className = 'tree-node truncated';
                        truncatedNode.style.paddingLeft = `${(level + 1) * 16 + 20}px`;
                        truncatedNode.textContent = `... ${children.length - maxChildren} more items`;
                        truncatedNode.style.color = '#6a737d';
                        truncatedNode.style.fontStyle = 'italic';
                        childrenContainer.appendChild(truncatedNode);
                    }
                    
                    nodeElement.parentNode.insertBefore(childrenContainer, nodeElement.nextSibling);
                    icon.innerHTML = '▼';
                    this.expandedNodes.add(node.path);
                }
            } catch (error) {
                this.explorer.showError(`Failed to load children for ${node.path}`);
            }
        }
    }
    
    getNodeLevel(nodeElement) {
        if (!nodeElement || !nodeElement.style) return 0;
        const paddingLeft = parseInt(nodeElement.style.paddingLeft) || 0;
        return Math.floor(paddingLeft / 16);
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
                        } catch (e) {}
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
                            } catch (e) {}
                        });
                    } catch (e) {}
                    
                    return children.sort((a, b) => a.name.localeCompare(b.name));
                })()
            `);
            
            return result.result || [];
        } catch (error) {
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