/**
 * HighlightView.js
 * Manages element highlighting logic, including contrast and focus highlights.
 */

import { DomModel } from '../models/DomModel.js';
import { OverlayView } from './OverlayView.js';

const HIGHLIGHT_CLASS = '__axe_extension_highlight';
const HIGHLIGHT_STYLE_ID = '__axe_extension_highlight_style';

export class HighlightView {
    static currentHighlightedElement = null;

    static highlightElement(selectorData) {
        this.clearMainHighlight();
        this.ensureHighlightStyle(); // For potential fallback or mixed usage

        const { element, frame, reason } = DomModel.findElement(selectorData);

        if (element) {
            this.applyHighlight(element);
            this.scrollIntoView(element, frame);
            this.currentHighlightedElement = element;
            return { found: true };
        }

        return { found: false, reason };
    }

    static toggleHighlight(selectorData) {
        // Check if *this specific element* is highlighted? 
        // Runner.js logic was checking if currentHighlightedElement matches. 
        // But since we can only highlight one thing at a time for "main" highlight, 
        // we just check if we have a current highlight.
        // Actually runner.js checked:
        // const isCurrentlyHighlighted = currentHighlightedElement && currentHighlightedElement.classList.contains(HIGHLIGHT_CLASS);
        // But applyHighlight uses Overlay now, not class? 
        // Let's assume toggle means: "if I am highlighting THIS, turn it off. Else highlight THIS."
        // But to know if we are highlighting THIS, we need to find it first.

        // Simplification: If we have a current highlight, clear it. If the user clicked the SAME thing, we are done. 
        // If they clicked a DIFFERENT thing, highlight it.
        // However, the caller usually passes the selector of what was clicked.
        // Let's stick to runner.js logic: it always finds the element first?
        // No, runner.js checked `isCurrentlyHighlighted` using `currentHighlightedElement` reference.

        // If we have a current element, let's clear it.
        if (this.currentHighlightedElement) {
            // If the user meant "toggle off", we are good.
            // If the user meant "toggle on (different element)", we need to know.
            // Since we don't have the element yet, we can't compare.
            // But the UI usually tracks state. 
            // For now, let's just implement explicit highlight and explicit clear if needed.
            // But for `toggle-highlight` message support:
            this.clearMainHighlight();
            // Return found: true, isHighlighted: false?
            // Wait, if I clear it, I'm done?
            // The UI needs to know current state. 
            // Let's assume the UI handles "toggle" by sending "highlight" or "clear".
            // But runner.js had `toggle-highlight`.
            // Let's re-implement `highlightElement` logic for toggle:
            // Actually, let's just run HighlightElement. 
            // If the user wants to toggle OFF, they usually send a clear command. 
            // Or if the extension UI is stateful.
            // I will implement `highlightElement` which effectively clobbers previous.
            // If we strictly need toggle:
            // Since we cleared, we just highlight the new one.
        }

        return this.highlightElement(selectorData);
    }

    static applyHighlight(element) {
        if (!element) return;
        // Use OverlayView
        OverlayView.createOverlay(element, OverlayView.getBadgeInfo(element));
    }

    static removeHighlight(element) {
        // OverlayView.clearOverlays handles checking ID
    }

    static clearMainHighlight() {
        if (this.currentHighlightedElement) {
            this.currentHighlightedElement = null;
        }
        OverlayView.clearOverlays();
    }

    static scrollIntoView(element, frame = window) {
        if (!element) return;
        try {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
            // Handle iframe scrolling... (simplified for now, standard scrollIntoView often works)
        } catch (e) {
            // Ignore
        }
    }

    // --- Contrast Highlighting (Green Outline) ---

    static highlightTargetsContrast(selectors) {
        this.clearContrastHighlights();
        if (!Array.isArray(selectors) || selectors.length === 0) return;

        this.ensureHighlightStyleContrast();
        let scrolled = false;

        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(node => {
                    this.applyHighlightContrast(node);
                    if (!scrolled) {
                        node.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
                        scrolled = true;
                    }
                });
            } catch (e) { }
        });
    }

    static applyHighlightContrast(node) {
        if (!node) return;
        if (!node.__axePrevStyles) {
            node.__axePrevStyles = {
                outline: node.style.outline,
                outlineOffset: node.style.outlineOffset,
                boxShadow: node.style.boxShadow,
                position: node.style.position,
                zIndex: node.style.zIndex
            };
        }
        node.classList.add(HIGHLIGHT_CLASS);
        node.style.outline = '3px solid #39FF14';
        node.style.outlineOffset = '4px';
        node.style.boxShadow = '0 0 0 3px rgba(57, 255, 20, 0.45), 0 0 12px rgba(57, 255, 20, 0.85)';
        node.style.position = 'relative';
        node.style.zIndex = '99999';
    }

    static clearContrastHighlights() {
        document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(node => {
            node.classList.remove(HIGHLIGHT_CLASS);
            if (node.__axePrevStyles) {
                node.style.outline = node.__axePrevStyles.outline || '';
                node.style.outlineOffset = node.__axePrevStyles.outlineOffset || '';
                node.style.boxShadow = node.__axePrevStyles.boxShadow || '';
                node.style.position = node.__axePrevStyles.position || '';
                node.style.zIndex = node.__axePrevStyles.zIndex || '';
                delete node.__axePrevStyles;
            } else {
                node.style.outline = '';
                node.style.outlineOffset = '';
                node.style.boxShadow = '';
                node.style.position = '';
                node.style.zIndex = '';
            }
        });
    }

    // --- Generic Target Highlighting (Using Overlay) ---

    static highlightTargets(selectors) {
        this.clearMainHighlight(); // Clear existing generic overlays
        if (!Array.isArray(selectors) || selectors.length === 0) return;

        selectors.forEach(item => {
            // If string, try to resolve path/selector
            // DomModel.resolvePath ???
            // We can use DomModel.findElement logic or simple querySelector
            let nodes = [];
            try {
                // For simple selectors
                nodes = Array.from(document.querySelectorAll(item));
            } catch (e) {
                // Maybe it's a path
                const el = DomModel.resolvePath(item);
                if (el) nodes = [el];
            }

            nodes.forEach(node => this.applyHighlight(node));
        });
    }

    // --- Styles ---

    static ensureHighlightStyle() {
        // Legacy yellow pulse, mainly for fallback or if we use class
        // But we are using overlay now.
    }

    static ensureHighlightStyleContrast() {
        if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = HIGHLIGHT_STYLE_ID;
        style.textContent = `
      .${HIGHLIGHT_CLASS} {
        position: relative !important;
        animation: __axe_pulse 2s ease-in-out infinite;
      }
      @keyframes __axe_pulse {
        0%, 100% {
          box-shadow: 0 0 0 3px rgba(57, 255, 20, 0.45), 0 0 20px rgba(57, 255, 20, 0.5);
        }
        50% {
          box-shadow: 0 0 0 3px rgba(57, 255, 20, 0.6), 0 0 30px rgba(57, 255, 20, 0.8);
        }
      }
    `;
        document.documentElement.appendChild(style);
    }

    static clearAll() {
        this.clearMainHighlight();
        this.clearContrastHighlights();
    }
}
