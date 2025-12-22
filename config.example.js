// Notion API Configuration Template
// Copy this file to config.js and fill in your actual values

// Use var instead of const/let so it's available in global scope for importScripts
var NOTION_CONFIG = {
  apiKey: 'YOUR_NOTION_API_KEY_HERE',
  databaseId: 'YOUR_NOTION_DATABASE_ID_HERE'
};

// Make it available on self (for service workers) and window (for content scripts)
if (typeof self !== 'undefined') {
  self.NOTION_CONFIG = NOTION_CONFIG;
}
if (typeof window !== 'undefined') {
  window.NOTION_CONFIG = NOTION_CONFIG;
}

