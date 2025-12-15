// content/runner.js - runs in the isolated world injected by Chrome.
// axe.min.js is declared ahead of this file in manifest.json, so `window.axe`
// is already available here regardless of page CSP settings.

const HIGHLIGHT_CLASS = '__axe_extension_highlight';
const HIGHLIGHT_STYLE_ID = '__axe_extension_highlight_style';
const HIGHLIGHT_OVERLAY_ID = '__axe_extension_overlay_container';
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

  if (message.type === 'show-structure-badges') {
    showAllBadges();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'get-structure') {
    const structure = getStructure();
    sendResponse({ ok: true, structure });
    return;
  }

  if (message.type === 'scroll-to-element') {
    const path = message.path;
    const element = resolvePath(path);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Find the item data from our cache to ensure consistent overlay
      const itemData = lastStructureElements.find(item => item.path === path);

      clearHighlights();
      // If we have precise data, use it; otherwise fallback to generic
      if (itemData) {
        createOverlay(element, itemData);
      } else {
        applyHighlight(element);
      }
    }
    sendResponse({ ok: true });
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



// Try to resolve an element by path (supports '#id' and our simple xpath-like path)
function resolvePath(path) {
  try {
    if (!path) return null;
    if (path[0] === '#') return document.getElementById(path.slice(1));
    const parts = path.split('/').filter(Boolean);
    let el = document.documentElement;
    for (let i = 1; i < parts.length && el; i++) {
      const m = parts[i].match(/^([a-z0-9]+)\[(\d+)\]$/i);
      if (!m) { el = null; break; }
      const tag = m[1];
      const idx = parseInt(m[2], 10);
      let count = 0;
      let found = null;
      for (const c of el.children) {
        if (c.tagName && c.tagName.toLowerCase() === tag) {
          count++;
          if (count === idx) { found = c; break; }
        }
      }
      el = found;
    }
    return el;
  } catch (e) {
    return null;
  }
}

let lastStructureElements = []; // Cache found elements

function getStructure(options = {}) {
  // ... (existing helper vars)
  // We need to keep the original logic but ensure we capture the results into lastStructureElements before returning
  // However, getStructure is large. Let's just hook into the return.

  // WRAPPER logic to avoid rewriting the whole huge function if possible, 
  // OR just update the end of getStructure.
  // Since I can't wrap easily with replace_file_content without context, 
  // I will rely on the fact that I can edit the END of getStructure.

  // Actually, wait, `getStructure` is defined below. I'll modify the end of `getStructure` later in this call.
  // For now let's add the showAllBadges helper.
}

function showAllBadges() {
  clearHighlights();
  ensureOverlayContainer(); // Helper to create container if missing

  // If we haven't scanned yet, we might need to scanning. 
  // But usually the panel calls getStructure first. 
  // If lastStructureElements is empty, maybe re-scan?
  if (!lastStructureElements || lastStructureElements.length === 0) {
    getStructure(); // This will populate lastStructureElements
  }

  lastStructureElements.forEach(item => {
    // Re-find element by path or unique ID if possible
    const el = resolvePath(item.path);
    if (el) {
      createOverlay(el, item); // Pass the item data for icon generation
    }
  });
}

function highlightTargets(selectorsOrPaths) {
  clearHighlights();
  if (!Array.isArray(selectorsOrPaths) || selectorsOrPaths.length === 0) {
    return;
  }

  selectorsOrPaths.forEach((item) => {
    try {
      let element = null;
      // Assume item could be a selector or our custom path
      if (typeof item === 'string') {
        if (item.startsWith('/') || item.startsWith('#')) {
          element = resolvePath(item);
        } else {
          // Try as selector
          const nodes = document.querySelectorAll(item);
          nodes.forEach(node => applyHighlight(node));
          return;
        }
      }
      if (element) applyHighlight(element);
    } catch (e) {
      // ignore invalid selector/path
    }
  });
}

function ensureOverlayContainer() {
  let container = document.getElementById(HIGHLIGHT_OVERLAY_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = HIGHLIGHT_OVERLAY_ID;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    // Use max scroll dimensions to cover the entire potential page
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(
      doc.scrollWidth, doc.offsetWidth, doc.clientWidth,
      body.scrollWidth, body.offsetWidth, body.clientWidth
    );
    const height = Math.max(
      doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
      body.scrollHeight, body.offsetHeight, body.clientHeight
    );

    container.style.width = width + 'px';
    container.style.height = height + 'px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483647';
    // Remove overflow hidden so it doesn't clip if calculations are slightly off or if content expands
    // container.style.overflow = 'hidden'; 
    document.body.appendChild(container);
  } else {
    // Update dimensions in case the page grew
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(
      doc.scrollWidth, doc.offsetWidth, doc.clientWidth,
      body.scrollWidth, body.offsetWidth, body.clientWidth
    );
    const height = Math.max(
      doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
      body.scrollHeight, body.offsetHeight, body.clientHeight
    );
    container.style.width = width + 'px';
    container.style.height = height + 'px';
  }
  return container;
}

