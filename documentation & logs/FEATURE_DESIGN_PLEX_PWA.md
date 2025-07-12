# Plex Progressive Web App Design (Hybrid Approach)

## Overview
Create a Progressive Web App (PWA) that combines Plex API for rich metadata browsing with DLNA for full-quality video streaming, providing the best of both worlds for enhanced subtitle viewing on any device with a web browser, including Google TV.

## Core Features
- **Plex API Integration**: Connect to Plex server using official API for rich metadata
- **DLNA Streaming**: Use DLNA for direct file access and full 4K HDR quality
- **Media Browser**: Navigate Plex libraries with posters, descriptions, and ratings
- **Video Streaming**: Play videos at full original quality without transcoding
- **Enhanced Subtitles**: Word highlighting with LingQ integration
- **PWA Features**: Offline support, app-like experience

## Technical Approach
- **Frontend**: Modern web app (HTML5, CSS3, JavaScript ES6+)
- **Backend**: Simple Node.js server for both Plex API and DLNA communication
- **Metadata**: Plex Media Server API for content browsing and rich data
- **Streaming**: DLNA direct file URLs for full-quality video playback
- **Hybrid Flow**: Use Plex API for "what" (metadata), DLNA for "how" (streaming)

## Development Phases

### Phase 1: MVP - Basic DLNA Video with Text Overlay
- Set up simple web server with static file serving
- Create basic HTML video player
- Implement DLNA server discovery
- Get direct DLNA video URL for a known video file
- Add basic text overlay on video
- Test 4K HDR quality on Google TV
- **Goal**: Prove full-quality video streaming works

### Phase 2: Enhanced Video Player
- Create custom video player interface
- Add subtitle overlay system
- Implement basic word highlighting
- Add video controls and fullscreen support
- **Goal**: Functional video player with subtitle enhancement

### Phase 3: Plex API Integration
- Implement Plex server connection and authentication
- Add library browsing functionality
- Display rich metadata (posters, descriptions, ratings)
- Create content selection interface
- **Goal**: Rich browsing experience

### Phase 4: Hybrid Integration
- Add content mapping between Plex API and DLNA
- Create DLNA URL generation for selected content
- Implement fallback to Plex API streaming if needed
- Add quality selection (DLNA vs transcoded)
- **Goal**: Seamless hybrid experience

### Phase 5: TV App Experience
- Make app installable on Google TV (like a native app)
- Cache movie data for fast browsing
- Optimize interface for TV remote navigation
- Add search and filtering capabilities
- Integrate LingQ data and word frequency
- **Goal**: Full metalayer functionality as installable TV app

## Benefits
- **Full Quality**: 4K HDR playback without transcoding
- **Rich Metadata**: Access to posters, descriptions, ratings, and more
- **Best Performance**: Hardware acceleration via DLNA
- **Reliable Browsing**: Official Plex API for content discovery
- **Progressive Enhancement**: Works offline, installable as app
- **Hybrid Efficiency**: Use each protocol for its strengths 