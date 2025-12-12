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

  if (message.type === 'get-tab-order') {
    try {
      const tabOrderData = getTabOrder();
      sendResponse({ ok: true, data: tabOrderData });
    } catch (error) {
      sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
    }
    return;
  }

  if (message.type === 'highlight-nodes-contrast') {
    highlightTargetsContrast(message.selectors || []);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'show-tab-order-overlay') {
    try {
      showTabOrderOverlay();
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
    }
    return;
  }

  if (message.type === 'hide-tab-order-overlay') {
    hideTabOrderOverlay();
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


    if (message.type === 'highlight-tab-order-element') {
    try {
      highlightTabOrderElement(message.orderNumber);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
    }
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


function highlightTargets(selectors) {
  clearHighlights();
  if (!Array.isArray(selectors) || selectors.length === 0) {
    return;
  }
  ensureHighlightStyle();
  selectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((node) => applyHighlight(node));
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


  function applyHighlight(node) {
  if (!node) return;
  if (!node.__axePrevStyles) {
    node.__axePrevStyles = {
      outline: node.style.outline,
      outlineOffset: node.style.outlineOffset,
      boxShadow: node.style.boxShadow
    };
  }
  node.classList.add(HIGHLIGHT_CLASS);
  node.style.outline = '3px dashed rgba(255,0,0,0.9)';
  node.style.outlineOffset = '3px';
  node.style.boxShadow = '0 0 0 3px rgba(255,0,0,0.12)';
}

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

function getTabOrder() {
  // Get all potentially focusable elements in the document
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]', // Include all tabindex elements (we'll filter -1 later)
    'area[href]',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]', // Only true, not false
    'audio[controls]',
    'video[controls]',
    'summary',
    // Custom interactive elements with ARIA roles
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="slider"]',
    '[role="spinbutton"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[role="textbox"]',
    '[role="searchbox"]',
    '[role="combobox"]'
  ];

  const elements = Array.from(document.querySelectorAll(focusableSelectors.join(', ')));

  // Filter elements based on focusability rules
  const focusableElements = elements.filter(el => {
    // Check if element has tabindex="-1" (explicitly removed from tab order)
    const tabindex = el.getAttribute('tabindex');
    if (tabindex === '-1') {
      return false;
    }

    // Check if element is disabled
    if (el.disabled || el.hasAttribute('disabled')) {
      return false;
    }

    // Check if element is hidden
    if (el.hasAttribute('hidden')) {
      return false;
    }

    // Check computed styles for visibility
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Check if element has zero dimensions (effectively hidden)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check if any parent is hidden
    let parent = el.parentElement;
    while (parent) {
      if (parent.hasAttribute('hidden')) {
        return false;
      }
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
        return false;
      }
      parent = parent.parentElement;
    }

    // For custom interactive elements (div, span with roles), check if they have tabindex
    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const interactiveRoles = [
      'button', 'link', 'checkbox', 'radio', 'slider', 'spinbutton',
      'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'option', 'textbox', 'searchbox', 'combobox'
    ];

    if ((tagName === 'div' || tagName === 'span') && interactiveRoles.includes(role)) {
      // Custom interactive elements must have tabindex to be focusable
      if (!el.hasAttribute('tabindex') || tabindex === '-1') {
        return false;
      }
    }

    // Check if contenteditable is explicitly false
    if (el.getAttribute('contenteditable') === 'false') {
      return false;
    }

    return true;
  });

  // Remove duplicates (an element might match multiple selectors)
  const uniqueElements = [...new Set(focusableElements)];

  // Sort by tab index following the HTML spec:
  // 1. Elements with positive tabindex (1, 2, 3...) in ascending order
  // 2. Elements with tabindex="0" or no tabindex in DOM order
  // 3. Elements with tabindex="-1" are excluded (already filtered above)
  const sortedElements = uniqueElements.sort((a, b) => {
    const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
    const bIndex = parseInt(b.getAttribute('tabindex')) || 0;

    // Both have positive tabindex - sort by value
    if (aIndex > 0 && bIndex > 0) {
      return aIndex - bIndex;
    }

    // Only 'a' has positive tabindex - it comes first
    if (aIndex > 0) {
      return -1;
    }

    // Only 'b' has positive tabindex - it comes first
    if (bIndex > 0) {
      return 1;
    }

    // Both have tabindex 0 or no tabindex - maintain DOM order
    // Compare their position in the document
    if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    return 1;
  });

  // Build the tab order data with tabindex information
  return sortedElements.map((el, index) => {
    const tabindex = el.getAttribute('tabindex');
    return {
      order: index + 1,
      role: getElementRole(el),
      name: getAccessibleName(el),
      tabindex: tabindex ? parseInt(tabindex) : (isNaturallyFocusable(el) ? 0 : null)
    };
  });
}

