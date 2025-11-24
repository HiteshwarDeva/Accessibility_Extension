// panel.js - runs in DevTools panel context
const btnRun = document.getElementById('run');
const btnClear = document.getElementById('clear');
const btnExport = document.getElementById('export');
const status = document.getElementById('status');
const resultsEl = document.getElementById('results');

// Store the last results for export
let lastResults = null;

btnRun.addEventListener('click', () => {
  status.textContent = 'Running on inspected page…';
  resultsEl.innerHTML = '';
  lastResults = null;
  btnExport.disabled = true;
  runAxeInInspectedWindow();
});

btnClear.addEventListener('click', () => {
  // Remove highlights in inspected page
  chrome.devtools.inspectedWindow.eval(`(function(){
    document.querySelectorAll('.__axe_highlight').forEach(function(node){
      node.classList.remove('__axe_highlight');
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
    var s=document.getElementById('__axe_highlight_style'); if(s) s.remove();
  })()`);
  status.textContent = 'Highlights cleared';
});

btnExport.addEventListener('click', () => {
  if (!lastResults) {
    status.textContent = 'No results to export. Run a test first.';
    return;
  }
  exportResultsToJSON(lastResults);
});

function runAxeInInspectedWindow() {
  // Compute the extension-accessible URL for the axe file
  const axeUrl = chrome.runtime.getURL('vendor/axe.min.js');
  const resultKey = '__axe_result_' + Date.now();

  // Script executed in the inspected page; it fetches axe.min.js (from extension URL),
  // temporarily disables AMD define to force global attach, injects the script, then runs axe.run().
  // Results are stored in a global variable that can be retrieved via polling.
  const script = `(function(resultKey){
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '${axeUrl}');
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 400) {
          try {
            // Temporarily disable AMD define to avoid axe registering as an AMD module
            var _define = window.define;
            try { window.define = undefined; } catch(e){}
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.text = xhr.responseText;
            document.documentElement.appendChild(script);
            script.parentNode.removeChild(script);
            try { window.define = _define; } catch(e){}
          } catch (injectErr) {
            window[resultKey] = { error: 'Script injection failed: ' + (injectErr.message || String(injectErr)) };
            return;
          }

          // Ensure axe is available
          if (!(window.axe && typeof window.axe.run === 'function')) {
            window[resultKey] = { error: 'axe not available after injection' };
            return;
          }

          try {
            // run axe on document
            window.axe.run(document, {}, function(err, results){
              if (err) {
                window[resultKey] = { error: err && err.message ? err.message : String(err) };
                return;
              }
              // Serialize results (they are JSON serializable)
              window[resultKey] = { results: results };
            });
          } catch (runErr) {
            window[resultKey] = { error: runErr && runErr.message ? runErr.message : String(runErr) };
          }
        } else {
          window[resultKey] = { error: 'Failed fetching axe file: status ' + xhr.status };
        }
      };
      xhr.send();
    } catch (e) {
      window[resultKey] = { error: e && e.message ? e.message : String(e) };
    }
  })('${resultKey}')`;

  // Evaluate in the inspected page context
  chrome.devtools.inspectedWindow.eval(script, { useContentScriptContext: false }, function(result, isException) {
    if (isException) {
      status.textContent = 'Eval exception: ' + (isException.value || JSON.stringify(isException));
      return;
    }
    
    // Poll for results (since axe.run is async)
    const pollInterval = setInterval(() => {
      chrome.devtools.inspectedWindow.eval(`window['${resultKey}']`, { useContentScriptContext: false }, function(result, isException) {
        if (isException || !result) {
          return; // Keep polling
        }
        
        clearInterval(pollInterval);
        
        // Clean up the global variable
        chrome.devtools.inspectedWindow.eval(`delete window['${resultKey}']`, { useContentScriptContext: false });
        
        if (result.error) {
          status.textContent = 'Error: ' + result.error;
          return;
        }
        if (result.results) {
          status.textContent = 'Done — ' + (result.results.violations ? result.results.violations.length + ' violations' : 'no violations');
          // Store results for export
          lastResults = result.results;
          btnExport.disabled = false;
          // Log the complete axe results object
          console.log('=== Complete Axe Results ===');
          console.log(result.results);
          console.log('=== Violations ===');
          console.log(result.results.violations);
          console.log('=== Passes ===');
          console.log(result.results.passes);
          console.log('=== Incomplete ===');
          console.log(result.results.incomplete);
          console.log('=== Inapplicable ===');
          console.log(result.results.inapplicable);
          renderResults(result.results);
        } else {
          status.textContent = 'Unexpected result';
          lastResults = null;
          btnExport.disabled = true;
        }
      });
    }, 100);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      chrome.devtools.inspectedWindow.eval(`delete window['${resultKey}']`, { useContentScriptContext: false });
      if (status.textContent === 'Running on inspected page…') {
        status.textContent = 'Timeout: axe test took too long';
      }
    }, 30000);
  });
}

