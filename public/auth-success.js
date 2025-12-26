// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

if (!code) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('title').textContent = 'Authentication Failed';
    document.getElementById('message').textContent = 'No authorization code received.';
} else {
    // Send message to background script
    chrome.runtime.sendMessage(
        {
            type: 'EXTENSION_AUTH_SUCCESS',
            code,
            state
        },
        (response) => {
            if (chrome.runtime.lastError || !response || !response.ok) {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('title').textContent = 'Authentication Failed';
                document.getElementById('message').textContent = chrome.runtime.lastError?.message || response?.error || 'Unknown error';
            } else {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('success').style.display = 'block';
                document.getElementById('title').textContent = 'Success!';
                document.getElementById('message').textContent = 'You are now logged in. This window will close automatically in 3 seconds.';

                // Close window after 2 seconds
                setTimeout(() => {
                    window.close();
                }, 2000);
            }
        }
    );
}
