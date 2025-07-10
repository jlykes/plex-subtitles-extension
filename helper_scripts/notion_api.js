// === helper_scripts/notion_api.js ===
// This module handles Notion API integration for the word tracker database.
// It provides functions to create database entries when words are marked as learned.

/**
 * Creates a new entry in the Notion word tracker database.
 * @param {string} word - The Chinese word being tracked
 * @param {string} status - The status value (e.g., "4" for learned)
 * @param {string} date - The date in ISO format (YYYY-MM-DD)
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
async function createWordTrackerEntry(word, status, date, apiKey, databaseId) {
    const url = `https://api.notion.com/v1/pages`;
    
    const payload = {
        parent: {
            database_id: databaseId
        },
        properties: {
            "Word": {
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
                    name: status
                }
            },
            "Date": {
                date: {
                    start: date
                }
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Notion API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[notion_api] Successfully created entry for word: ${word}`);
        return { success: true, data };
    } catch (error) {
        console.error(`[notion_api] Error creating Notion entry for word '${word}':`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Validates Notion API configuration.
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} Promise that resolves to validation result
 */
async function validateNotionConfig(apiKey, databaseId) {
    if (!apiKey || !databaseId) {
        return { valid: false, error: "Missing API key or database ID" };
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { valid: false, error: `Invalid configuration: ${response.status} - ${errorText}` };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: `Configuration validation failed: ${error.message}` };
    }
}

// Export functions for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createWordTrackerEntry,
        validateNotionConfig
    };
} else {
    // For browser environment, attach to window
    window.notionApi = {
        createWordTrackerEntry,
        validateNotionConfig
    };
} 