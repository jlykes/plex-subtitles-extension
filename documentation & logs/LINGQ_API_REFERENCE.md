# LingQ API Reference

Based on analysis of the plex_metalayer codebase, this document provides a comprehensive reference for the LingQ API endpoints and usage patterns.

## Authentication

### Required Cookies
- **csrftoken**: CSRF protection token
- **wwwlingqcomsa**: Session authentication cookie

### Headers
```javascript
{
  "Accept": "application/json",
  "X-CSRFToken": csrftoken,
  "Content-Type": "application/json" // For POST/PATCH requests
}
```

## API Endpoints

### 1. Fetch All Vocabulary Data
**GET** `https://www.lingq.com/api/languages/zh/lingqs/`

Fetches all vocabulary terms for Chinese language.

**Response Format:**
```json
[
  {
    "term": "你好",
    "status": 1,
    "extended_status": null,
    "tags": ["greeting", "basic"],
    "pk": 12345,
    "fragment": "你好，世界"
  }
]
```

### 2. Search Cards
**GET** `https://www.lingq.com/api/v3/zh/cards/`

Search for specific vocabulary terms.

**Query Parameters:**
- `search` (string): Search term (Chinese characters, pinyin, or English)
- `page` (int): Page number for pagination (default: 1)
- `page_size` (int): Results per page (default: 25, max: 100)
- `search_criteria` (string): "contains", "exact", etc.
- `sort` (string): "alpha", "date", etc.
- `status` (int): Filter by status (0=New, 1=Learning, 2=Familiar, 3=Known)

**Response Format:**
```json
{
  "count": 150,
  "results": [
    {
      "pk": 12345,
      "term": "你好",
      "status": 1,
      "extended_status": null,
      "tags": ["greeting"],
      "fragment": "你好，世界"
    }
  ]
}
```

### 3. Get Card Details
**GET** `https://www.lingq.com/api/v3/zh/cards/{id}/`

Get detailed information for a specific card.

**Response Format:**
```json
{
  "pk": 12345,
  "term": "你好",
  "status": 1,
  "extended_status": null,
  "tags": ["greeting"],
  "fragment": "你好，世界",
  "hints": ["hello", "hi"],
  "notes": "Basic greeting"
}
```

### 4. Update Card Status
**PATCH** `https://www.lingq.com/api/v3/zh/cards/{id}/`

Update a card's status and other properties.

**Request Body:**
```json
{
  "status": 2,
  "extended_status": 1,
  "tags": ["new-tag", "important"]
}
```

**Status Values:**
- `0`: New
- `1`: Learning  
- `2`: Familiar
- `3`: Known

**Extended Status Values (for status=3):**
- `0`: Known
- `1`: Well Known
- `2`: Mastered

### 5. Import New Word
**POST** `https://www.lingq.com/api/v2/zh/cards/import/`

Import a new Chinese word or phrase.

**Request Body:**
```json
{
  "text": "新词"
}
```

**Response:** Usually empty on success (HTTP 200/201)

## Usage Patterns

### 1. Cookie Extraction (Chrome Extension)
```javascript
// Get cookies from Chrome
chrome.cookies.get({ url: "https://www.lingq.com", name: "csrftoken" }, function(csrfCookie) {
  chrome.cookies.get({ url: "https://www.lingq.com", name: "wwwlingqcomsa" }, function(sessionCookie) {
    // Use cookies for API requests
  });
});
```

### 2. Search and Import Pattern
```javascript
// 1. Search for existing word
const searchUrl = `https://www.lingq.com/api/v3/zh/cards/?search=${encodeURIComponent(wordText)}&page_size=5`;

// 2. If not found, import it
if (searchData.count === 0) {
  fetch("https://www.lingq.com/api/v2/zh/cards/import/", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ text: wordText })
  });
}

// 3. Update the word's status
fetch(`https://www.lingq.com/api/v3/zh/cards/${termId}/`, {
  method: "PATCH",
  headers: headers,
  body: JSON.stringify(updateData)
});
```

### 3. Tag Management
```javascript
// Get tags
const response = await fetch(`https://www.lingq.com/api/v3/zh/cards/${id}/`);

// Update tags
const response = await fetch(`https://www.lingq.com/api/v3/zh/cards/${id}/`, {
  method: "PATCH",
  body: JSON.stringify({ tags: ["new-tag", "important"] })
});
```

## Error Handling

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created (for imports)
- `400`: Bad Request
- `401`: Unauthorized (check cookies)
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limited

**Error Response Format:**
```json
{
  "error": "Error message",
  "detail": "Detailed error information"
}
```

## Rate Limiting & Best Practices

1. **Retry Logic**: Implement retry logic for imports (up to 5 attempts with 3s delays)
2. **Cookie Management**: Always check for valid cookies before making requests
3. **Error Handling**: Wrap API calls in try-catch blocks
4. **Pagination**: Use page_size parameter for large datasets
5. **Search Optimization**: Use specific search criteria to reduce API calls

## Data Normalization

The codebase normalizes Chinese text by:
- Stripping non-Chinese characters: `wordText.match(/[\u4e00-\u9fff]+/g)`
- Joining multiple characters: `.join('')`

This ensures consistent matching with LingQ's internal normalization.

## Implementation Notes

### Chrome Extension Integration
- Uses `chrome.cookies` API for authentication
- Implements background script for API calls
- Stores data in `chrome.storage.local`
- Auto-fetches data every minute when active

### Python Scripts
- Uses `browser_cookie3` for cookie extraction
- Implements comprehensive error handling
- Provides interactive mode for testing
- Supports batch operations

### Response Processing
- Maps API responses to internal data structures
- Handles both single card and paginated responses
- Normalizes status values for consistent display
- Manages tag arrays for categorization 