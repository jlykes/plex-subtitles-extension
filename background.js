// background.js
// This file contains the background script for the Chrome extension.
// It handles the API requests and responses for the extension.
// It also contains the functions for the Notion word tracker database. 

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

// === LINGQ and NOTION API FUNCTIONS ===
/**
 * Handles requests for LingQ cookies and data, as well as Notion API functions
 * LingQ API functions:
 * - getLingqCookies (gets the LingQ cookies)
 * - fetchLingqData (fetches the LingQ data for the word)
 * - updateLingQTerm (updates the word's status/tags)
 * 
 * Notion API functions:
 * - addNotionWordTrackerEntry (adds a new word to the Notion word tracker database)
 * - setupNotionConfig (sets up the Notion API key and database ID)
 * - testNotionConnection (tests the Notion API connection)
 * @param {Object} request - The request object
 * @param {Object} sender - The sender of the request
 * @param {Function} sendResponse - Function to send the response back to the content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // ------------------------------------------------------------
  // === LINGQ API FUNCTIONS ===
  // ------------------------------------------------------------
  
  // Get LingQ cookies
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
 
  // Fetch LingQ data (including ignored words, minimal format)
  if (request.type === 'fetchLingqData') {
    const { csrftoken, wwwlingqcomsa } = request;
    
    // First fetch regular LingQ data (v1 API)
    fetch("https://www.lingq.com/api/languages/zh/lingqs/", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-CSRFToken": csrftoken
      },
      credentials: "include"
    })
      .then(response => response.json())
      .then(regularData => {
        // Map regular words to minimal format
        const minimalRegular = regularData.map(word => ({
          term: word.term,
          status: word.status,
          extended_status: word.extended_status,
          tags: word.tags || []
        }));
        
        // Then fetch ignored words (v3 API, paginated)
        const page_size = 1000;
        let page = 1;
        let allIgnored = [];
        let totalCount = null;
        
        function fetchIgnoredPage() {
          return fetch(`https://www.lingq.com/api/v3/zh/cards/?page=${page}&page_size=${page_size}&status=-1`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "X-CSRFToken": csrftoken
            },
            credentials: "include"
          })
            .then(res => res.json())
            .then(data => {
              if (totalCount === null) totalCount = data.count;
              if (Array.isArray(data.results)) {
                allIgnored = allIgnored.concat(data.results);
              }
              if (data.next && allIgnored.length < totalCount) {
                page++;
                return fetchIgnoredPage();
              }
            });
        }
        
        fetchIgnoredPage()
          .then(() => {
            // Map ignored words to minimal format
            const minimalIgnored = allIgnored.map(word => ({
              term: word.term,
              status: word.status,
              extended_status: word.extended_status,
              tags: word.tags || []
            }));
            // Combine both
            const combinedData = minimalRegular.concat(minimalIgnored);

            // === Console log stats by status, differentiating Learned and Known ===
            let learnedCount = 0;
            let knownCount = 0;
            const statusCounts = {};
            for (const word of combinedData) {
              const status = word.status;
              // Differentiating Learned and Known
              if (status === 3) {
                if (word.extended_status === 3) {
                  knownCount++;
                } else {
                  learnedCount++;
                }
              }
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            }
            const statusNames = {
              '-1': 'Ignored',
              '0': 'New',
              '1': 'Learning',
              '2': 'Familiar'
            };
            console.log('[background] LingQ word status counts:');
            Object.keys(statusCounts).sort((a, b) => Number(a) - Number(b)).forEach(status => {
              if (status === '3') return; // Skip redundant status 3 line
              const name = statusNames[status] || `Status ${status}`;
              console.log(`   ${name} (status ${status}): ${statusCounts[status]} words`);
            });
            console.log(`   Learned (status 3, ext 0/null): ${learnedCount} words`);
            console.log(`   Known (status 3, ext 3): ${knownCount} words`);
            console.log(`[background] Total words: ${combinedData.length}`);

            sendResponse({ data: combinedData });
          })
          .catch(err => {
            // If ignored words fetch fails, still return regular data
            sendResponse({ data: minimalRegular });
          });
      })
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
          
          // Use character-based approach: search, import if needed, then update
          console.log(`🎯 Updating status for characters: '${wordText}' to status=${updateData.status}`);
          
          // Step 1: Search for the word (including all statuses)
          const searchUrl = `https://www.lingq.com/api/v3/zh/cards/?search=${encodeURIComponent(wordText)}&page_size=10`;
          
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
                const term = searchData.results[0].term || wordText;
                const currentStatus = searchData.results[0].status;
                console.log(`✅ Found existing word: '${term}' (ID: ${termId}, current status: ${currentStatus})`);
                wasImported = false;
              } else {
                // Word not found, import it
                console.log(`❌ Word not found, importing: ${wordText}`);
                return fetch("https://www.lingq.com/api/v2/zh/cards/import/", {
                  method: "POST",
                  headers: headers,
                  credentials: "include",
                  body: JSON.stringify({ text: wordText })
                })
                  .then(importResponse => {
                    if (importResponse.ok) {
                      wasImported = true;
                      // Search again to get the newly imported word's details
                      // Retry search up to 5 times with 2s delay to handle import delay
                      console.log("🔍 Searching for newly imported word...");
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
                              const term = importSearchData.results[0].term || wordText;
                              const currentStatus = importSearchData.results[0].status;
                              console.log(`✅ Successfully imported: '${term}' (ID: ${termId}, initial status: ${currentStatus}) after ${attempts} attempt(s)`);
                              return { found: true, termId: termId, wasImported: true };
                            } else if (attempts < 5) {
                              console.log(`⏳ Word not found yet, retrying in 2 seconds... (attempt ${attempts}/5)`);
                              return new Promise(resolve => setTimeout(resolve, 2000)).then(retrySearch);
                            } else {
                              throw new Error("Could not find word after import (after 5 attempts)");
                            }
                          });
                      }
                      return retrySearch();
                    } else {
                      throw new Error(`Import failed: ${importResponse.status}`);
                    }
                  });
              }
              
              if (termId) {
                return { found: true, termId: termId, wasImported: wasImported };
              }
            })
            .then(result => {
              if (result && result.found) {
                // Step 2: Update the word's status/tags
                console.log(`🔄 Updating word (ID: ${result.termId}) with data:`, updateData);
                return fetch(`https://www.lingq.com/api/v3/zh/cards/${result.termId}/`, {
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
              console.log(`📡 Update response status: ${updateResponse.status}`);
              if (updateResponse.ok) {
                return updateResponse.json();
              } else {
                const errorText = updateResponse.text ? updateResponse.text() : 'No error text';
                console.error(`❌ Update failed with status ${updateResponse.status}:`, errorText);
                throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
              }
            })
            .then(data => {
              console.log(`✅ Successfully updated word status! Response data:`, data);
              sendResponse({ success: true, data });
            })
            .catch(err => {
              console.error(`❌ Error updating word: ${err}`);
              sendResponse({ success: false, error: err.toString() });
            });
        } else {
          sendResponse({ success: false, error: "Authentication cookies not found" });
        }
      });
    });
    return true; // Indicates async response
  }
  
  // ------------------------------------------------------------
  // === NOTION API FUNCTIONS ===
  // ------------------------------------------------------------
  
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
      notionDatabaseId: '15cc93395ee24512acce551712969460',
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