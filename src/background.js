/**
 * src/background.js
 * Background service worker entry point.
 */

import CONFIG from './config';

console.log('[Axe Extension] Background service worker loaded');

// Helper to generate random string
function generateRandomString() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper to close the auth tab if it exists
async function closeAuthTab() {
    try {
        const { auth_tab_id } = await chrome.storage.local.get('auth_tab_id');
        if (auth_tab_id) {
            await chrome.tabs.remove(auth_tab_id);
            await chrome.storage.local.remove('auth_tab_id');
        }
    } catch (e) {
        // Tab might already be closed
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // -------------------------------------------------------------------------
    // 1️⃣ START_AUTH: User clicked "Sign In"
    // -------------------------------------------------------------------------
    if (message.type === 'START_AUTH') {
        (async () => {
            try {
                // Generate random state
                const state = generateRandomString();
                const authCode = generateRandomString(); // Not used? Keeping simple.

                // Store state
                await chrome.storage.local.set({ oauth_state: state });

                // Build Auth URL
                const authUrl = new URL(CONFIG.OAUTH.AUTHORIZE_URL);
                authUrl.searchParams.set('redirect_uri', chrome.runtime.getURL('auth-success.html'));
                authUrl.searchParams.set('state', state);

                console.log('[Axe Extension] Opening auth tab:', authUrl.toString());

                // Open new tab
                const authTab = await chrome.tabs.create({
                    url: authUrl.toString(),
                    active: true
                });

                if (authTab?.id) {
                    await chrome.storage.local.set({ auth_tab_id: authTab.id });
                }

                sendResponse({ ok: true });

            } catch (err) {
                console.error('❌ [Axe Extension] Failed to start auth:', err);
                sendResponse({ ok: false, error: err.message });
            }
        })();
        return true;
    }

    // -------------------------------------------------------------------------
    // 2️⃣ EXTENSION_AUTH_SUCCESS: Code received from auth-success.html
    // -------------------------------------------------------------------------
    if (message.type === 'EXTENSION_AUTH_SUCCESS') {
        console.log('[Axe Extension] Received auth success message');

        (async () => {
            try {
                const { code, state: returnedState } = message;

                // Validate state
                const { oauth_state } = await chrome.storage.local.get('oauth_state');

                if (!oauth_state || returnedState !== oauth_state) {
                    console.error('[Axe Extension] State mismatch');
                    sendResponse({ ok: false, error: 'State mismatch' });
                    await closeAuthTab();
                    return;
                }

                // Clean up state immediately to prevent reuse
                await chrome.storage.local.remove('oauth_state');

                if (!code) {
                    sendResponse({ ok: false, error: 'Authorization code missing' });
                    await closeAuthTab();
                    return;
                }

                console.log('[Axe Extension] Code received, exchanging for token...');

                // Exchange code for token
                const response = await fetch(CONFIG.OAUTH.TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    throw new Error(`Token exchange failed: ${response.status}`);
                }

                const data = await response.json();

                if (data.token && data.user) {
                    // Store token/user - this will trigger AuthContext update
                    await chrome.storage.sync.set({
                        extension_auth_token: data.token,
                        user: data.user
                    });

                    console.log('✅ [Axe Extension] Authenticated successfully');

                    // Reply to auth-success.html so it can close
                    sendResponse({ ok: true });

                    // Close tab explicitly after a short delay to allow the success message to be seen
                    setTimeout(() => closeAuthTab(), 3000);
                } else {
                    throw new Error('No token or user received from backend');
                }

            } catch (err) {
                console.error('❌ [Axe Extension] Token exchange error:', err);
                sendResponse({ ok: false, error: err.message });
                // Don't close tab on error so user can see it
            }
        })();

        return true; // Keep channel open
    }
});

// -------------------------------------------------------------------------
// Cleanup: Remove stored tab ID if user closes it manually
// -------------------------------------------------------------------------
chrome.tabs.onRemoved.addListener(async (tabId) => {
    const { auth_tab_id } = await chrome.storage.local.get('auth_tab_id');
    if (tabId === auth_tab_id) {
        console.log('[Axe Extension] Auth tab closed by user');
        await chrome.storage.local.remove(['auth_tab_id', 'oauth_state']);
    }
});
