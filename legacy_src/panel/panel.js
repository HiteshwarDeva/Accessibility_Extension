// panel.js - DevTools panel UI wired to CSP-proof content scripts

const btnRun = document.getElementById('run');
const btnClear = document.getElementById('clear');
const btnExport = document.getElementById('export');
const status = document.getElementById('status');
const resultsEl = document.getElementById('results');

let lastResults = null;

btnRun.addEventListener('click', () => {
  status.textContent = 'Running on inspected page…';
  resultsEl.innerHTML = '';
  lastResults = null;
  btnExport.disabled = true;
  runAxeViaContentScript();
});

btnClear.addEventListener('click', () => {
  clearHighlightsViaContentScript();
  status.textContent = 'Highlights cleared';
});

btnExport.addEventListener('click', () => {
  if (!lastResults) {
    status.textContent = 'No results to export. Run a test first.';
    return;
  }
  exportResultsToJSON(lastResults);
});

function runAxeViaContentScript() {
  sendMessageToInspectedTab({ type: 'run-axe' }, (response) => {
    if (!response) {
      status.textContent = 'No response from content script (page may block extensions).';
      return;
    }
    if (!response.ok) {
      status.textContent = 'Error: ' + (response.error || 'Unknown issue running axe.');
      lastResults = null;
      btnExport.disabled = true;
      return;
    }
    lastResults = response.results;
    btnExport.disabled = false;
    const violationsCount = lastResults && lastResults.violations ? lastResults.violations.length : 0;
    status.textContent = 'Done — ' + (violationsCount ? violationsCount + ' violations' : 'no violations');
    renderResults(lastResults);
  });
}

function clearHighlightsViaContentScript() {
  sendMessageToInspectedTab({ type: 'clear-highlights' }, () => {});
}

function renderResults(results) {
  resultsEl.innerHTML = '';
  lastResults = results;
  btnExport.disabled = false;

  if (!results || !results.violations || results.violations.length === 0) {
    resultsEl.textContent = 'No violations';
    return;
  }

  // Sort by impact (optional)
  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 };
  results.violations.sort((a, b) => (impactOrder[a.impact || 'unknown'] - impactOrder[b.impact || 'unknown']));

  results.violations.forEach((v, vIdx) => {
    const vEl = document.createElement('div');
    vEl.className = 'violation';
    vEl.innerHTML = '<div><strong>' + escapeHtml(v.help || v.id) + '</strong> <small>' + escapeHtml(v.id || '') + '</small></div>';

    const meta = document.createElement('div');
    meta.style.fontSize = '12px';
    meta.style.color = '#666';
    meta.textContent = (v.impact || 'unknown') + ' — ' + (v.nodes ? v.nodes.length : 0) + ' node(s)';
    vEl.appendChild(meta);

    const nodesWrap = document.createElement('div');
    (v.nodes || []).forEach((n, idx) => {
      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'node-item';
      const selector = (n.target && n.target[0]) || n.html || '';
      nodeDiv.innerHTML = '<div><strong>Node ' + (idx + 1) + '</strong></div><div style="color:#333;margin-top:4px;">' + escapeHtml(selector) + '</div>';

      const desc = describeNodeFailure(n);
      if (desc) {
        const descEl = document.createElement('div');
        descEl.className = 'node-desc';
        descEl.textContent = desc;
        nodeDiv.appendChild(descEl);
      }

      nodeDiv.addEventListener('click', () => {
        highlightInInspectedPage(n.target || []);
      });

      nodesWrap.appendChild(nodeDiv);
    });

    vEl.appendChild(nodesWrap);
    resultsEl.appendChild(vEl);
  });
}

function highlightInInspectedPage(selectors) {
  sendMessageToInspectedTab({ type: 'highlight-nodes', selectors: selectors || [] }, () => {});
}

function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s || '').replace(/[&<>"']/g, (m) => map[m]);
}

function describeNodeFailure(node) {
  if (!node) return '';
  if (node.failureSummary && typeof node.failureSummary === 'string') return node.failureSummary.trim();
  return '';
}

function exportResultsToJSON(results) {
  try {
    const exportData = {
      timestamp: new Date().toISOString(),
      url: 'N/A',
      results: results
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    chrome.devtools.inspectedWindow.eval('window.location.href', { useContentScriptContext: false }, (pageUrl) => {
      let filename = 'axe-results.json';
      if (pageUrl && typeof pageUrl === 'string' && pageUrl !== 'about:blank') {
        try {
          const urlObj = new URL(pageUrl);
          const hostname = urlObj.hostname.replace(/[^a-z0-9]/gi, '_');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          filename = `axe-results_${hostname}_${timestamp}.json`;
        } catch (e) {}
      }

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      status.textContent = `Exported to ${filename}`;
      setTimeout(() => { if (lastResults) status.textContent = 'Done — ' + (lastResults.violations ? lastResults.violations.length + ' violations' : 'no violations'); }, 1500);
    });
  } catch (error) {
    status.textContent = 'Export failed: ' + (error && error.message ? error.message : String(error));
  }
}

function sendMessageToInspectedTab(message, cb, attempt = 1) {
  const tabId = getInspectedTabId();
  if (tabId == null) {
    status.textContent = 'Unable to determine inspected tab.';
    if (cb) cb(null);
    return;
  }
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Message error:', chrome.runtime.lastError.message);
      if (attempt === 1 && isMissingReceiverError(chrome.runtime.lastError.message)) {
        ensureContentScriptInjected(tabId, (success) => {
          if (!success) {
            status.textContent = 'Unable to inject runner into this page.';
            if (cb) cb(null);
            return;
          }
          sendMessageToInspectedTab(message, cb, attempt + 1);
        });
        return;
      }
      status.textContent = chrome.runtime.lastError.message.includes('Could not establish connection')
        ? 'Content script unavailable on this page (likely due to Chrome restrictions).'
        : 'Message failed: ' + chrome.runtime.lastError.message;
      if (cb) cb(null);
      return;
    }
    if (cb) cb(response);
  });
}

function getInspectedTabId() {
  return chrome.devtools && chrome.devtools.inspectedWindow
    ? chrome.devtools.inspectedWindow.tabId
    : null;
}

function ensureContentScriptInjected(tabId, callback) {
  if (!chrome.scripting || tabId == null) {
    callback(false);
    return;
  }
  chrome.scripting.executeScript(
    {
      target: { tabId },
      files: ['vendor/axe.min.js', 'content/runner.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('Injection error:', chrome.runtime.lastError.message);
        callback(false);
      } else {
        callback(true);
      }
    }
  );
}

function isMissingReceiverError(message) {
  return typeof message === 'string' &&
    message.includes('Could not establish connection') &&
    message.includes('Receiving end does not exist');
}
