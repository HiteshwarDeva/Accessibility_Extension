/**
 * OverlayView.js
 * Handles visual overlays for Tab Order, Structure, and Highlighting.
 */

import { DomModel } from '../models/DomModel.js';

const TAB_ORDER_OVERLAY_CLASS = '__tab_order_overlay';
const TAB_ORDER_STYLE_ID = '__tab_order_overlay_style';
const HIGHLIGHT_OVERLAY_ID = '__axe_extension_overlay_container';

export class OverlayView {

    // --- Tab Order Overlay ---

    static showTabOrder() {
        this.hideTabOrder();
        this.injectTabOrderStyles();

        // Use DomModel to get elements
        const sortedElements = DomModel.getFocusableElements();

        // Create badges
        const badges = sortedElements.map((el, index) => this.createTabBadge(el, index + 1));

        // Create arrows
        this.createArrowConnectors(badges);
    }

    static hideTabOrder() {
        // Remove badges
        document.querySelectorAll('.' + TAB_ORDER_OVERLAY_CLASS).forEach(badge => badge.remove());

        // Remove arrows
        const arrows = document.querySelector('.__tab_order_arrows');
        if (arrows) arrows.remove();

        // Remove bounding box
        const boundingBox = document.querySelector('.__tab_order_bounding_box');
        if (boundingBox) boundingBox.remove();

        // Clean up references
        document.querySelectorAll('[class*="__tabOrderBadge"]').forEach(el => {
            delete el.__tabOrderBadge;
        });

        // Remove styles
        const style = document.getElementById(TAB_ORDER_STYLE_ID);
        if (style) style.remove();
    }

    static injectTabOrderStyles() {
        if (document.getElementById(TAB_ORDER_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = TAB_ORDER_STYLE_ID;
        style.textContent = `
      .${TAB_ORDER_OVERLAY_CLASS} {
        position: absolute !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 28px !important;
        height: 28px !important;
        background: #5b9bd5 !important;
        color: #ffffff !important;
        border-radius: 50% !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        font-weight: bold !important;
        padding: 4px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        border: 2px solid #ffffff !important;
        line-height: 1 !important;
        text-align: center !important;
      }
    `;
        document.documentElement.appendChild(style);
    }

    static createTabBadge(element, orderNumber) {
        const rect = element.getBoundingClientRect();
        const badge = document.createElement('div');
        badge.className = TAB_ORDER_OVERLAY_CLASS;
        badge.textContent = orderNumber;
        badge.style.left = `${rect.left + window.scrollX}px`;
        badge.style.top = `${rect.top + window.scrollY}px`;

        document.body.appendChild(badge);
        element.__tabOrderBadge = badge;
        return badge;
    }

    static createArrowConnectors(badges) {
        if (badges.length < 2) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', '__tab_order_arrows');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = `${document.documentElement.scrollWidth}px`;
        svg.style.height = `${document.documentElement.scrollHeight}px`;
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '2147483646';

        // Arrowhead marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', '#5b9bd5');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        document.body.appendChild(svg);

        for (let i = 0; i < badges.length - 1; i++) {
            const fromBadge = badges[i];
            const toBadge = badges[i + 1];
            const fromRect = fromBadge.getBoundingClientRect();
            const toRect = toBadge.getBoundingClientRect();

            const fromX = fromRect.left + fromRect.width / 2 + window.scrollX;
            const fromY = fromRect.top + fromRect.height / 2 + window.scrollY;
            const toX = toRect.left + toRect.width / 2 + window.scrollX;
            const toY = toRect.top + toRect.height / 2 + window.scrollY; // Fix: was using fromRect

            const arrow = this.createArrowPath(fromX, fromY, toX, toY);
            svg.appendChild(arrow);
        }
    }

    static createArrowPath(x1, y1, x2, y2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const offset = 18;
        const startX = x1 + Math.cos(angle) * offset;
        const startY = y1 + Math.sin(angle) * offset;
        const endX = x2 - Math.cos(angle) * offset;
        const endY = y2 - Math.sin(angle) * offset;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', '#5b9bd5');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        return line;
    }

    static highlightTabOrderElement(orderNumber) {
        const sortedElements = DomModel.getFocusableElements();
        const targetElement = sortedElements[orderNumber - 1];
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            this.blinkElementBoundingBox(targetElement);
        }
    }

    static blinkElementBoundingBox(element) {
        this.removeBoundingBox();
        const boundingBox = document.createElement('div');
        boundingBox.className = '__tab_order_bounding_box';
        const rect = element.getBoundingClientRect();

        boundingBox.style.position = 'absolute';
        boundingBox.style.left = `${rect.left + window.scrollX - 4}px`;
        boundingBox.style.top = `${rect.top + window.scrollY - 4}px`;
        boundingBox.style.width = `${rect.width + 8}px`;
        boundingBox.style.height = `${rect.height + 8}px`;
        boundingBox.style.border = '3px solid #fbbf24';
        boundingBox.style.borderRadius = '4px';
        boundingBox.style.pointerEvents = 'none';
        boundingBox.style.zIndex = '2147483647';
        boundingBox.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.3)';

        document.body.appendChild(boundingBox);
    }

