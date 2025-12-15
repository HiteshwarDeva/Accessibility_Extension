/**
 * content/index.js
 * Entry point for the accessibility extension content script.
 * Routes messages to appropriate controllers.
 */

import { ScanController } from './controllers/ScanController.js';
import { HighlightController } from './controllers/HighlightController.js';

console.log('[Axe Extension] Content script loaded (MVC)');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    // Scan & Data Operations
    if (message.type === 'run-axe') {
        ScanController.runAxe(message, sendResponse);
        return true; // async
    }
    if (message.type === 'get-tab-order') {
        ScanController.getTabOrder(message, sendResponse);
        return;
    }
    if (message.type === 'get-structure') {
        ScanController.getStructure(message, sendResponse);
        return;
    }

    // Highlight & Overlay Operations
    if (message.type === 'highlight-element') {
        HighlightController.handleHighlightElement(message, sendResponse);
        return;
    }
    if (message.type === 'toggle-highlight') {
        HighlightController.handleToggleHighlight(message, sendResponse);
        return;
    }
    if (message.type === 'clear-highlights' || message.type === 'clear-highlights-contrast') {
        HighlightController.handleClearHighlights(message, sendResponse);
        return;
    }
    if (message.type === 'highlight-nodes-contrast' || message.type === 'highlight-nodes') {
        HighlightController.handleHighlightTargetsContrast(message, sendResponse);
        return;
    }
    if (message.type === 'show-tab-order-overlay') {
        HighlightController.handleShowTabOrderOverlay(message, sendResponse);
        return;
    }
    if (message.type === 'hide-tab-order-overlay') {
        HighlightController.handleHideTabOrderOverlay(message, sendResponse);
        return;
    }
    if (message.type === 'highlight-tab-order-element') {
        HighlightController.handleHighlightTabOrderElement(message, sendResponse);
        return;
    }
    if (message.type === 'show-structure-badges') {
        HighlightController.handleShowStructureBadges(message, sendResponse);
        return;
    }
    if (message.type === 'scroll-to-element') {
        HighlightController.handleScrollToElement(message, sendResponse);
        return;
    }
});