// Helper function to check if element is naturally focusable
function isNaturallyFocusable(element) {
  const tagName = element.tagName.toLowerCase();
  const naturallyFocusable = [
    'a', 'button', 'input', 'select', 'textarea', 'area',
    'iframe', 'object', 'embed', 'audio', 'video', 'summary'
  ];

  if (naturallyFocusable.includes(tagName)) {
    // Check specific conditions
    if (tagName === 'a' || tagName === 'area') {
      return element.hasAttribute('href');
    }
    if (tagName === 'audio' || tagName === 'video') {
      return element.hasAttribute('controls');
    }
    return true;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

function getElementRole(element) {
  // Check for explicit ARIA role
  const ariaRole = element.getAttribute('role');
  if (ariaRole) {
    return capitalizeFirst(ariaRole);
  }

  // Determine implicit role based on tag name
  const tagName = element.tagName.toLowerCase();
  const roleMap = {
    'a': 'Link',
    'button': 'Button',
    'input': getInputRole(element),
    'select': 'Combobox',
    'textarea': 'Textbox',
    'summary': 'Summary',
    'img': 'Image',
    'nav': 'Navigation',
    'main': 'Main',
    'header': 'Banner',
    'footer': 'Contentinfo',
    'aside': 'Complementary',
    'section': 'Region',
    'article': 'Article',
    'form': 'Form',
    'table': 'Table',
    'dialog': 'Dialog'
  };

  return roleMap[tagName] || 'Element';
}

function getInputRole(inputElement) {
  const type = inputElement.getAttribute('type') || 'text';
  const inputRoleMap = {
    'button': 'Button',
    'checkbox': 'Checkbox',
    'radio': 'Radio',
    'range': 'Slider',
    'search': 'Searchbox',
    'email': 'Textbox',
    'tel': 'Textbox',
    'url': 'Textbox',
    'number': 'Spinbutton'
  };
  return inputRoleMap[type] || 'Textbox';
}

function getAccessibleName(element) {
  // Priority order for accessible name:
  // 1. aria-label
  // 2. aria-labelledby
  // 3. label element (for form controls)
  // 4. alt text (for images)
  // 5. title attribute
  // 6. text content
  // 7. placeholder
  // 8. value (for buttons/inputs)

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // Check aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) {
      return labelElement.textContent.trim();
    }
  }

  // Check for associated label (for form controls)
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }

  // Check if wrapped in a label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.trim();
  }

  // Check alt attribute (for images)
  const alt = element.getAttribute('alt');
  if (alt !== null) {
    return alt.trim() || '(empty alt text)';
  }

  // Check title attribute
  const title = element.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  // Check text content (for links, buttons, etc.)
  const textContent = element.textContent.trim();
  if (textContent) {
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
  }

  // Check placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return placeholder.trim();
  }

  // Check value (for buttons and inputs)
  const value = element.getAttribute('value');
  if (value && value.trim()) {
    return value.trim();
  }

  // Check href for links
  if (element.tagName.toLowerCase() === 'a') {
    const href = element.getAttribute('href');
    if (href) {
      return href;
    }
  }

  return '(no accessible name)';
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Tab Order Overlay Functions
const TAB_ORDER_OVERLAY_CLASS = '__tab_order_overlay';
const TAB_ORDER_STYLE_ID = '__tab_order_overlay_style';

