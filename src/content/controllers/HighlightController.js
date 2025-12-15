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
            OverlayView.showTabOrder();
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
            OverlayView.highlightTabOrderElement(message.orderNumber);
            sendResponse({ ok: true });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static handleShowStructureBadges(message, sendResponse) {
        // We need to get structure data first
        // In runner.js it checked `lastStructureElements` or called getStructure()
        // We can call DomModel.getStructure()
        // Optimization: Store last structure? 
        // For now, re-scan or use cache if DomModel had it. DomModel doesn't cache.
        // Let's call DomModel.getStructure()
        const structure = DomModel.getStructure();

        // Clear other highlights
        HighlightView.clearMainHighlight();
        OverlayView.ensureOverlayContainer();

        structure.structuralElements.forEach(item => {
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
}
