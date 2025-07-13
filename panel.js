/**
 * JavaScript Explorer DevTools Extension
 * Main panel script - now using modular architecture
 */

// Import all modules
import { JavaScriptExplorer } from './core/JavaScriptExplorer.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JavaScriptExplorer();
});