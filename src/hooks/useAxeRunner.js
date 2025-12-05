import { useState, useCallback } from 'react';

export const useAxeRunner = () => {
    const [results, setResults] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);

    const runScan = useCallback(() => {
        setIsScanning(true);
        setError(null);
        setResults(null);

        sendMessageToInspectedTab({ type: 'run-axe' }, (response) => {
            setIsScanning(false);
            if (!response) {
                setError('No response from content script (page may block extensions).');
                return;
            }
            if (!response.ok) {
                setError(response.error || 'Unknown issue running axe.');
                return;
            }
            setResults(response.results);
        });
    }, []);

    const highlightNode = useCallback((selectors) => {
        sendMessageToInspectedTab({ type: 'highlight-nodes', selectors: selectors || [] }, () => { });
    }, []);

    const clearHighlights = useCallback(() => {
        sendMessageToInspectedTab({ type: 'clear-highlights' }, () => { });
    }, []);

    const toggleHighlight = useCallback((selectorData, callback) => {
        sendMessageToInspectedTab(
            { type: 'toggle-highlight', selectorData },
            (response) => {
                if (callback) callback(response);
            }
        );
    }, []);

    return {
        results,
        isScanning,
        error,
        runScan,
        highlightNode,
        clearHighlights,
        toggleHighlight
    };
};

// Helper function to communicate with the inspected tab
function sendMessageToInspectedTab(message, cb, attempt = 1) {
    // Check if we are running in a real DevTools environment
    if (!chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
        console.warn('Not running in Chrome DevTools. Mocking response.');
        if (cb) {
            // Mock response for development outside of extension
            setTimeout(() => {
                if (message.type === 'run-axe') {
                    cb({ ok: true, results: mockResults });
                } else {
                    cb({ ok: true });
                }
            }, 1000);
        }
        return;
    }

    const tabId = chrome.devtools.inspectedWindow.tabId;
    chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('Message error:', chrome.runtime.lastError.message);
            if (attempt === 1 && isMissingReceiverError(chrome.runtime.lastError.message)) {
                ensureContentScriptInjected(tabId, (success) => {
                    if (!success) {
                        if (cb) cb({ ok: false, error: 'Unable to inject runner into this page.' });
                        return;
                    }
                    sendMessageToInspectedTab(message, cb, attempt + 1);
                });
                return;
            }
            if (cb) cb({ ok: false, error: chrome.runtime.lastError.message });
            return;
        }
        if (cb) cb(response);
    });
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

// Mock data for development
const mockResults = {
    violations: [
        {
            id: "aria-allowed-attr",
            impact: "serious",
            help: "Elements must only use supported ARIA attributes",
            nodes: [
                { html: "<div role=\"button\" aria-expanded=\"false\">", target: ["div"] },
                { html: "<span role=\"img\" aria-label=\"foo\">", target: ["span"] }
            ]
        },
        {
            id: "color-contrast",
            impact: "critical",
            help: "Elements must have sufficient color contrast",
            nodes: [
                { html: "<p style=\"color: #ccc; background: #fff\">Text</p>", target: ["p"] }
            ]
        }
    ],
    passes: new Array(96).fill({})
};