function showTabOrderOverlay() {
  // First, hide any existing overlay
  hideTabOrderOverlay();

  // Get tab order data
  const tabOrderData = getTabOrder();

  // Inject overlay styles
  injectOverlayStyles();

  // Get all focusable elements using the same logic as getTabOrder
  const sortedElements = getFocusableElements();

  // Create overlay badges for each element and collect them
  const badges = [];
  sortedElements.forEach((element, index) => {
    const badge = createOverlayBadge(element, index + 1);
    badges.push(badge);
  });

  // Create arrow connectors between badges
  createArrowConnectors(badges);
}

// Shared helper function to get focusable elements with proper filtering and sorting
function getFocusableElements() {
  // Get all potentially focusable elements in the document
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]',
    'area[href]',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="slider"]',
    '[role="spinbutton"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[role="textbox"]',
    '[role="searchbox"]',
    '[role="combobox"]'
  ];

  const elements = Array.from(document.querySelectorAll(focusableSelectors.join(', ')));

  // Filter elements based on focusability rules
  const focusableElements = elements.filter(el => {
    const tabindex = el.getAttribute('tabindex');
    if (tabindex === '-1') return false;
    if (el.disabled || el.hasAttribute('disabled')) return false;
    if (el.hasAttribute('hidden')) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    let parent = el.parentElement;
    while (parent) {
      if (parent.hasAttribute('hidden')) return false;
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }

    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const interactiveRoles = [
      'button', 'link', 'checkbox', 'radio', 'slider', 'spinbutton',
      'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'option', 'textbox', 'searchbox', 'combobox'
    ];

    if ((tagName === 'div' || tagName === 'span') && interactiveRoles.includes(role)) {
      if (!el.hasAttribute('tabindex') || tabindex === '-1') return false;
    }

    if (el.getAttribute('contenteditable') === 'false') return false;

    return true;
  });

  const uniqueElements = [...new Set(focusableElements)];

  // Sort by tab index following HTML spec
  return uniqueElements.sort((a, b) => {
    const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
    const bIndex = parseInt(b.getAttribute('tabindex')) || 0;

    if (aIndex > 0 && bIndex > 0) return aIndex - bIndex;
    if (aIndex > 0) return -1;
    if (bIndex > 0) return 1;

    if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    return 1;
  });
}

function createOverlayBadge(element, orderNumber) {
  const rect = element.getBoundingClientRect();

  // Create badge element
  const badge = document.createElement('div');
  badge.className = TAB_ORDER_OVERLAY_CLASS;
  badge.textContent = orderNumber;

  // Position the badge - use absolute positioning so it scrolls with the page
  badge.style.position = 'absolute';
  badge.style.left = `${rect.left + window.scrollX}px`;
  badge.style.top = `${rect.top + window.scrollY}px`;
  badge.style.zIndex = '2147483647'; // Maximum z-index

  // Store reference to the element
  badge.dataset.targetElement = getElementSelector(element);

  // Append to body
  document.body.appendChild(badge);

  // Store reference on element for cleanup
  if (!element.__tabOrderBadge) {
    element.__tabOrderBadge = badge;
  }

  return badge;
}

function createArrowConnectors(badges) {
  if (badges.length < 2) return; // Need at least 2 badges to draw arrows

  // Create SVG container
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', '__tab_order_arrows');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = `${document.documentElement.scrollWidth}px`;
  svg.style.height = `${document.documentElement.scrollHeight}px`;
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '2147483646'; // Just below badges

  // Create arrowhead marker definition first
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

  // Draw arrows between consecutive badges
  for (let i = 0; i < badges.length - 1; i++) {
    const fromBadge = badges[i];
    const toBadge = badges[i + 1];

    const fromRect = fromBadge.getBoundingClientRect();
    const toRect = toBadge.getBoundingClientRect();

    // Calculate center points of badges (add scroll offset for absolute positioning)
    const fromX = fromRect.left + fromRect.width / 2 + window.scrollX;
    const fromY = fromRect.top + fromRect.height / 2 + window.scrollY;
    const toX = toRect.left + toRect.width / 2 + window.scrollX;
    const toY = toRect.top + toRect.height / 2 + window.scrollY;

    // Create arrow path
    const arrow = createArrowPath(fromX, fromY, toX, toY);
    svg.appendChild(arrow);
  }
}

