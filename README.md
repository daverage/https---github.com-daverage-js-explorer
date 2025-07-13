# JavaScript Explorer - Chrome DevTools Extension

A Chrome Extension for Developer Tools that provides a Windows Explorer-like interface for navigating JavaScript objects and DOM elements.

## Project Structure

The extension has been refactored into a modular architecture for better maintainability:

```
Dev Explorer/
├── core/
│   └── JavaScriptExplorer.js     # Main application class and coordinator
├── navigation/
│   ├── TreeNavigation.js          # Tree view and node management
│   └── PathNavigation.js          # Address bar and breadcrumb navigation
├── search/
│   ├── GlobalSearch.js            # Global search functionality
│   └── AutoComplete.js            # Auto-completion for navigation input
├── ui/
│   ├── ContentRenderer.js         # Content display and property tables
│   └── ContextMenu.js             # Right-click context menu
├── utils/
│   ├── DevToolsAPI.js             # Chrome DevTools API wrapper
│   └── ErrorHandler.js            # Error formatting and display
├── panel.js                       # Main entry point (now modular)
├── panel.html                     # UI layout
├── panel.css                      # Styles
├── devtools.html                  # DevTools integration
├── devtools.js                    # DevTools panel registration
└── manifest.json                  # Extension configuration
```

## Module Overview

### Core Module
- **JavaScriptExplorer.js**: Main application class that coordinates all other modules, manages application state, and handles initialization.

### Navigation Modules
- **TreeNavigation.js**: Handles the left-pane tree view, including loading root nodes, creating tree nodes, handling expansion/collapse, and managing node selection.
- **PathNavigation.js**: Manages the address bar display and breadcrumb navigation functionality.

### Search Modules
- **GlobalSearch.js**: Implements global search functionality with support for wildcards, boolean operators (AND/OR), and different search scopes.
- **AutoComplete.js**: Provides auto-completion suggestions for the navigation input field.

### UI Modules
- **ContentRenderer.js**: Handles rendering of object properties, function source code, and primitive values in the right pane.
- **ContextMenu.js**: Manages right-click context menu functionality with actions like inspect, copy, and highlight.

### Utility Modules
- **DevToolsAPI.js**: Wraps Chrome DevTools API interactions and provides a clean interface for expression evaluation.
- **ErrorHandler.js**: Handles error formatting, display, and user feedback (success/error messages).

## Features

- **Tree Navigation**: Browse JavaScript objects in a familiar tree structure
- **Global Search**: Search across objects with wildcard support and boolean operators
- **Auto-completion**: Smart suggestions while typing navigation paths
- **Context Menu**: Right-click actions for inspecting, copying, and highlighting
- **Breadcrumb Navigation**: Click on path segments to navigate quickly
- **Framework Detection**: Automatically detects popular JavaScript frameworks
- **Resizable Panes**: Adjustable layout for optimal viewing

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Open Chrome DevTools (F12) and look for the "JS Explorer" tab

## Usage

1. Open Chrome DevTools on any webpage
2. Navigate to the "JS Explorer" tab
3. Use the tree view to browse objects or type expressions in the navigation input
4. Use global search to find properties across the entire object tree
5. Right-click on items for additional actions

## Development

The modular structure makes it easy to:
- Add new features by creating new modules
- Modify existing functionality without affecting other parts
- Test individual components in isolation
- Maintain clean separation of concerns

### Adding New Modules

1. Create your module in the appropriate directory
2. Export your class or functions
3. Import and integrate in `core/JavaScriptExplorer.js`
4. Update this README with the new module information

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers with DevTools API support

## License

MIT License - see LICENSE file for details