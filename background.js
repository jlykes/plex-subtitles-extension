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
  
  // Handle LingQ term updates (PATCH requests)
  if (request.action === 'updateLingQTerm') {
    const { wordText, updateData } = request;
    
    // Get cookies for authentication
    chrome.cookies.get({ url: "https://www.lingq.com", name: "csrftoken" }, function(csrfCookie) {
      chrome.cookies.get({ url: "https://www.lingq.com", name: "wwwlingqcomsa" }, function(sessionCookie) {
        if (csrfCookie && sessionCookie) {
          const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": csrfCookie.value
          };
          
          // Step 1: Search for the word
          const searchUrl = `https://www.lingq.com/api/v3/zh/cards/?search=${encodeURIComponent(wordText)}&page_size=5`;
          
          fetch(searchUrl, {
            method: "GET",
            headers: headers,
            credentials: "include"
          })
            .then(response => response.json())
            .then(searchData => {
              let termId = null;
              let wasImported = false;
              
              if (searchData.count > 0) {
                // Word found, get the first result
                termId = searchData.results[0].pk;
                console.log(`Found existing word: ${wordText} (ID: ${termId})`);
              } else {
                // Word not found, import it first
                console.log(`Word not found, importing: ${wordText}`);
                return fetch("https://www.lingq.com/api/v2/zh/cards/import/", {
                  method: "POST",
                  headers: headers,
                  credentials: "include",
                  body: JSON.stringify({ text: wordText })
                })
                  .then(importResponse => {
                    if (importResponse.ok) {
                      wasImported = true;
                      // Search again to get the newly imported word's ID
                      return fetch(searchUrl, {
                        method: "GET",
                        headers: headers,
                        credentials: "include"
                      });
                    } else {
                      throw new Error(`Import failed: ${importResponse.status}`);
                    }
                  })
                  .then(importResponse => importResponse.json())
                  .then(importSearchData => {
                    if (importSearchData.count > 0) {
                      termId = importSearchData.results[0].pk;
                      console.log(`Successfully imported word: ${wordText} (ID: ${termId})`);
                    } else {
                      throw new Error("Could not find word after import");
                    }
                  });
              }
              
              if (termId) {
                // Step 2: Update the word's status/tags
                return fetch(`https://www.lingq.com/api/v3/zh/cards/${termId}/`, {
                  method: "PATCH",
                  headers: headers,
                  credentials: "include",
                  body: JSON.stringify(updateData)
                });
              } else {
                throw new Error("No term ID found");
              }
            })
            .then(updateResponse => {
              if (updateResponse.ok) {
                return updateResponse.json();
              } else {
                throw new Error(`Update failed: ${updateResponse.status}`);
              }
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.toString() }));
        } else {
          sendResponse({ success: false, error: "Authentication cookies not found" });
        }
      });
    });
    return true; // Indicates async response
  }
  

}); 