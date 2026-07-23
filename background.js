// background.js for Chaoxing Course Helper

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab ? sender.tab.id : 'unknown' });
    return true;
  }

  if (message.type === 'QUERY_API') {
    const { url, method, headers, body } = message.payload;

    const fetchOptions = {
      method: method || 'GET',
      headers: headers || {}
    };

    if (method === 'POST' && body) {
      fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : body;
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    console.log(`[Background Proxy] Requesting API: ${url} with method ${method}`);

    fetch(url, fetchOptions)
      .then(async response => {
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }

        if (!response.ok) {
          sendResponse({ 
            success: false, 
            error: `HTTP ${response.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}` 
          });
        } else {
          sendResponse({ success: true, data: data });
        }
      })
      .catch(error => {
        console.error('[Background Proxy] Fetch Error:', error);
        sendResponse({ success: false, error: error.message || 'Network request failed' });
      });

    return true; // Keeps the message channel open for async response
  }
});
