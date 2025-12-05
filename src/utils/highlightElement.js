/**
 * Utility functions for finding and highlighting elements in the DOM
 */

/**
 * Converts an XPath expression to a DOM element
 * @param {string} xpath - XPath expression
 * @param {Document} doc - Document to search in (defaults to window.document)
 * @returns {Element|null} Found element or null
 */
function xpathToElement(xpath, doc = document) {
    try {
        const result = doc.evaluate(
            xpath,
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    } catch (e) {
        return null;
    }
}

/**
 * Finds an element using various selector methods
 * @param {Object} selectorData - Object containing selector information
 * @param {Array<string>} selectorData.selectors - Array of CSS selectors
 * @param {string} selectorData.element_location - Element location string (may contain XPath or CSS)
 * @returns {Object} { element: Element|null, frame: Window|null }
 */
export function findElement(selectorData) {
    if (!selectorData) {
        return { element: null, frame: null };
    }

    const { selectors, element_location } = selectorData;
    let element = null;
    let targetFrame = window;

    // Try CSS selectors first
    if (Array.isArray(selectors) && selectors.length > 0) {
        for (const selector of selectors) {
            if (!selector || typeof selector !== 'string') continue;

            try {
                // Check if selector contains iframe reference
                const iframeMatch = selector.match(/iframe\[(\d+)\]/);
                if (iframeMatch) {
                    const iframeIndex = parseInt(iframeMatch[1], 10);
                    const iframes = document.querySelectorAll('iframe');
                    if (iframes[iframeIndex]) {
                        try {
                            targetFrame = iframes[iframeIndex].contentWindow;
                            const iframeDoc = iframes[iframeIndex].contentDocument;
                            if (iframeDoc) {
                                // Remove iframe reference from selector
                                const cleanSelector = selector.replace(/iframe\[\d+\]\s*>\s*/, '');
                                element = iframeDoc.querySelector(cleanSelector);
                                if (element) break;
                            }
                        } catch (e) {
                            // Cross-origin iframe, skip
                            continue;
                        }
                    }
                } else {
                    element = document.querySelector(selector);
                    if (element) break;
                }
            } catch (e) {
                // Invalid selector, continue
                continue;
            }
        }
    }

    // If not found, try element_location as CSS selector or XPath
    if (!element && element_location) {
        const locationStr = String(element_location).trim();
        
        // Try as CSS selector first
        try {
            element = document.querySelector(locationStr);
        } catch (e) {
            // Not a valid CSS selector, try XPath
            if (locationStr.startsWith('/') || locationStr.startsWith('//')) {
                element = xpathToElement(locationStr);
            }
        }
    }

    // Try finding by data attributes or aria labels if still not found
    if (!element && element_location) {
        const locationStr = String(element_location);
        
        // Try to extract ID or data attributes
        const idMatch = locationStr.match(/id=["']([^"']+)["']/);
        if (idMatch) {
            element = document.getElementById(idMatch[1]);
        }
        
        if (!element) {
            const ariaLabelMatch = locationStr.match(/aria-label=["']([^"']+)["']/);
            if (ariaLabelMatch) {
                element = document.querySelector(`[aria-label="${ariaLabelMatch[1]}"]`);
            }
        }
    }

    return { element, frame: targetFrame };
}

/**
 * Applies highlight styling to an element
 * @param {Element} element - Element to highlight
 */
export function applyHighlight(element) {
    if (!element) return;

    // Store original styles if not already stored
    if (!element.__axePrevStyles) {
        element.__axePrevStyles = {
            outline: element.style.outline,
            outlineOffset: element.style.outlineOffset,
            boxShadow: element.style.boxShadow,
            position: element.style.position,
            zIndex: element.style.zIndex
        };
    }

    // Apply highlight styles
    element.classList.add('__axe_extension_highlight');
    element.style.outline = '3px solid #00ff00';
    element.style.outlineOffset = '3px';
    element.style.boxShadow = '0 0 0 3px rgba(0, 255, 0, 0.3), 0 0 20px rgba(0, 255, 0, 0.5)';
    element.style.position = 'relative';
    element.style.zIndex = '999999';
}

/**
 * Removes highlight from an element
 * @param {Element} element - Element to remove highlight from
 */
export function removeHighlight(element) {
    if (!element) return;

    element.classList.remove('__axe_extension_highlight');
    
    if (element.__axePrevStyles) {
        element.style.outline = element.__axePrevStyles.outline || '';
        element.style.outlineOffset = element.__axePrevStyles.outlineOffset || '';
        element.style.boxShadow = element.__axePrevStyles.boxShadow || '';
        element.style.position = element.__axePrevStyles.position || '';
        element.style.zIndex = element.__axePrevStyles.zIndex || '';
        delete element.__axePrevStyles;
    } else {
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.boxShadow = '';
        element.style.position = '';
        element.style.zIndex = '';
    }
}

/**
 * Scrolls element into view smoothly
 * @param {Element} element - Element to scroll into view
 * @param {Window} frame - Window frame containing the element
 */
export function scrollIntoView(element, frame = window) {
    if (!element) return;

    try {
        // Scroll in the element's frame
        const scrollContainer = frame || window;
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });

        // Also scroll parent window if element is in iframe
        if (frame !== window && frame.parent) {
            const rect = element.getBoundingClientRect();
            const iframe = Array.from(document.querySelectorAll('iframe')).find(
                ifr => ifr.contentWindow === frame
            );
            if (iframe) {
                const iframeRect = iframe.getBoundingClientRect();
                const absoluteTop = iframeRect.top + rect.top;
                window.scrollTo({
                    top: absoluteTop - window.innerHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    } catch (e) {
        // Fallback to basic scroll
        try {
            element.scrollIntoView();
        } catch (e2) {
            // Ignore scroll errors
        }
    }
}

