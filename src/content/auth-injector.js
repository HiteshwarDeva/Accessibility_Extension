/**
 * src/content/auth-injector.js
 *
 * This script runs ONLY on the specific dashboard URL.
 * It monitors localStorage for the 'token' and syncs it to chrome.storage.local.
 */

let lastToken = null;

// Check if this login was initiated by the extension
const urlParams = new URLSearchParams(window.location.search);
const isExtensionFlow = urlParams.get('extension') === 'true';

function syncToken() {
    try {
        const token = localStorage.getItem('token');

        if (token !== lastToken) {
            lastToken = token;

            if (token) {
                console.log('[ArmourAI Injector] Token found, syncing to extension storage.');
                chrome.storage.sync.set({ extension_auth_token: token }, () => {
                    console.log('[ArmourAI Injector] Token saved to chrome.storage.sync');

                    // If this was an extension-tagged login, we can close the tab
                    if (isExtensionFlow) {
                        console.log('[ArmourAI Injector] Closing extension login tab...');
                        setTimeout(() => window.close(), 1000);
                    }
                });
            } else {
                console.log('[ArmourAI Injector] Token not found or cleared. Removing from sync storage.');
                chrome.storage.sync.remove('extension_auth_token', () => {
                    console.log('[ArmourAI Injector] Token removed from chrome.storage.sync');
                });
            }
        }
    } catch (e) {
        console.error('[ArmourAI Injector] Error syncing token:', e);
    }
}

// Initial check
syncToken();

// Poll every 1 second to catch login/logout events in the SPA without page reload
setInterval(syncToken, 1000);

console.log('[ArmourAI Injector] Loaded and monitoring token.');
