// Register the JavaScript Explorer panel in Chrome DevTools
try {
    // Ensure DevTools API is available
    if (!chrome.devtools || !chrome.devtools.panels) {
        console.error('DevTools API not available');
        throw new Error('DevTools API not available');
    }

    // Create the panel with proper error handling
    chrome.devtools.panels.create(
        'JS Explorer',
        'icons/icon16.png',
        'panel.html',
        function(panel) {
            if (!panel) {
                console.error('Failed to create panel');
                return;
            }

            // Handle panel shown event
            panel.onShown.addListener(function(panelWindow) {
                if (!panelWindow) {
                    console.error('Panel window not available');
                    return;
                }

                // Ensure the inspected window is ready
                if (!chrome.devtools.inspectedWindow) {
                    console.error('Inspected window not available');
                    return;
                }

                // Panel initialization is now handled in panel.js with proper tab URL checking
            });
        }
    );
} catch (error) {
    console.error('Error creating DevTools panel:', error);
}