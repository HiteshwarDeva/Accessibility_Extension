// content/runner.js - runs in the isolated world injected by Chrome.
// axe.min.js is declared ahead of this file in manifest.json, so `window.axe`
// is already available here regardless of page CSP settings.

const HIGHLIGHT_OVERLAY_ID = '__axe_extension_overlay_container';

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
    highlightTargets(message.selectors || []);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'clear-highlights') {
    clearHighlights();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'highlight-element') {
    highlightTargets([message.path]);
    sendResponse({ ok: true });
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

        if (!isSpan && !isLinkInList && (includeByTag || includeByRole || includeByAttr)) {
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