function createOverlay(node, itemData) {
  const container = ensureOverlayContainer();

  const rect = node.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return; // Skip invisible

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollLeft || document.documentElement.scrollLeft;

  // Use badge info from itemData (from getStructure) or fall back to on-the-fly calc
  const labelInfo = itemData ? { text: itemData.name || itemData.tag, type: itemData.type, tag: itemData.tag } : getBadgeInfo(node);
  // Refine label if we have itemData
  let badgeContent = null;

  // Simulate icons from React (roughly)
  if (labelInfo) {
    const type = labelInfo.type;
    const tag = labelInfo.tag || labelInfo.text; // fallback

    if (type === 'heading') {
      badgeContent = document.createElement('span');
      badgeContent.textContent = tag;
      badgeContent.style.fontFamily = 'monospace';
    } else if (type === 'landmark' || type === 'region') {
      // SVG Icon
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
  overlay.style.border = '2px dashed #005a9c'; // Blue border
  overlay.style.boxSizing = 'border-box';
  overlay.style.pointerEvents = 'none';

  // Badge Container
  if (badgeContent) {
    const badge = document.createElement('div');
    badge.style.position = 'absolute';
    badge.style.top = '-22px';
    badge.style.left = '-2px';
    badge.style.backgroundColor = '#005a9c';
    badge.style.color = 'white';
    // badge.style.fontSize = '12px';
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

    // Flip if top
    if ((rect.top + scrollTop) < 25) {
      badge.style.top = '0';
    }

    badge.appendChild(badgeContent);
    overlay.appendChild(badge);
  }

  container.appendChild(overlay);
}

function applyHighlight(node) {
  if (!node) return;
  // Use overlay instead of outline
  // For simple highlight, we might not have the Item data (type/tag) computed if we just pass a node.
  // We can try to compute it on the fly or just use a generic one.
  // Let's generic for simple highlight, but try to guess content.
  createOverlay(node, getBadgeInfo(node));
}

function clearHighlights() {
  const container = document.getElementById(HIGHLIGHT_OVERLAY_ID);
  if (container) {
    container.remove();
  }
}

function getBadgeInfo(node) {
  if (!node) return null;
  const tag = node.tagName.toLowerCase();
  const role = node.getAttribute('role');

  // Headings
  if (tag.startsWith('h') && tag.length === 2) {
    return { text: tag, type: 'heading' };
  }

  // Landmarks & Structure
  if (tag === 'nav' || role === 'navigation') return { text: 'navigation', type: 'landmark' };
  if (tag === 'main' || role === 'main') return { text: 'main', type: 'landmark' };
  if (tag === 'header' || role === 'banner') return { text: 'header', type: 'landmark' };
  if (tag === 'footer' || role === 'contentinfo') return { text: 'footer', type: 'landmark' };
  if (tag === 'aside' || role === 'complementary') return { text: 'aside', type: 'landmark' };
  if (tag === 'section' || role === 'region') return { text: 'section', type: 'landmark' };
  if (tag === 'form' || role === 'form') return { text: 'form', type: 'landmark' };
  if (tag === 'div' && role === 'search') return { text: 'search', type: 'landmark' };

  // Other Content
  if (tag === 'button' || role === 'button') return { text: 'button', type: 'content' };
  if (tag === 'img' || role === 'img') return { text: 'image', type: 'content' };
  if (tag === 'a') return { text: 'link', type: 'content' };
  if (tag === 'ul' || tag === 'ol') return { text: 'list', type: 'content' };
  if (tag === 'table') return { text: 'table', type: 'content' };
  if (tag === 'label') return { text: 'label', type: 'content' };

  // Fallback?
  // If it was selected by our structure algorithm, it probably has some significance.
  if (node.getAttribute('aria-label')) return { text: 'aria-label', type: 'other' };

  return { text: tag, type: 'other' };
}

function getStructure(options = {}) {
  const MAX_ITEMS = typeof options.maxItems === 'number' ? options.maxItems : 10000;

  const STRUCTURAL_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'nav', 'main', 'footer', 'aside',
    'section', 'article',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'caption', 'th',
    'form', 'fieldset', 'legend', 'label', 'iframe', 'a',
    'input', 'select', 'textarea', 'audio', 'video', 'object', 'embed', 'applet', 'noscript'
  ]);
  const STRUCTURAL_ROLES = new Set([
    'banner', 'main', 'navigation', 'contentinfo', 'complementary', 'search', 'form', 'region', 'alert', 'application',
    'menu', 'menubar', 'button'
  ]);

  function accessibleName(el) {
    if (!el || el.nodeType !== 1) return '';
    const tag = el.tagName.toLowerCase();

    // 1. ARIA Label (highest priority)
    const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // 2. ARIA LabelledBy
    const labelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
    if (labelledBy) {
      try {
        const ids = labelledBy.trim().split(/\s+/);
        const texts = ids.map(id => {
          const ref = document.getElementById(id);
          if (ref) return (ref.innerText || ref.textContent || '').trim();
          return '';
        }).filter(Boolean);
        if (texts.length) return texts.join(' ').trim();
      } catch (e) { /* ignore */ }
    }

    // 3. ARIA Role Description
    const roleDesc = el.getAttribute && el.getAttribute('aria-roledescription');
    if (roleDesc) return roleDesc.trim();

    // 4. Alt / Title
    if (el.alt) return String(el.alt).trim();
    if (el.title) return String(el.title).trim();

    // 5. Visible Text (Conditional)
    // Only for specific content-heavy tags: headings, nav, lists, footer, links, labels, table parts
    const CONTENT_TAGS = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'nav', 'footer',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'a',
      'label', 'legend', 'caption', 'th', 'button'
    ]);

    if (CONTENT_TAGS.has(tag)) {
      let txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      // Truncate long text
      if (txt.length > 50) txt = txt.substring(0, 50) + '...';
      if (txt) return txt;
    }

    return '';
  }

  function rectFor(el) {
    try {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
    } catch (e) { return null; }
  }

  function pathFor(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id) return '#' + el.id;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      const tag = node.tagName.toLowerCase();
      let i = 1;
      let sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName && sib.tagName.toLowerCase() === tag) i++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(`${tag}[${i}]`);
      node = node.parentElement;
    }
    parts.unshift('html');
    return '/' + parts.join('/');
  }



  function scanDocument(rootDoc, frameInfo = null) {
    const results = [];
    let domIndex = 0;
    let truncated = false;
    let shadowRootsSkipped = false;
    const seenShadowHosts = new Set();

    function walk(node, inShadow = false, level = 0) {
      if (!node || results.length >= MAX_ITEMS) {
        if (results.length >= MAX_ITEMS) truncated = true;
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const role = (node.getAttribute && node.getAttribute('role')) ? node.getAttribute('role').toLowerCase() : null;

        const hasAriaLabel = node.hasAttribute('aria-label') || node.hasAttribute('aria-labelledby');
        const hasAriaDescribedBy = node.hasAttribute('aria-describedby');
        const hasAriaLive = node.hasAttribute('aria-live');
        const hasAriaExpanded = node.hasAttribute('aria-expanded');
        const hasAriaHasPopup = node.hasAttribute('aria-haspopup');
        const hasAriaHidden = node.hasAttribute('aria-hidden');
        const hasTabIndex = node.hasAttribute('tabindex');
        const isTh = tag === 'th';

        const isStructuralTag = STRUCTURAL_TAGS.has(tag);
        const isStructuralRole = role && STRUCTURAL_ROLES.has(role);

        let name = '';
        // Always compute name for checks
        name = accessibleName(node);



        const includeByTag = isStructuralTag && !((tag === 'section' || tag === 'article') && !name);
        const includeByRole = !!(isStructuralRole && !(role === 'region' && !name));
        const includeByAttr = hasAriaLabel || hasAriaDescribedBy || hasAriaLive || hasAriaExpanded || hasAriaHasPopup || hasAriaHidden || hasTabIndex;

        // Exclude links if they are inside a list item (as per user request)
        const isLinkInList = tag === 'a' && node.closest('li');
        const isSpan = tag === 'span';
        const isAnchor = tag === 'a';

        if (!isSpan && !isLinkInList && !isAnchor && (includeByTag || includeByRole || includeByAttr)) {
          let type = 'other';
          if (tag.startsWith('h') && tag.length === 2 && /^[h][1-6]$/.test(tag)) type = 'heading';
          else if (tag === 'table') type = 'table';
          else if (isStructuralRole) type = 'landmark';
          else if (tag === 'label') type = 'label';
          else if (tag === 'iframe') type = 'iframe';
          else if (hasAriaLive) type = 'live-region';

          if (type === 'other' || type === 'landmark') {
            if (role === 'button' || tag === 'button') type = 'button';
            else if (role === 'menu' || role === 'menubar') type = 'menu';
            else if (role === 'alert') type = 'alert';
            else if (role === 'search') type = 'search';
            else if (role === 'navigation' || tag === 'nav') type = 'navigation';
            else if (role === 'main' || tag === 'main') type = 'main';
            else if (role === 'contentinfo' || tag === 'footer') type = 'footer';
            else if (role === 'complementary' || tag === 'aside') type = 'aside';
            else if (role === 'banner' || tag === 'header') type = 'header';
            else if (role === 'form' || tag === 'form') type = 'form';
          }

          const id = node.id || null;
          const path = pathFor(node);
          const rect = rectFor(node);
          const childrenCount = node.children ? node.children.length : 0;

          results.push({
            type: type,
            tag: tag,
            role: role || null,
            name: name || null,
            id: id,
            path: path,
            rect: rect,
            domIndex: domIndex++,
            childrenCount: childrenCount,
            inShadow: !!inShadow,
            frame: frameInfo,
            level: level, // Include hierarchy level
            attributes: {
              ariaLabel: node.getAttribute('aria-label'),
              ariaLabelledBy: node.getAttribute('aria-labelledby'),
              ariaDescribedBy: node.getAttribute('aria-describedby'),
              ariaLive: node.getAttribute('aria-live'),
              ariaExpanded: node.getAttribute('aria-expanded'),
              ariaHasPopup: node.getAttribute('aria-haspopup'),
              ariaHidden: node.getAttribute('aria-hidden'),
              tabIndex: node.getAttribute('tabindex'),
              scope: node.getAttribute('scope')
            }
          });

          // If this node is structural, children should be next level
          // Note: We only increment level if we actually added this node as structural
          // AND we recurse. 
          // For non-structural wrapper divs, we don't want to increment level?
          // Actually, the user wants "indent with respect to its heading" (meaning parent structural element).
          // So if we found a structural element, we increment level for its children scan.
          level++;
        }

        try {
          if (node.shadowRoot) {
            seenShadowHosts.add(node);
            for (const ch of Array.from(node.shadowRoot.children)) {
              walk(ch, true, level);
              if (truncated) return;
            }
          } else if (typeof node.attachShadow === 'function' && node.shadowRoot === null) {
            shadowRootsSkipped = true;
          }
        } catch (e) { }

        if (tag === 'iframe') {
          try {
            const childDoc = node.contentDocument;
            if (childDoc) {
              const iframeSrc = node.getAttribute('src') || null;
              const childFrameInfo = { src: iframeSrc, title: node.getAttribute('title') || null };
              const childResults = scanDocument(childDoc, childFrameInfo); // Recursive scan starts at level 0 relative to iframe? Or inherit? Inherit might be better but complexity. Let's restart 0 for now or pass level.
              // Actually for iframe content, it's effectively a new document root, but logically nested.
              // Let's keep it simple and not pass level to scanDocument for now, or just append.
              // The original code merged results.
              for (const cr of childResults.structuralElements) {
                // Adjust level for iframe content?
                // For simplicity, let's leave iframe content levels as is (relative to their doc) or add current level.
                // Let's add current level to make them appear nested.
                cr.level = (cr.level || 0) + level;
                results.push(cr);
              }
            }
          } catch (e) { }
        }
      }

      if (node.children && node.children.length) {
        for (const child of Array.from(node.children)) {
          walk(child, inShadow, level); // Pass current level (which might have been incremented if node was structural)
          if (truncated) return;
        }
      }
    }

    try {
      const startRoot = rootDoc.body || rootDoc.documentElement;
      if (startRoot) walk(startRoot, false, 0);
    } catch (e) { }

    return { structuralElements: results, truncated: truncated, shadowRootsSkipped: shadowRootsSkipped };
  }

  const topScan = scanDocument(document, { src: window.location.href, title: document.title || null });
  const structuralElements = topScan.structuralElements || [];

  let hasMain = false;
  let mainCount = 0;
  const headings = [];
  let unnamedRegionsCount = 0;
  let scannedIframes = 0;
  let unscannableIframes = 0;
  let shadowRootsSkipped = !!topScan.shadowRootsSkipped || false;

  for (const item of structuralElements) {
    if (item.tag === 'main' || (item.role && item.role === 'main')) {
      hasMain = true;
      mainCount++;
    }
    if (item.type === 'heading') {
      const lvl = parseInt(item.tag.substring(1), 10);
      headings.push({ domIndex: item.domIndex, level: lvl });
    }
    if ((item.tag === 'section' || item.tag === 'article' || (item.role === 'region')) && !item.name) {
      unnamedRegionsCount++;
    }
  }



  const result = {
    url: window.location.href,
    title: document.title || null,
    timestamp: Date.now(),
    structuralElements: structuralElements
  };

  lastStructureElements = structuralElements; // Cache for overlay
  return result;
}



// Cleanup on tab switch
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearHighlights();
    hideTabOrderOverlay();
  }
});
