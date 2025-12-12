/* eslint-disable no-undef */

/**
 * Shared utility functions for communicating with the inspected tab
 * Used by both useAxeRunner and useAccessibilityTree hooks
 */

/**
 * Send a message to the inspected tab with automatic retry and content script injection
 * @param {Object} message - The message to send
 * @param {Function} cb - Callback function to handle response
 * @param {number} attempt - Current attempt number (used internally for retry)
 */
export function sendMessageToInspectedTab(message, cb, attempt = 1) {
    // Check if we are running in a real DevTools environment
    if (!chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
        console.warn('Not running in Chrome DevTools. Mocking response.');
        if (cb) {
            // Mock response for development outside of extension
            setTimeout(() => {
                if (message.type === 'run-axe') {
                    cb({ ok: true, results: mockAxeResults });
                } else if (message.type === 'get-tab-order') {
                    cb({ ok: true, data: mockTabOrderData });
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

/**
 * Inject content scripts into the inspected tab if not already present
 * @param {number} tabId - The tab ID to inject scripts into
 * @param {Function} callback - Callback function with success boolean
 */
export function ensureContentScriptInjected(tabId, callback) {
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

/**
 * Check if an error message indicates a missing receiver (content script not loaded)
 * @param {string} message - The error message to check
 * @returns {boolean} True if the error is a missing receiver error
 */
export function isMissingReceiverError(message) {
    return typeof message === 'string' &&
        message.includes('Could not establish connection') &&
        message.includes('Receiving end does not exist');
}

// Mock data for development outside of Chrome DevTools
const mockAxeResults = {
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: []
};

const mockTabOrderData = [
    { order: 1, role: 'Link', name: 'Jump to Table of Contents' },
    { order: 2, role: 'Link', name: 'Collapse Sidebar' },
    { order: 3, role: 'Link', name: 'W3C Recommendation' },
    { order: 4, role: 'Summary', name: 'More details about this document' },
    { order: 5, role: 'Link', name: 'https://www.w3.org/WAI/WCAG2/implementation-report/' },
    { order: 6, role: 'Link', name: 'Skip to main content' },
    { order: 7, role: 'Button', name: 'Toggle navigation' },
    { order: 8, role: 'Link', name: 'Home' },
    { order: 9, role: 'Link', name: 'About' },
    { order: 10, role: 'Link', name: 'Contact' }
];
