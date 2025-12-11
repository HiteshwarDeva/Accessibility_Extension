// content/runner.js - runs in the isolated world injected by Chrome.
// axe.min.js is declared ahead of this file in manifest.json, so `window.axe`
// is already available here regardless of page CSP settings.

const HIGHLIGHT_CLASS = '__axe_extension_highlight';
const HIGHLIGHT_STYLE_ID = '__axe_extension_highlight_style';

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
    highlightTargetsContrast(message.selectors || []);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'clear-highlights') {
    clearHighlightsContrast();
    sendResponse({ ok: true });
  }
});

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
  const style = document.getElementById(HIGHLIGHT_STYLE_ID);
  if (style) {
    style.remove();
  }
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
    }
  `;
  document.documentElement.appendChild(style);
}

