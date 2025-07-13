// Register the JavaScript Explorer panel in Chrome DevTools
chrome.devtools.panels.create(
    'JS Explorer',
    'icons/icon16.png',
    'panel.html',
    function(panel) {
        console.log('JavaScript Explorer panel created');
    }
);