function createArrowPath(x1, y1, x2, y2) {
  // Calculate angle and distance
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  // Shorten the line to not overlap with badges (14px radius each)
  const offset = 18; // Badge radius + small gap
  const startX = x1 + Math.cos(angle) * offset;
  const startY = y1 + Math.sin(angle) * offset;
  const endX = x2 - Math.cos(angle) * offset;
  const endY = y2 - Math.sin(angle) * offset;

  // Create path element for the line
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

function hideTabOrderOverlay() {
  // Remove all overlay badges
  const badges = document.querySelectorAll('.' + TAB_ORDER_OVERLAY_CLASS);
  badges.forEach(badge => badge.remove());

  // Remove arrow connectors
  const arrows = document.querySelector('.__tab_order_arrows');
  if (arrows) {
    arrows.remove();
  }

  // Remove arrowhead marker
  const arrowhead = document.getElementById('arrowhead');
  if (arrowhead) {
    arrowhead.parentElement?.remove(); // Remove the defs element containing the marker
  }

  // Remove bounding box if present
  const boundingBox = document.querySelector('.__tab_order_bounding_box');
  if (boundingBox) {
    boundingBox.remove();
  }

  // Clean up element references
  document.querySelectorAll('[class*="__tabOrderBadge"]').forEach(el => {
    delete el.__tabOrderBadge;
  });

  // Remove overlay styles
  const styleElement = document.getElementById(TAB_ORDER_STYLE_ID);
  if (styleElement) {
    styleElement.remove();
  }
}

function highlightTabOrderElement(orderNumber) {
  // Get all focusable elements using the same logic
  const sortedElements = getFocusableElements();

  // Find the element at this order position
  let targetElement = null;
  if (orderNumber > 0 && orderNumber <= sortedElements.length) {
    targetElement = sortedElements[orderNumber - 1];
  }

  if (!targetElement) {
    console.warn(`Element with order ${orderNumber} not found`);
    return;
  }

  // Get the position of the element
  const rect = targetElement.getBoundingClientRect();

  // Scroll to the element (center it in viewport)
  window.scrollTo({
    top: window.scrollY + rect.top - window.innerHeight / 2,
    left: window.scrollX + rect.left - window.innerWidth / 2,
    behavior: 'smooth'
  });

  // Create and blink the bounding box around the element
  blinkElementBoundingBox(targetElement);
}

function blinkElementBoundingBox(element) {
  // Remove any existing bounding box
  const existingBox = document.querySelector('.__tab_order_bounding_box');
  if (existingBox) {
    existingBox.remove();
  }

  // Create bounding box element
  const boundingBox = document.createElement('div');
  boundingBox.className = '__tab_order_bounding_box';

  // Position it over the element (use absolute positioning so it scrolls with the page)
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

  // Keep the bounding box visible (no blinking)
  // It will be removed when clicking another element or hiding overlay
}



function blinkBadge(badge) {
  // Store original styles
  const originalBackground = badge.style.background || '#5b9bd5';
  const originalTransform = badge.style.transform || '';

  // Add blinking animation class
  let blinkCount = 0;
  const maxBlinks = 3;

  const blinkInterval = setInterval(() => {
    if (blinkCount >= maxBlinks * 2) {
      clearInterval(blinkInterval);
      badge.style.background = originalBackground;
      badge.style.transform = originalTransform;
      return;
    }

    // Alternate between highlighted and normal
    if (blinkCount % 2 === 0) {
      badge.style.background = '#fbbf24'; // Yellow highlight
      badge.style.transform = 'scale(1.3)';
    } else {
      badge.style.background = originalBackground;
      badge.style.transform = 'scale(1)';
    }

    blinkCount++;
  }, 300); // Blink every 300ms
}

function injectOverlayStyles() {
  // Check if styles already exist
  if (document.getElementById(TAB_ORDER_STYLE_ID)) {
    return;
  }

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

function getElementSelector(element) {
  // Generate a simple selector for the element
  if (element.id) {
    return `#${element.id}`;
  }

  const tagName = element.tagName.toLowerCase();
  const className = element.className ? `.${element.className.split(' ')[0]}` : '';
  return `${tagName}${className}`;
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

