// === setup_notion_config.js ===
// Run this script in the browser console to set up Notion API configuration
// This file should NOT be committed to git (add to .gitignore)

// Replace these with your actual values
const NOTION_API_KEY = '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';
const NOTION_DATABASE_ID = '0ae84e4e41474f96b7036030463ddc46';

// Set the configuration in Chrome storage
chrome.storage.sync.set({
    notionApiKey: NOTION_API_KEY,
    notionDatabaseId: NOTION_DATABASE_ID,
    notionTrackingEnabled: true
}, function() {
    console.log('✅ Notion configuration saved successfully!');
    console.log('API Key:', NOTION_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('Database ID:', NOTION_DATABASE_ID ? '✅ Set' : '❌ Missing');
    console.log('Tracking Enabled:', true);
});

// Verify the configuration was saved
chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'notionTrackingEnabled'], function(result) {
    console.log('📋 Current configuration:', result);
}); 