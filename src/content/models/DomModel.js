/**
 * DomModel.js
 * Handles DOM traversal, element finding, and structure analysis.
 */

export class DomModel {
    /**
     * Finds an element using various selector methods
     */
    static findElement(selectorData) {
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

    static getTabOrder() {
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

        // Build the tab order data with stable identity and layout info
        return sortedElements.map((el, index) => {
            const tabindex = el.getAttribute('tabindex');
            const xpath = pathFor(el);
            const rect = el.getBoundingClientRect();

            const role = getElementRole(el);
            const name = getAccessibleName(el);

            // IMPORTANT: identity source must NOT include order/index
            const identitySource = `${xpath}|${role}|${name}`;

            return {
                element_key: `order:${DomModel.hash(identitySource)}`, // ✅ stable identity
                order: index + 1,                              // ✅ position stored separately
                role,
                name,
                tabindex: tabindex
                    ? parseInt(tabindex, 10)
                    : (isNaturallyFocusable(el) ? 0 : null),
                xpath,
                boundingBox: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                }
            };
        });

    }

    // Shared helper function to get focusable elements with proper filtering and sorting
    static getFocusableElements() {
        // Reusing the same logic as getTabOrder but returning elements
        // For DRY, we could extract the logic. 
        // For now I'll just call getTabOrder logic if needed, but getTabOrder returns mapped data.
        // Let's implement the core finder here.
        return this._getFocusableElementsList();
    }

    static _getFocusableElementsList() {
        const focusableSelectors = [
            'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
            'textarea:not([disabled])', '[tabindex]', 'area[href]', 'iframe', 'object', 'embed',
            '[contenteditable="true"]', 'audio[controls]', 'video[controls]', 'summary',
            '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
            '[role="slider"]', '[role="spinbutton"]', '[role="switch"]', '[role="tab"]',
            '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
            '[role="option"]', '[role="textbox"]', '[role="searchbox"]', '[role="combobox"]'
        ];
        const elements = Array.from(document.querySelectorAll(focusableSelectors.join(', ')));
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
                'button', 'link', 'checkbox', 'radio', 'slider', 'spinbutton', 'switch', 'tab',
                'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'textbox', 'searchbox', 'combobox'
            ];
            if ((tagName === 'div' || tagName === 'span') && interactiveRoles.includes(role)) {
                if (!el.hasAttribute('tabindex') || tabindex === '-1') return false;
            }
            if (el.getAttribute('contenteditable') === 'false') return false;
            return true;
        });
        const uniqueElements = [...new Set(focusableElements)];
        return uniqueElements.sort((a, b) => {
            const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
            const bIndex = parseInt(b.getAttribute('tabindex')) || 0;
            if (aIndex > 0 && bIndex > 0) return aIndex - bIndex;
            if (aIndex > 0) return -1;
            if (bIndex > 0) return 1;
            if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            return 1;
        });
    }

    static getStructure(options = {}) {
        const MAX_ITEMS = typeof options.maxItems === 'number' ? options.maxItems : 10000;

        /* 
           STRICT FILTERING BASED ON USER REQUEST:
           h1-h6, ol, ul, dl, header/banner, nav/navigation, search, main, aside/complementary,
           footer/contentinfo, region, table, caption, th, iframe, form, fieldset, legend, label,
           aria-label, aria-labelledby, aria-describedby, aria-region, alert, live, menu, menubar,
           button, aria-expanded, aria-haspopup, aria-tabindex (tabindex), aria-hidden.
        */

        const STRUCTURAL_TAGS = new Set([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ol', 'ul', 'dl',
            'header', 'nav', 'main', 'aside', 'footer',
            'table', 'caption', 'th',
            'iframe', 'form', 'fieldset', 'legend', 'label', 'button'
        ]);

        const STRUCTURAL_ROLES = new Set([
            'banner', 'navigation', 'search', 'main', 'complementary', 'contentinfo', 'region',
            'form', 'button', 'menu', 'menubar', 'alert', 'application'
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
            const CONTENT_TAGS = new Set([
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'nav', 'footer',
                'ul', 'ol', 'li', 'dl', 'dt', 'dd',
                'label', 'legend', 'caption', 'th', 'button'
            ]);

            if (CONTENT_TAGS.has(tag)) {
                let txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                if (txt.length > 50) txt = txt.substring(0, 50) + '...';
                if (txt) return txt;
            }

            return '';
        }

        function scanDocument(rootDoc, frameInfo = null) {
            const results = [];
            let domIndex = 0;
            let truncated = false;
            let shadowRootsSkipped = false;

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

                    const isStructuralTag = STRUCTURAL_TAGS.has(tag);
                    const isStructuralRole = role && STRUCTURAL_ROLES.has(role);

                    let name = '';
                    name = accessibleName(node);

                    // Strict inclusion checks for tags and roles
                    const includeByTag = isStructuralTag; // Removed section/article logic as they are not in STRUCTURAL_TAGS anymore
                    const includeByRole = isStructuralRole;

                    const includeByAttr = hasAriaLabel || hasAriaDescribedBy || hasAriaLive || hasAriaExpanded || hasAriaHasPopup || hasAriaHidden || hasTabIndex;

                    const isSpan = tag === 'span' || tag === 'div';

                    // Fix for User Issue: "why am I getting anchor tags in structure ?"
                    const isAnchor = tag === 'a';
                    let shouldInclude = false;

                    if (isAnchor) {
                        // Only include anchors if they have a structural role (button, menuitem, etc.) OR strictly structural attributes
                        if (includeByRole) shouldInclude = true;
                        else if (hasAriaHasPopup || hasAriaExpanded) shouldInclude = true;
                    } else {
                        // For non-anchors, use standard logic
                        shouldInclude = (!isSpan && (includeByTag || includeByRole || includeByAttr)) || (isSpan && (includeByRole || includeByAttr));
                    }

                    if (shouldInclude) {
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
                            element_key: `struct:${DomModel.hash(`${path}|${role || 'no-role'}|${name || 'no-name'}`)}`,
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
                            level: level,
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
                        level++;
                    }

                    try {
                        if (node.shadowRoot) {
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
                                const childResults = scanDocument(childDoc, childFrameInfo);
                                for (const cr of childResults.structuralElements) {
                                    cr.level = (cr.level || 0) + level;
                                    results.push(cr);
                                }
                            }
                        } catch (e) { }
                    }
                }

                if (node.children && node.children.length) {
                    for (const child of Array.from(node.children)) {
                        walk(child, inShadow, level);
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

        const result = {
            url: window.location.href,
            title: document.title || null,
            timestamp: Date.now(),
            structuralElements: topScan.structuralElements || []
        };

        return result;
    }

    // Converts XPath to DOM element
    static xpathToElement(xpath, doc = document) {
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

    // Try to resolve an element by path (supports '#id' and our simple xpath-like path)
    static resolvePath(path) {
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

    /**
     * Simple hash for stable identity
     */
    static hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return (h >>> 0).toString(16);
    }
}

// Helper functions (standalone)

function rectFor(el) {
    try {
        const r = el.getBoundingClientRect();
        return {
            top: Math.round(r.top),
            left: Math.round(r.left),
            width: Math.round(r.width),
            height: Math.round(r.height),
            x: Math.round(r.x),
            y: Math.round(r.y)
        };
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

function getAccessibleName(element) {
    // Priority order for accessible name:
    // 1. aria-label
    // 2. aria-labelledby
    // 3. label element (for form controls)
    // 4. alt text (for images)
    // 5. title attribute
    // 6. text content (for links)
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

export function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
