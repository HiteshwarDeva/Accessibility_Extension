import { useState, useCallback } from 'react';

export const useAccessibilityTree = () => {
    const [orderData, setOrderData] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(false);

    const runScan = useCallback(() => {
        setIsScanning(true);
        setError(null);
        setOrderData(null);

        sendMessageToInspectedTab({ type: 'get-tab-order' }, (response) => {
            setIsScanning(false);
            if (!response) {
                setError('No response from content script (page may block extensions).');
                return;
            }
            if (!response.ok) {
                setError(response.error || 'Unknown issue getting tab order.');
                return;
            }
            setOrderData(response.data);
        });
    }, []);

    const showOverlay = useCallback(() => {
        sendMessageToInspectedTab({ type: 'show-tab-order-overlay' }, (response) => {
            if (response && response.ok) {
                setOverlayVisible(true);
            }
        });
    }, []);

    const hideOverlay = useCallback(() => {
        sendMessageToInspectedTab({ type: 'hide-tab-order-overlay' }, (response) => {
            if (response && response.ok) {
                setOverlayVisible(false);
            }
        });
    }, []);

    const highlightElement = useCallback((orderNumber) => {
        sendMessageToInspectedTab({ type: 'highlight-tab-order-element', orderNumber }, (response) => {
            // Optional: handle response if needed
        });
    }, []);

    return {
        orderData,
        isScanning,
        error,
        overlayVisible,
        runScan,
        showOverlay,
        hideOverlay,
        highlightElement
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
                if (message.type === 'get-tab-order') {
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
