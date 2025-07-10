// background.js

// === NOTION API FUNCTIONS ===

/**
 * Creates or updates an entry in the Notion word tracker database.
 * If the word already exists, it updates the existing entry instead of creating a duplicate.
 * @param {string} word - The Chinese word being tracked
 * @param {string} status - The status value (e.g., "4" for learned)
 * @param {string} date - The date in ISO format (YYYY-MM-DD)
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
async function createNotionWordTrackerEntry(word, status, date, apiKey, databaseId) {
    try {
        // First, search for existing entries with this word
        const searchUrl = `https://api.notion.com/v1/databases/${databaseId}/query`;
        const searchPayload = {
            filter: {
                property: "Name",
                title: {
                    equals: word
                }
            }
        };

        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchPayload)
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            throw new Error(`Search failed: ${searchResponse.status} - ${errorText}`);
        }

        const searchData = await searchResponse.json();
        const existingEntries = searchData.results;

        if (existingEntries.length > 0) {
            // Word exists, update the first entry
            const existingEntry = existingEntries[0];
            const pageId = existingEntry.id;
            
            console.log(`[background] Word '${word}' already exists, updating entry ${pageId}`);
            
            const updateUrl = `https://api.notion.com/v1/pages/${pageId}`;
            const updatePayload = {
                properties: {
                    "Latest": {
                        select: {
                            name: "→4"
                        }
                    },
                    "Date": {
                        date: {
                            start: date
                        }
                    }
                }
            };

            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatePayload)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
            }

            const updateData = await updateResponse.json();
            console.log(`[background] Successfully updated Notion entry for word: ${word}`);
            return { success: true, data: updateData, action: 'updated' };
        } else {
            // Word doesn't exist, create new entry
            console.log(`[background] Word '${word}' not found, creating new entry`);
            
            const createUrl = `https://api.notion.com/v1/pages`;
            const createPayload = {
                parent: {
                    database_id: databaseId
                },
                properties: {
                    "Name": {
                        title: [
                            {
                                text: {
                                    content: word
                                }
                            }
                        ]
                    },
                    "Latest": {
                        select: {
                            name: "→4"
                        }
                    },
                    "Date": {
                        date: {
                            start: date
                        }
                    }
                }
            };

            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createPayload)
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Create failed: ${createResponse.status} - ${errorText}`);
            }

            const createData = await createResponse.json();
            console.log(`[background] Successfully created Notion entry for word: ${word}`);
            return { success: true, data: createData, action: 'created' };
        }
    } catch (error) {
        console.error(`[background] Error with Notion entry for word '${word}':`, error);
        return { success: false, error: error.message };
    }
}

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
                      // Retry search up to 5 times with 3s delay
                      let attempts = 0;
                      function retrySearch() {
                        attempts++;
                        return fetch(searchUrl, {
                          method: "GET",
                          headers: headers,
                          credentials: "include"
                        })
                          .then(r => r.json())
                          .then(importSearchData => {
                            if (importSearchData.count > 0) {
                              termId = importSearchData.results[0].pk;
                              console.log(`Successfully imported word: ${wordText} (ID: ${termId}) after ${attempts} attempt(s)`);
                              return importSearchData;
                            } else if (attempts < 5) {
                              return new Promise(resolve => setTimeout(resolve, 3000)).then(retrySearch);
                            } else {
                              throw new Error("Could not find word after import (after 5 attempts)");
                            }
                          });
                      }
                      return retrySearch();
                    } else {
                      throw new Error(`Import failed: ${importResponse.status}`);
                    }
                  })
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
  
  // Handle Notion word tracker entries
  if (request.action === 'addNotionWordTrackerEntry') {
    const { wordText, status, date } = request;
    
    // Get Notion configuration from storage
    chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'notionTrackingEnabled'], function(result) {
      const { notionApiKey, notionDatabaseId, notionTrackingEnabled } = result;
      
      // Check if Notion tracking is enabled
      if (!notionTrackingEnabled) {
        sendResponse({ success: false, error: "Notion tracking is disabled" });
        return;
      }
      
      // Check if we have the required configuration
      if (!notionApiKey || !notionDatabaseId) {
        sendResponse({ success: false, error: "Notion API key or database ID not configured" });
        return;
      }
      
      // Create the Notion entry directly in background script
      createNotionWordTrackerEntry(wordText, status, date, notionApiKey, notionDatabaseId)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('[background] Notion API error:', error);
          sendResponse({ success: false, error: error.message });
        });
    });
    
    return true; // Indicates async response
  }
  
  // Setup Notion configuration
  if (request.action === 'setupNotionConfig') {
    chrome.storage.sync.set({
      notionApiKey: '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',
      notionDatabaseId: '0ae84e4e41474f96b7036030463ddc46',
      notionTrackingEnabled: true
    }, function() {
      console.log('✅ Notion configuration saved!');
      sendResponse({ success: true, message: 'Configuration saved' });
    });
    return true;
  }
  
  // Test Notion API connection
  if (request.action === 'testNotionConnection') {
    chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId'], function(result) {
      if (!result.notionApiKey || !result.notionDatabaseId) {
        sendResponse({ success: false, error: 'Configuration not found' });
        return;
      }
      
      // Test the API connection - use local date for PST timezone
      const today = new Date();
      const localDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
      createNotionWordTrackerEntry('测试', '4', localDate, result.notionApiKey, result.notionDatabaseId)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
    });
    return true;
  }

}); 