/**
 * Context Menu Module
 * Handles right-click context menu functionality
 */

export class ContextMenu {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    handleContextMenu(event) {
        const treeNode = event.target.closest('.tree-node');
        const searchResultItem = event.target.closest('.search-result-item');
        
        if (treeNode) {
            event.preventDefault();
            this.showContextMenu(event.clientX, event.clientY, treeNode);
        } else if (searchResultItem) {
            event.preventDefault();
            this.showContextMenu(event.clientX, event.clientY, searchResultItem);
        }
    }
    
    showContextMenu(x, y, node) {
        this.explorer.contextMenuElement.style.left = x + 'px';
        this.explorer.contextMenuElement.style.top = y + 'px';
        this.explorer.contextMenuElement.style.display = 'block';
        this.explorer.contextMenuElement.dataset.path = node.dataset.path;
        this.explorer.contextMenuElement.dataset.type = node.dataset.type;
    }
    
    hideContextMenu() {
        this.explorer.contextMenuElement.style.display = 'none';
    }
    
    async handleContextMenuAction(event) {
        const action = event.target.dataset.action;
        if (!action) return;
        
        const path = this.explorer.contextMenuElement.dataset.path;
        const type = this.explorer.contextMenuElement.dataset.type;
        
        this.hideContextMenu();
        
        switch (action) {
            case 'inspect':
                await this.inspectInConsole(path);
                break;
            case 'copy':
                await this.copyPath(path);
                break;
            case 'copyValue':
                await this.copyValue(path);
                break;
            case 'source':
                if (type === 'function') {
                    await this.viewSource(path);
                }
                break;
            case 'highlight':
                await this.highlightElement(path);
                break;
        }
    }
    
    async inspectInConsole(path) {
        try {
            await this.explorer.devToolsAPI.evaluateExpression(`inspect(${path})`);
            this.explorer.showSuccess('Object logged to console');
        } catch (error) {
            throw error; // Re-throw the original error
        }
    }
    
    async copyPath(path) {
        try {
            await this.copyToClipboard(path);
            this.explorer.showSuccess('Path copied to clipboard');
        } catch (error) {
            throw error; // Re-throw the original error
        }
    }
    
    async copyToClipboard(text) {
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (clipboardError) {
                // Fall back to legacy method if Clipboard API fails
    
            }
        }
        
        // Fallback method using temporary textarea
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('execCommand copy failed');
            }
        } finally {
            document.body.removeChild(textArea);
        }
    }
    
    async copyValue(path) {
        try {
            const result = await this.explorer.devToolsAPI.evaluateExpression(`
                (function() {
                    const value = ${path};
                    const type = typeof value;
                    
                    if (value === null) return 'null';
                    if (value === undefined) return 'undefined';
                    if (type === 'string') return value;
                    if (type === 'number' || type === 'boolean') return String(value);
                    if (type === 'function') return value.toString();
                    if (type === 'object') {
                        try {
                            return JSON.stringify(value, null, 2);
                        } catch (e) {
                            // Handle circular references or non-serializable objects
                            return value.toString();
                        }
                    }
                    return String(value);
                })()
            `);
            
            const valueText = result.result;
            await this.copyToClipboard(valueText);
            this.explorer.showSuccess('Value copied to clipboard');
        } catch (error) {
            throw error; // Re-throw the original error
        }
    }
    
    async viewSource(path) {
        try {
            await this.explorer.navigateToPath(path);
        } catch (error) {
            throw error; // Re-throw the original error
        }
    }
    
    async highlightElement(path) {
        try {
            await this.explorer.devToolsAPI.evaluateExpression(`
                (function() {
                    const element = ${path};
                    if (element && element.nodeType === 1) {
                        element.style.outline = '2px solid red';
                        setTimeout(() => {
                            element.style.outline = '';
                        }, 2000);
                        return true;
                    }
                    return false;
                })()
            `);
            this.explorer.showSuccess('Element highlighted');
        } catch (error) {
            throw error; // Re-throw the original error
        }
    }
}