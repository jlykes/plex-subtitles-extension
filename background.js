// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getLingqCookies') {
    chrome.cookies.get({ url: "https://www.lingq.com", name: "csrftoken" }, function(csrfCookie) {
      chrome.cookies.get({ url: "https://www.lingq.com", name: "wwwlingqcomsa" }, function(sessionCookie) {
        if (csrfCookie && sessionCookie) {
          sendResponse({
            csrftoken: csrfCookie.value,
            wwwlingqcomsa: sessionCookie.value
          });
        } else {
          sendResponse(null);
        }
      });
    });
    // Return true to indicate async response
    return true;
  }
  if (request.type === 'fetchLingqData') {
    const { csrftoken, wwwlingqcomsa } = request;
    fetch("https://www.lingq.com/api/languages/zh/lingqs/", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-CSRFToken": csrftoken
      },
      credentials: "include"
    })
      .then(response => response.json())
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.toString() }));
    return true; // Indicates async response
  }
}); 