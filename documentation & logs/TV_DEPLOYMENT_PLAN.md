# Google TV Deployment Plan

## Overview
Convert the Plex subtitle overlay browser extension into a standalone web application that can run on Google TV's browser.

## Phase 1: Core Extraction (Week 1)

### 1.1 Extract Essential Components
- **Subtitle Overlay System** (`overlay.js`, `preprocessed.js`, `live.js`)
- **Word Popup Interface** (`word_popup.js`) 
- **LingQ Integration** (`lingq_data.js`, `lingq_fetch.py`)
- **Control Panel** (`control.js`, `html/control_panel.html`)
- **Utility Functions** (`utils.js`, `storage.js`)

### 1.2 Create Web App Structure
```
plex-tv-app/
├── public/
│   ├── index.html          # Main app interface
│   ├── css/
│   │   ├── overlay.css     # Subtitle overlay styles
│   │   ├── popup.css       # Word popup styles
│   │   └── control.css     # Control panel styles
│   ├── js/
│   │   ├── app.js          # Main application logic
│   │   ├── overlay.js      # Extracted overlay system
│   │   ├── popup.js        # Extracted word popup
│   │   ├── lingq.js        # Extracted LingQ integration
│   │   └── utils.js        # Extracted utilities
│   └── data/
│       ├── enriched_subtitles/  # Pre-processed subtitle files
│       └── cache/              # Word frequency cache
├── server/
│   ├── app.js              # Express server
│   ├── lingq-proxy.js      # LingQ API proxy
│   └── notion-proxy.js     # Notion API proxy
└── package.json
```

## Phase 2: Plex Integration (Week 2)

### 2.1 Plex Web Client Wrapper
- **Create iframe wrapper** to load `app.plex.tv`
- **Handle authentication** through Plex web interface
- **Inject overlay scripts** into iframe content
- **Manage session persistence**

### 2.2 Script Injection Strategy
```javascript
// Inject overlay into Plex iframe
function injectOverlayScripts(iframe) {
  const scripts = [
    'js/overlay.js',
    'js/popup.js', 
    'js/lingq.js',
    'js/utils.js'
  ];
  
  scripts.forEach(script => {
    const scriptEl = iframe.contentDocument.createElement('script');
    scriptEl.src = chrome.runtime.getURL(script);
    iframe.contentDocument.head.appendChild(scriptEl);
  });
}
```

## Phase 3: TV-Specific Optimizations (Week 3)

### 3.1 UI Adaptations for TV Remote
- **Larger button sizes** (minimum 44px touch targets)
- **Simplified navigation** (fewer options, larger text)
- **Remote-friendly shortcuts** (arrow keys, enter, back)
- **Auto-hide controls** after inactivity

### 3.2 Popup Positioning for TV
- **Center-aligned positioning** for viewing distance
- **Larger font sizes** (minimum 18px)
- **High contrast colors** for TV displays
- **Touch-friendly spacing**

### 3.3 Performance Optimizations
- **Lazy loading** of subtitle data
- **Caching strategies** for LingQ data
- **Reduced animations** for smoother playback
- **Memory management** for long viewing sessions

## Phase 4: Backend Services (Week 4)

### 4.1 Local Server Setup
```javascript
// Express server for local hosting
const express = require('express');
const app = express();

app.use('/api/lingq', require('./lingq-proxy'));
app.use('/api/notion', require('./notion-proxy'));
app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Plex TV App running on port 3000');
});
```

### 4.2 API Proxies
- **LingQ API proxy** (avoid CORS issues)
- **Notion API proxy** (handle authentication)
- **Plex API integration** (optional enhancement)

### 4.3 Data Management
- **Local storage** for user preferences
- **Cloud sync** for LingQ data
- **Offline support** for cached subtitles

## Phase 5: Deployment & Testing (Week 5)

### 5.1 Local Network Deployment
- **Static file hosting** on local network
- **Access via Google TV browser** at `http://[local-ip]:3000`
- **Network discovery** for easy setup

### 5.2 Cloud Deployment (Optional)
- **Vercel/Netlify** for cloud hosting
- **Custom domain** setup
- **HTTPS configuration**

### 5.3 Testing Strategy
- **Google TV browser testing**
- **Remote navigation testing**
- **Performance testing** with large subtitle files
- **Cross-device compatibility**

## Technical Challenges & Solutions

### Challenge 1: Iframe Content Access
**Problem:** Cannot directly inject scripts into Plex iframe due to same-origin policy
**Solution:** Use postMessage API for communication between parent and iframe

### Challenge 2: Authentication Persistence
**Problem:** Plex login sessions may not persist in iframe
**Solution:** Implement session storage and automatic re-authentication

### Challenge 3: TV Remote Navigation
**Problem:** Mouse-based interface doesn't work well with TV remote
**Solution:** Implement keyboard navigation and focus management

### Challenge 4: Performance on TV Hardware
**Problem:** TV hardware may be less powerful than desktop
**Solution:** Optimize rendering, reduce DOM manipulation, implement virtual scrolling

## Success Metrics

- **Setup time** < 5 minutes for new users
- **Navigation latency** < 200ms for remote interactions
- **Subtitle sync accuracy** within 100ms of video
- **Memory usage** < 100MB for 2-hour viewing session
- **User satisfaction** > 4/5 for TV viewing experience

## Future Enhancements

- **Voice control** integration
- **Gesture navigation** support
- **Multi-language** subtitle support
- **Social features** (shared word lists)
- **Analytics dashboard** for learning progress 