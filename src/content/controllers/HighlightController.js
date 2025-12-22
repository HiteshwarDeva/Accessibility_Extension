/**
 * HighlightController.js
 * Handles highlighting and overlay operations.
 */

import { HighlightView } from '../views/HighlightView.js';
import { OverlayView } from '../views/OverlayView.js';
import { DomModel } from '../models/DomModel.js';

export class HighlightController {
    static handleHighlightElement(message, sendResponse) {
        const result = HighlightView.highlightElement(message.selectorData);
        sendResponse({ ok: result.found, error: result.found ? null : (result.reason || 'Element not found') });
    }

    static handleToggleHighlight(message, sendResponse) {
        const result = HighlightView.toggleHighlight(message.selectorData);
        sendResponse({
            ok: result.found,
            isHighlighted: result.found, // Simplified per view logic
            error: result.found ? null : (result.reason || 'Element not found')
        });
    }

    static handleClearHighlights(message, sendResponse) {
        HighlightView.clearMainHighlight();
        // Also clear contrast? Runner.js cleared both in clearHighlights()
        HighlightView.clearContrastHighlights();
        sendResponse({ ok: true });
    }

    static handleHighlightTargetsContrast(message, sendResponse) {
        HighlightView.highlightTargetsContrast(message.selectors || []);
        sendResponse({ ok: true });
    }

    static handleClearHighlightsContrast(message, sendResponse) {
        HighlightView.clearContrastHighlights();
        sendResponse({ ok: true });
    }

    static handleShowTabOrderOverlay(message, sendResponse) {
        try {
            OverlayView.showTabOrder(message.data);
            sendResponse({ ok: true });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static handleHideTabOrderOverlay(message, sendResponse) {
        OverlayView.hideTabOrder();
        sendResponse({ ok: true });
    }

    static handleHighlightTabOrderElement(message, sendResponse) {
        try {
            OverlayView.highlightTabOrderElement(message.orderNumber, message.path);
            sendResponse({ ok: true });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static handleShowStructureBadges(message, sendResponse) {
        // If data is provided (replay mode), use it. Otherwise scan current DOM.
        let structuralElements = [];
        if (message.data && Array.isArray(message.data)) {
            structuralElements = message.data;
        } else {
            const structure = DomModel.getStructure();
            structuralElements = structure.structuralElements || [];
        }

        // Clear other highlights
        HighlightView.clearMainHighlight();
        OverlayView.ensureOverlayContainer();

        structuralElements.forEach(item => {
            const el = DomModel.resolvePath(item.path);
            if (el) {
                OverlayView.createOverlay(el, item);
            }
        });

        sendResponse({ ok: true });
    }

    static handleScrollToElement(message, sendResponse) {
        const element = DomModel.resolvePath(message.path);
        if (element) {
            HighlightView.scrollIntoView(element);
            // Also highlight?
            // Runner.js: "Find the item data... createOverlay... else applyHighlight"
            // Let's just applyHighlight
            HighlightView.applyHighlight(element);
        }
        sendResponse({ ok: true });
    }

    static handleShowDiffOverlay(message, sendResponse) {
        try {
            OverlayView.showDiffOverlay(message.diff);
            sendResponse({ ok: true });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static handleShowStructureDiffOverlay(message, sendResponse) {
        console.log('[HighlightController] handleShowStructureDiffOverlay called with:', message);
        try {
            OverlayView.showStructureDiffOverlay(message.diff);
            console.log('[HighlightController] Structure diff overlay shown successfully');
            sendResponse({ ok: true });
        } catch (error) {
            console.error('[HighlightController] Error showing structure diff overlay:', error);
            sendResponse({ ok: false, error: error.message });
        }
    }
}