    static removeBoundingBox() {
        const existing = document.querySelector('.__tab_order_bounding_box');
        if (existing) existing.remove();
    }

    // --- General Overlay (Structure / Highlights) ---

    static ensureOverlayContainer() {
        let container = document.getElementById(HIGHLIGHT_OVERLAY_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = HIGHLIGHT_OVERLAY_ID;
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            const doc = document.documentElement;
            const body = document.body;
            const width = Math.max(doc.scrollWidth, body.scrollWidth);
            const height = Math.max(doc.scrollHeight, body.scrollHeight);
            container.style.width = width + 'px';
            container.style.height = height + 'px';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '2147483647';
            document.body.appendChild(container);
        } else {
            const doc = document.documentElement;
            const body = document.body;
            container.style.width = Math.max(doc.scrollWidth, body.scrollWidth) + 'px';
            container.style.height = Math.max(doc.scrollHeight, body.scrollHeight) + 'px';
        }
        return container;
    }

    static createOverlay(node, itemData) {
        const container = this.ensureOverlayContainer();
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollLeft || document.documentElement.scrollLeft;

        const labelInfo = itemData ? { text: itemData.name || itemData.tag, type: itemData.type, tag: itemData.tag } : this.getBadgeInfo(node);
        let badgeContent = null;

        if (labelInfo) {
            const type = labelInfo.type;
            const tag = labelInfo.tag || labelInfo.text;

            if (type === 'heading') {
                badgeContent = document.createElement('span');
                badgeContent.textContent = tag;
                badgeContent.style.fontFamily = 'monospace';
            } else if (type === 'landmark' || type === 'region') {
                badgeContent = document.createElement('span');
                badgeContent.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display:block;"><rect x="4" y="6" width="16" height="2" rx="1" /><rect x="4" y="11" width="16" height="2" rx="1" /><rect x="4" y="16" width="16" height="2" rx="1" /></svg>`;
            } else if (tag === 'button' || type === 'button') {
                badgeContent = document.createElement('span');
                badgeContent.textContent = 'Btn';
            } else if (tag === 'label') {
                badgeContent = document.createElement('span');
                badgeContent.textContent = 'Lbl';
            } else {
                badgeContent = document.createElement('span');
                badgeContent.textContent = tag ? tag.substring(0, 2) : 'El';
            }
        }

        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = (rect.top + scrollTop) + 'px';
        overlay.style.left = (rect.left + scrollLeft) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.border = '2px dashed #005a9c';
        overlay.style.boxSizing = 'border-box';
        overlay.style.pointerEvents = 'none';

        if (badgeContent) {
            const badge = document.createElement('div');
            badge.style.position = 'absolute';
            badge.style.top = '-22px';
            badge.style.left = '-2px';
            badge.style.backgroundColor = '#005a9c';
            badge.style.color = 'white';
            badge.style.fontSize = '11px';
            badge.style.fontWeight = 'bold';
            badge.style.padding = '3px 5px';
            badge.style.borderRadius = '3px';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
            badge.style.whiteSpace = 'nowrap';
            badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            badge.style.zIndex = '2147483648';

            if ((rect.top + scrollTop) < 25) {
                badge.style.top = '0';
            }

            badge.appendChild(badgeContent);
            overlay.appendChild(badge);
        }

        container.appendChild(overlay);
    }

    static getBadgeInfo(node) {
        if (!node) return null;
        const tag = node.tagName.toLowerCase();
        const role = node.getAttribute('role');

        if (tag.startsWith('h') && tag.length === 2) return { text: tag, type: 'heading' };
        if (tag === 'nav' || role === 'navigation') return { text: 'navigation', type: 'landmark' };
        if (tag === 'main' || role === 'main') return { text: 'main', type: 'landmark' };
        if (tag === 'header' || role === 'banner') return { text: 'header', type: 'landmark' };
        if (tag === 'footer' || role === 'contentinfo') return { text: 'footer', type: 'landmark' };
        if (tag === 'aside' || role === 'complementary') return { text: 'aside', type: 'landmark' };
        if (tag === 'section' || role === 'region') return { text: 'section', type: 'landmark' };
        if (tag === 'form' || role === 'form') return { text: 'form', type: 'landmark' };
        if (tag === 'div' && role === 'search') return { text: 'search', type: 'landmark' };
        if (tag === 'button' || role === 'button') return { text: 'button', type: 'content' };
        if (tag === 'img' || role === 'img') return { text: 'image', type: 'content' };
        if (tag === 'a') return { text: 'link', type: 'content' };
        if (tag === 'ul' || tag === 'ol') return { text: 'list', type: 'content' };
        if (tag === 'table') return { text: 'table', type: 'content' };
        if (tag === 'label') return { text: 'label', type: 'content' };
        if (node.getAttribute('aria-label')) return { text: 'aria-label', type: 'other' };

        return { text: tag, type: 'other' };
    }

    static clearOverlays() {
        const container = document.getElementById(HIGHLIGHT_OVERLAY_ID);
        if (container) container.remove();
    }
}
