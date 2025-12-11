// content/runner.js - runs in the isolated world injected by Chrome.
// axe.min.js is declared ahead of this file in manifest.json, so `window.axe`
// is already available here regardless of page CSP settings.

const HIGHLIGHT_CLASS = '__axe_extension_highlight';
const HIGHLIGHT_STYLE_ID = '__axe_extension_highlight_style';
let currentHighlightedElement = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'run-axe') {
    if (!(window.axe && typeof window.axe.run === 'function')) {
      sendResponse({ ok: false, error: 'axe runner is not available in this context.' });
      return;
    }
    const options = message.options || {};
    axe.run(document, options)
      .then((results) => {
        sendResponse({ ok: true, results });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
      });
    return true; // keep the channel open for async response
  }

  if (message.type === 'highlight-nodes') {
    // This seems to be legacy or unused, but keeping it safe. 
    // If it was intended for generic nodes, it shouldn't use highlightTargetsContrast with 'selectors'.
    // Assuming 'selectors' is an array of strings.
    highlightTargetsContrast(message.selectors || []);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'highlight-nodes-contrast') {
    highlightTargetsContrast(message.selectors || []);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'clear-highlights-contrast') {
    clearHighlightsContrast();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'highlight-element') {
    const result = highlightElement(message.selectorData);
    sendResponse({ ok: result.found, error: result.found ? null : (result.reason || 'Element not found') });
    return;
  }

  if (message.type === 'clear-highlights') {
    clearHighlightsContrast(); // Using the generic clear which handles both potentially? 
    // actually function clearHighlights() exists at line 374. Use that.
    clearHighlights();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'toggle-highlight') {
    const result = toggleHighlight(message.selectorData);
    sendResponse({
      ok: result.found,
      isHighlighted: result.isHighlighted,
      error: result.found ? null : (result.reason || 'Element not found')
    });
    return;
  }
});

/**
 * Converts XPath to DOM element
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
 */
function findElement(selectorData) {
  if (!selectorData) {
    return { element: null, frame: window, reason: 'No selector metadata available for this node.' };
  }

  const { selectors, element_location } = selectorData;
  let element = null;
  let targetFrame = window;
  let reason = 'Selectors did not match any nodes on the page.';

  const hasSelectors = Array.isArray(selectors) && selectors.length > 0;
  if (!hasSelectors && !element_location) {
    reason = 'Neither selectors nor element_location were provided.';
  }

  // Try CSS selectors first
  if (hasSelectors) {
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
                const cleanSelector = selector.replace(/iframe\[\d+\]\s*>\s*/, '');
                element = iframeDoc.querySelector(cleanSelector);
                if (element) {
                  reason = null;
                  break;
                }
              }
            } catch (e) {
              // Cross-origin iframe, skip
              reason = 'Cannot access cross-origin iframe content for selector.';
              continue;
            }
          }
        } else {
          element = document.querySelector(selector);
          if (element) {
            reason = null;
            break;
          }
        }
      } catch (e) {
        reason = `Invalid CSS selector: ${selector}`;
        continue;
      }
    }

    if (!element && !reason) {
      reason = 'Selectors did not match any nodes on the page.';
    }
  }

  // Try element_location as CSS selector or XPath
  if (!element && element_location) {
    const locationStr = String(element_location).trim();
    try {
      element = document.querySelector(locationStr);
      if (element) {
        reason = null;
      } else {
        reason = 'element_location selector did not match any nodes.';
      }
    } catch (e) {
      if (locationStr.startsWith('/') || locationStr.startsWith('//')) {
        element = xpathToElement(locationStr);
        reason = element ? null : 'XPath from element_location did not resolve to any nodes.';
      } else {
        reason = 'Invalid CSS selector provided in element_location.';
      }
    }
  }

  // Try finding by data attributes or aria labels
  if (!element && element_location) {
    const locationStr = String(element_location);
    const idMatch = locationStr.match(/id=["']([^"']+)["']/);
    if (idMatch) {
      element = document.getElementById(idMatch[1]);
      reason = element ? null : `No element found with id="${idMatch[1]}".`;
    }
    if (!element) {
      const ariaLabelMatch = locationStr.match(/aria-label=["']([^"']+)["']/);
      if (ariaLabelMatch) {
        element = document.querySelector(`[aria-label="${ariaLabelMatch[1]}"]`);
        reason = element ? null : `No element found with aria-label="${ariaLabelMatch[1]}".`;
      }
    }
  }

  return { element, frame: targetFrame, reason };
}

/**
 * Applies highlight styling to an element
 */