function renderResults(results) {
  resultsEl.innerHTML = '';
  
  // Log results structure
  console.log('=== Rendering Results ===');
  console.log('Results object keys:', Object.keys(results));
  console.log('Violations count:', results.violations ? results.violations.length : 0);
  console.log('Passes count:', results.passes ? results.passes.length : 0);
  console.log('Incomplete count:', results.incomplete ? results.incomplete.length : 0);
  console.log('Inapplicable count:', results.inapplicable ? results.inapplicable.length : 0);
  
  // Store results for export (even if no violations)
  lastResults = results;
  btnExport.disabled = false;
  
  if (!results || !results.violations || results.violations.length === 0) {
    resultsEl.textContent = 'No violations';
    return;
  }

  // Sort violations by impact if present
  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 };
  results.violations.sort((a,b) => (impactOrder[a.impact||'unknown'] - impactOrder[b.impact||'unknown']));

  results.violations.forEach((v, vIdx) => {
    // Log each violation structure
    console.log(`=== Violation ${vIdx + 1} ===`);
    console.log('Violation object:', v);
    console.log('Violation keys:', Object.keys(v));
    console.log('ID:', v.id);
    console.log('Impact:', v.impact);
    console.log('Help:', v.help);
    console.log('Help URL:', v.helpUrl);
    console.log('Description:', v.description);
    console.log('Tags:', v.tags);
    console.log('Nodes count:', v.nodes ? v.nodes.length : 0);
    const vEl = document.createElement('div');
    vEl.className = 'violation';
    vEl.innerHTML = '<div><strong>' + escapeHtml(v.help) + '</strong> <small>' + escapeHtml(v.id) + '</small></div>';
    const meta = document.createElement('div');
    meta.style.fontSize='12px';
    meta.style.color='#666';
    meta.textContent = (v.impact || 'unknown') + ' — ' + (v.nodes.length || 0) + ' node(s)';
    vEl.appendChild(meta);

    const nodesWrap = document.createElement('div');
    (v.nodes || []).forEach((n, idx) => {
      // Log each node structure
      console.log(`  === Node ${idx + 1} ===`);
      console.log('  Node object:', n);
      console.log('  Node keys:', Object.keys(n));
      console.log('  Target:', n.target);
      console.log('  HTML:', n.html);
      console.log('  Failure Summary:', n.failureSummary);
      console.log('  Any:', n.any);
      console.log('  All:', n.all);
      console.log('  None:', n.none);
      
      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'node-item';
      const selector = (n.target && n.target[0]) || n.html || '';
      nodeDiv.innerHTML = '<div><strong>Node ' + (idx+1) + '</strong></div><div style="color:#333;margin-top:4px;">' + escapeHtml(selector) + '</div>';
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
  const safe = JSON.stringify(selectors || []);
  const script = `(function(selList){
    try {
      document.querySelectorAll('.__axe_highlight').forEach(resetNode);
      (selList||[]).forEach(function(s){
        try {
          document.querySelectorAll(s).forEach(function(node){
            applyHighlight(node);
          });
        } catch(e){}
      });

      function applyHighlight(node){
        if (!node) return;
        if (!node.__axePrevStyles) {
          node.__axePrevStyles = {
            outline: node.style.outline,
            outlineOffset: node.style.outlineOffset,
            boxShadow: node.style.boxShadow
          };
        }
        node.classList.add('__axe_highlight');
        node.style.outline = '3px dashed rgba(255,0,0,0.9)';
        node.style.outlineOffset = '3px';
        node.style.boxShadow = '0 0 0 3px rgba(255,0,0,0.12)';
      }

      function resetNode(node){
        node.classList.remove('__axe_highlight');
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
      }
    } catch(e){}
  })(${safe});`;
  chrome.devtools.inspectedWindow.eval(script, { useContentScriptContext: false });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function describeNodeFailure(node) {
  if (!node) return '';
  if (node.failureSummary && typeof node.failureSummary === 'string') {
    return node.failureSummary.trim();
  }
  const parts = [];
  collectMessages(node.any, parts, 'Issue');
  collectMessages(node.all, parts, 'Fix');
  collectMessages(node.none, parts, 'Avoid');
  return parts.join(' ') || '';

  function collectMessages(list, bucket, label) {
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      if (item && item.message) {
        bucket.push(label + ': ' + item.message);
      }
    });
  }
}

function exportResultsToJSON(results) {
  try {
    // Create a comprehensive export object with metadata
    const exportData = {
      timestamp: new Date().toISOString(),
      url: chrome.devtools.inspectedWindow.tabId ? 'N/A (DevTools context)' : 'N/A',
      testEngine: {
        name: 'axe-core',
        version: 'unknown' // axe version info might be in results
      },
      results: results
    };

    // Format JSON with indentation for readability
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a blob and download it
    const blob = new Blob([jsonString], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Get the current page URL for filename (if available)
    chrome.devtools.inspectedWindow.eval('window.location.href', { useContentScriptContext: false }, (pageUrl) => {
      let filename = 'axe-results.json';
      if (pageUrl && typeof pageUrl === 'string' && pageUrl !== 'about:blank') {
        try {
          const urlObj = new URL(pageUrl);
          const hostname = urlObj.hostname.replace(/[^a-z0-9]/gi, '_');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          filename = `axe-results_${hostname}_${timestamp}.json`;
        } catch (e) {
          // If URL parsing fails, use default filename
        }
      }
      
      // Create download link
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      status.textContent = `Exported to ${filename}`;
      setTimeout(() => {
        if (lastResults) {
          status.textContent = 'Done — ' + (lastResults.violations ? lastResults.violations.length + ' violations' : 'no violations');
        }
      }, 2000);
    });
  } catch (error) {
    console.error('Export error:', error);
    status.textContent = 'Export failed: ' + (error.message || String(error));
  }
}
