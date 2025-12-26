/**
 * src/content.js
 * Content script entry point.
 */

import { ScanController } from './content/controllers/ScanController.js';
import { HighlightController } from './content/controllers/HighlightController.js';

console.log('[Axe Extension] Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    switch (message.type) {
        case 'run-axe':
            ScanController.runAxe(message, sendResponse);
            return true; // async
        case 'get-tab-order':
            ScanController.getTabOrder(message, sendResponse);
            break;
        case 'get-structure':
            ScanController.getStructure(message, sendResponse);
            break;
        case 'highlight-element':
            HighlightController.handleHighlightElement(message, sendResponse);
            break;
        case 'toggle-highlight':
            HighlightController.handleToggleHighlight(message, sendResponse);
            break;
        case 'clear-highlights':
        case 'clear-highlights-contrast':
            HighlightController.handleClearHighlights(message, sendResponse);
            break;
        case 'highlight-nodes-contrast':
        case 'highlight-nodes':
            HighlightController.handleHighlightTargetsContrast(message, sendResponse);
            break;
        case 'show-tab-order-overlay':
            HighlightController.handleShowTabOrderOverlay(message, sendResponse);
            break;
        case 'hide-tab-order-overlay':
            HighlightController.handleHideTabOrderOverlay(message, sendResponse);
            break;
        case 'highlight-tab-order-element':
            HighlightController.handleHighlightTabOrderElement(message, sendResponse);
            break;
        case 'show-structure-badges':
            HighlightController.handleShowStructureBadges(message, sendResponse);
            break;
        case 'scroll-to-element':
            HighlightController.handleScrollToElement(message, sendResponse);
            break;
        case 'show-diff-overlay':
            HighlightController.handleShowDiffOverlay(message, sendResponse);
            break;
        case 'show-structure-diff-overlay':
            HighlightController.handleShowStructureDiffOverlay(message, sendResponse);
            break;
    }
});