function applyHighlight(element) {
  if (!element) return;

  // Save previous inline styles only once
  if (!element.__axePrevStyles) {
    element.__axePrevStyles = {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      boxShadow: element.style.boxShadow,
      position: element.style.position,
      zIndex: element.style.zIndex
    };
  }

  element.classList.add(HIGHLIGHT_CLASS);

  // 🔥 Best universal highlight: Yellow outline + soft glow
  element.style.outline = '3px solid #FFD700'; // gold yellow
  element.style.outlineOffset = '4px';
  element.style.boxShadow =
    '0 0 0 3px rgba(255, 215, 0, 0.4), ' +    // inner glow
    '0 0 12px rgba(255, 215, 0, 0.8)';       // outer glow

  // Prevent overlapping styling issues
  element.style.position = 'relative';
  element.style.zIndex = '999999';
}





/**
 * Removes highlight from an element
 */
function removeHighlight(element) {
  if (!element) return;

  element.classList.remove(HIGHLIGHT_CLASS);

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
 */
function scrollIntoView(element, frame = window) {
  if (!element) return;

  try {
    const scrollContainer = frame || window;
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

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
    try {
      element.scrollIntoView();
    } catch (e2) {
      // Ignore scroll errors
    }
  }
}

function highlightTargetsContrast(selectors) {
  clearHighlightsContrast();
  if (!Array.isArray(selectors) || selectors.length === 0) {
    return;
  }
  ensureHighlightStyleContrast();
  let scrolled = false;
  selectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((node) => {
        applyHighlightContrast(node);
        if (!scrolled) {
          console.log('[Axe Extension] Scrolling to node:', node);
          node.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
          scrolled = true;
        }
      });
    } catch (e) {
      // ignore invalid selectors
    }
  });
}

function applyHighlightContrast(node) {
  if (!node) return;
  if (!node.__axePrevStyles) {
    node.__axePrevStyles = {
      outline: node.style.outline,
      outlineOffset: node.style.outlineOffset,
      boxShadow: node.style.boxShadow
    };
  }
  node.classList.add(HIGHLIGHT_CLASS);
  node.style.outline = '3px solid #39FF14';
  node.style.outlineOffset = '4px';
  node.style.boxShadow =
    '0 0 0 3px rgba(57, 255, 20, 0.45), ' + // inner glow 
    '0 0 12px rgba(57, 255, 20, 0.85)'; // outer glow;

  node.style.position = 'relative';
  node.style.zIndex = '99999';
}

function clearHighlightsContrast() {
  document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach((node) => {
    node.classList.remove(HIGHLIGHT_CLASS);
    if (node.__axePrevStyles) {
      node.style.outline = node.__axePrevStyles.outline || '';
      node.style.outlineOffset = node.__axePrevStyles.outlineOffset || '';
      node.style.boxShadow = node.__axePrevStyles.boxShadow || '';
      delete node.__axePrevStyles;
    } else {
      node.style.outline = '';
      node.style.outlineOffset = '';
      node.style.boxShadow = '';
    }
  });
}

/**
 * Highlights a single element based on selector data
 */
function highlightElement(selectorData) {
  clearHighlights();
  ensureHighlightStyle();

  const { element, frame, reason } = findElement(selectorData);

  if (element) {
    applyHighlight(element);
    scrollIntoView(element, frame);
    currentHighlightedElement = element;
    return { found: true };
  }

  return { found: false, reason };
}

/**
 * Toggles highlight on/off
 */
function toggleHighlight(selectorData) {
  const isCurrentlyHighlighted = currentHighlightedElement &&
    currentHighlightedElement.classList.contains(HIGHLIGHT_CLASS);

  if (isCurrentlyHighlighted) {
    clearHighlights();
    return { found: true, isHighlighted: false };
  } else {
    const result = highlightElement(selectorData);
    return { found: result.found, isHighlighted: result.found, reason: result.reason };
  }
}

/**
 * Clears all highlights
 */
function clearHighlights() {
  if (currentHighlightedElement) {
    removeHighlight(currentHighlightedElement);
    currentHighlightedElement = null;
  }

  // Also clear any remaining highlights (safety net)
  document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach((node) => {
    removeHighlight(node);
  });

  const style = document.getElementById(HIGHLIGHT_STYLE_ID);
  if (style) {
    style.remove();
  }
}

/**
 * Ensures highlight stylesheet is injected
 */
function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      position: relative !important;
      animation: __axe_pulse 2s ease-in-out infinite;
    }
    @keyframes __axe_pulse {
      0%, 100% {
        box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.3), 0 0 20px rgba(0, 255, 0, 0.5);
      }
      50% {
        box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.5), 0 0 30px rgba(0, 255, 0, 0.7);
      }
    }
  `;
  document.documentElement.appendChild(style);
}

function ensureHighlightStyleContrast() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      position: relative !important;
      animation: __axe_pulse 2s ease-in-out infinite;
    }
    @keyframes __axe_pulse {
      0%, 100% {
        box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.3), 0 0 20px rgba(0, 255, 0, 0.5);
      }
      50% {
        box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.5), 0 0 30px rgba(0, 255, 0, 0.7);
      }
    }
  `;
  document.documentElement.appendChild(style);
}

