// enhanced-server.js - Enhanced DLNA server with subtitle processing
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Import your existing extension's core functionality
const SUBTITLE_PROCESSING = {
    // Word frequency data (simplified version)
    wordFrequency: {},
    
    // LingQ data (simplified version)
    lingqTerms: {},
    
    // Subtitle processing functions
    processSubtitles: function(subtitleText) {
        // Extract Chinese words
        const chineseWords = (subtitleText.match(/[\u4e00-\u9fff]+/g) || []);
        
        // Process each word
        return chineseWords.map(word => {
            const frequency = this.wordFrequency[word] || 1;
            const lingqData = this.lingqTerms[word] || null;
            
            return {
                word: word,
                frequency: frequency,
                lingqStatus: lingqData ? lingqData.status : null,
                lingqTags: lingqData ? lingqData.tags : []
            };
        });
    },
    
    // Generate enhanced subtitle HTML
    generateEnhancedSubtitles: function(subtitleText) {
        const processedWords = this.processSubtitles(subtitleText);
        let enhancedText = subtitleText;
        
        // Add highlighting and popup functionality
        processedWords.forEach(wordData => {
            const color = this.getStatusColor(wordData.lingqStatus);
            const replacement = `<span class="subtitle-word" data-word="${wordData.word}" data-frequency="${wordData.frequency}" data-status="${wordData.lingqStatus}" style="border-bottom: 2px solid ${color}; cursor: pointer;">${wordData.word}</span>`;
            enhancedText = enhancedText.replace(new RegExp(wordData.word, 'g'), replacement);
        });
        
        return enhancedText;
    },
    
    // Get color based on LingQ status
    getStatusColor: function(status) {
        switch(status) {
            case 0: return '#ffe600'; // New - bright yellow
            case 1: return 'rgba(255,230,0,0.5)'; // Learning - lighter yellow
            case 2: return 'rgba(255,230,0,0.2)'; // Familiar - very light yellow
            case 3: return 'rgba(128,128,128,0.3)'; // Learned - gray
            default: return 'blue'; // Not in LingQ data
        }
    }
};

// Load word frequency data
async function loadWordFrequencyData() {
    try {
        const frequencyData = await fs.readFile('../../cache/word_frequency.json', 'utf8');
        SUBTITLE_PROCESSING.wordFrequency = JSON.parse(frequencyData);
        console.log('✅ Word frequency data loaded');
    } catch (error) {
        console.log('⚠️ Could not load word frequency data:', error.message);
    }
}

// Load LingQ data
async function loadLingQData() {
    try {
        const lingqData = await fs.readFile('../../lingqs.json', 'utf8');
        SUBTITLE_PROCESSING.lingqTerms = JSON.parse(lingqData);
        console.log('✅ LingQ data loaded');
    } catch (error) {
        console.log('⚠️ Could not load LingQ data:', error.message);
    }
}

// Enhanced subtitle endpoint
app.post('/enhance-subtitles', async (req, res) => {
    try {
        const { subtitleText, videoTitle } = req.body;
        
        if (!subtitleText) {
            return res.status(400).json({ error: 'Subtitle text is required' });
        }
        
        // Process subtitles
        const enhancedSubtitles = SUBTITLE_PROCESSING.generateEnhancedSubtitles(subtitleText);
        
        res.json({
            success: true,
            originalText: subtitleText,
            enhancedText: enhancedSubtitles,
            processedWords: SUBTITLE_PROCESSING.processSubtitles(subtitleText)
        });
        
    } catch (error) {
        console.error('Error enhancing subtitles:', error);
        res.status(500).json({ error: error.message });
    }
});

// Video player interface
app.get('/video-player', (req, res) => {
    res.sendFile(path.join(__dirname, 'video-player.html'));
});

// DLNA browser interface
app.get('/dlna-browser', (req, res) => {
    res.sendFile(path.join(__dirname, 'plex-browser.html'));
});

// DLNA discovery endpoint
app.get('/discover-dlna', async (req, res) => {
    try {
        const { Client } = require('node-ssdp');
        const client = new Client();
        
        const devices = [];
        const devicePromises = [];
        
        return new Promise((resolve) => {
            client.on('response', (headers, statusCode, rinfo) => {
                const deviceKey = `${rinfo.address}:${headers.LOCATION || 'unknown'}`;
                
                // Look for Plex-specific indicators
                const isPlex = headers.SERVER && headers.SERVER.includes('Plex') ||
                             headers.LOCATION && headers.LOCATION.includes('32469') ||
                             headers.LOCATION && headers.LOCATION.includes('32400') ||
                             headers.USN && headers.USN.includes('Plex');
                
                if (isPlex) {
                    devices.push({
                        ip: rinfo.address,
                        location: headers.LOCATION,
                        server: headers.SERVER,
                        usn: headers.USN,
                        isPlex: true
                    });
                }
            });
            
            // Search for devices
            client.search('ssdp:all');
            
            setTimeout(() => {
                client.stop();
                res.json({ success: true, devices: devices });
            }, 5000);
        });
        
    } catch (error) {
        console.error('DLNA discovery error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Browse DLNA content (root)
app.get('/browse-dlna', async (req, res) => {
    try {
        const objectId = '0';
        const plexIP = req.query.plexIP || '192.168.4.113'; // Default Plex IP
        const plexPort = req.query.plexPort || '32469'; // Default Plex DLNA port
        
        console.log(`Browsing DLNA root on ${plexIP}:${plexPort}`);
        
        // Get device description
        const deviceResponse = await fetch(`http://${plexIP}:${plexPort}/DeviceDescription.xml`);
        if (!deviceResponse.ok) {
            throw new Error('Failed to get device description');
        }
        
        const deviceXml = await deviceResponse.text();
        
        // Parse ContentDirectory service
        const contentDirMatch = deviceXml.match(/<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/);
        
        if (!contentDirMatch) {
            throw new Error('ContentDirectory service not found');
        }
        
        const controlURL = contentDirMatch[1];
        const fullControlURL = controlURL.startsWith('http') ? controlURL : `http://${plexIP}:${plexPort}${controlURL}`;
        
        // Create SOAP request
        const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
      <ObjectID>${objectId}</ObjectID>
      <BrowseFlag>BrowseDirectChildren</BrowseFlag>
      <Filter>*</Filter>
      <StartingIndex>0</StartingIndex>
      <RequestedCount>100</RequestedCount>
      <SortCriteria></SortCriteria>
    </u:Browse>
  </s:Body>
</s:Envelope>`;
        
        // Make SOAP request
        const soapResponse = await fetch(fullControlURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset="utf-8"',
                'SOAPAction': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"'
            },
            body: soapRequest
        });
        
        if (!soapResponse.ok) {
            throw new Error(`SOAP request failed: ${soapResponse.status}`);
        }
        
        const soapData = await soapResponse.text();
        const items = parseDIDLResponse(soapData);
        
        res.json({
            success: true,
            objectId: objectId,
            items: items
        });
        
    } catch (error) {
        console.error('Browse DLNA error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Browse DLNA content (with objectId)
app.get('/browse-dlna/:objectId', async (req, res) => {
    try {
        const objectId = req.params.objectId;
        const plexIP = req.query.plexIP || '192.168.4.113'; // Default Plex IP
        const plexPort = req.query.plexPort || '32469'; // Default Plex DLNA port
        
        console.log(`Browsing DLNA object ID: ${objectId} on ${plexIP}:${plexPort}`);
        
        // Get device description
        const deviceResponse = await fetch(`http://${plexIP}:${plexPort}/DeviceDescription.xml`);
        if (!deviceResponse.ok) {
            throw new Error('Failed to get device description');
        }
        
        const deviceXml = await deviceResponse.text();
        
        // Parse ContentDirectory service
        const contentDirMatch = deviceXml.match(/<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/);
        
        if (!contentDirMatch) {
            throw new Error('ContentDirectory service not found');
        }
        
        const controlURL = contentDirMatch[1];
        const fullControlURL = controlURL.startsWith('http') ? controlURL : `http://${plexIP}:${plexPort}${controlURL}`;
        
        // Create SOAP request
        const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
      <ObjectID>${objectId}</ObjectID>
      <BrowseFlag>BrowseDirectChildren</BrowseFlag>
      <Filter>*</Filter>
      <StartingIndex>0</StartingIndex>
      <RequestedCount>100</RequestedCount>
      <SortCriteria></SortCriteria>
    </u:Browse>
  </s:Body>
</s:Envelope>`;
        
        // Make SOAP request
        const soapResponse = await fetch(fullControlURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset="utf-8"',
                'SOAPAction': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"'
            },
            body: soapRequest
        });
        
        if (!soapResponse.ok) {
            throw new Error(`SOAP request failed: ${soapResponse.status}`);
        }
        
        const soapData = await soapResponse.text();
        const items = parseDIDLResponse(soapData);
        
        res.json({
            success: true,
            objectId: objectId,
            items: items
        });
        
    } catch (error) {
        console.error('Browse DLNA error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Parse DIDL response (from your existing server.js)
function parseDIDLResponse(soapData) {
    const items = [];
    
    // Extract DIDL-Lite content
    const didlMatch = soapData.match(/<DIDL-Lite[^>]*>([\s\S]*?)<\/DIDL-Lite>/);
    if (!didlMatch) return items;
    
    const didlContent = didlMatch[1];
    
    // Parse containers (folders)
    const containerMatches = didlContent.match(/<container[^>]*>[\s\S]*?<\/container>/g) || [];
    containerMatches.forEach(container => {
        const idMatch = container.match(/id="([^"]+)"/);
        const titleMatch = container.match(/<dc:title>([^<]+)<\/dc:title>/);
        
        if (idMatch && titleMatch) {
            items.push({
                id: idMatch[1],
                title: titleMatch[1],
                type: 'container',
                isFolder: true
            });
        }
    });
    
    // Parse items (files)
    const itemMatches = didlContent.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];
    itemMatches.forEach(item => {
        const idMatch = item.match(/id="([^"]+)"/);
        const titleMatch = item.match(/<dc:title>([^<]+)<\/dc:title>/);
        const resMatch = item.match(/<res[^>]*>([^<]+)<\/res>/);
        
        if (idMatch && titleMatch) {
            items.push({
                id: idMatch[1],
                title: titleMatch[1],
                type: 'item',
                isFolder: false,
                url: resMatch ? resMatch[1] : null
            });
        }
    });
    
    return items;
}

// TV-optimized web interface
app.get('/tv-interface', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced Subtitle Viewer</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #000;
            color: #fff;
            margin: 0;
            padding: 20px;
            font-size: 24px; /* TV-optimized font size */
        }
        
        .video-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .subtitle-display {
            background: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            min-height: 100px;
            font-size: 28px;
            line-height: 1.4;
        }
        
        .subtitle-word {
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .subtitle-word:hover {
            background: rgba(255,255,255,0.2);
        }
        
        .controls {
            display: flex;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .control-btn {
            background: #333;
            color: #fff;
            border: 2px solid #666;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .control-btn:hover {
            background: #555;
            border-color: #888;
        }
        
        .control-btn:focus {
            outline: 3px solid #007acc;
        }
        
        .word-popup {
            position: absolute;
            background: rgba(51, 51, 51, 0.95);
            color: #fff;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            font-size: 18px;
            max-width: 300px;
            z-index: 1000;
        }
        
        .status-buttons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .status-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #666;
            background: #333;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .status-btn:hover {
            background: #555;
        }
        
        .status-btn.active {
            border-color: #007acc;
            background: #007acc;
        }
    </style>
</head>
<body>
    <div class="video-container">
        <h1>Enhanced Subtitle Viewer</h1>
        
        <div class="controls">
            <button class="control-btn" onclick="loadSampleSubtitles()">Load Sample</button>
            <button class="control-btn" onclick="loadAvailableVideos()">Load Video</button>
            <button class="control-btn" onclick="clearSubtitles()">Clear</button>
            <button class="control-btn" onclick="toggleFullscreen()">Fullscreen</button>
            <button class="control-btn" onclick="toggleDebug()">Debug</button>
        </div>
        
        <div id="videoSelector" style="display: none; margin: 20px 0;">
            <h3>Select a Video:</h3>
            <div id="videoList" style="display: flex; flex-wrap: wrap; gap: 10px;"></div>
        </div>
        
        <div class="subtitle-display" id="subtitleDisplay">
            Click "Load Sample" to see enhanced subtitles
        </div>
        
        <div id="debugPanel" style="
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 16px;
            color: #00ff00;
            display: none;">
            <h3>Debug Info:</h3>
            <div id="debugContent"></div>
        </div>
    </div>

    <script>
        let currentPopup = null;
        let wordFrequencyData = {};
        let lingqTerms = {};
        
        // Load data when page loads
        async function loadData() {
            try {
                // Load word frequency data
                const freqResponse = await fetch('/word-frequency-data');
                const freqData = await freqResponse.json();
                if (freqData.success) {
                    wordFrequencyData = freqData.data;
                    console.log('Word frequency data loaded:', Object.keys(wordFrequencyData).length, 'words');
                    updateDebugInfo();
                }
                
                // Load LingQ data
                const lingqResponse = await fetch('/lingq-data');
                const lingqData = await lingqResponse.json();
                if (lingqData.success) {
                    lingqTerms = lingqData.data;
                    console.log('LingQ data loaded:', Object.keys(lingqTerms).length, 'words');
                    updateDebugInfo();
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        
        // Load data when page loads
        loadData();
        
        function updateDebugInfo() {
            const debugContent = document.getElementById('debugContent');
            debugContent.innerHTML = \`
                <div>Word Frequency Data: \${Object.keys(wordFrequencyData).length} words loaded</div>
                <div>LingQ Data: \${Object.keys(lingqTerms).length} words loaded</div>
                <div>Current Time: \${new Date().toLocaleTimeString()}</div>
            \`;
        }
        
        function toggleDebug() {
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel.style.display === 'none') {
                debugPanel.style.display = 'block';
                updateDebugInfo();
            } else {
                debugPanel.style.display = 'none';
            }
        }
        
        async function loadSampleSubtitles() {
            const sampleText = "你好，我是学习中文的学生。今天我想练习一些新的词汇。";
            
            try {
                const response = await fetch('/enhance-subtitles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subtitleText: sampleText })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('subtitleDisplay').innerHTML = data.enhancedText;
                    addWordClickListeners();
                }
            } catch (error) {
                console.error('Error loading subtitles:', error);
            }
        }
        
        async function loadAvailableVideos() {
            try {
                const response = await fetch('/available-subtitles');
                const data = await response.json();
                
                if (data.success) {
                    const videoSelector = document.getElementById('videoSelector');
                    const videoList = document.getElementById('videoList');
                    
                    videoList.innerHTML = '';
                    data.videos.forEach(video => {
                        const btn = document.createElement('button');
                        btn.className = 'control-btn';
                        btn.textContent = video.substring(0, 30) + (video.length > 30 ? '...' : '');
                        btn.onclick = () => loadVideoSubtitles(video);
                        videoList.appendChild(btn);
                    });
                    
                    videoSelector.style.display = 'block';
                }
            } catch (error) {
                console.error('Error loading videos:', error);
            }
        }
        
        async function loadVideoSubtitles(videoTitle) {
            try {
                const response = await fetch(\`/enriched-subtitles/\${encodeURIComponent(videoTitle)}\`);
                const data = await response.json();
                
                if (data.success) {
                    // Display the first subtitle entry as an example
                    const firstSubtitle = data.subtitles[0];
                    if (firstSubtitle && firstSubtitle.segmented) {
                        // Build enhanced HTML from segmented words
                        let enhancedHTML = '';
                        firstSubtitle.segmented.forEach(segment => {
                            if (segment.word.match(/[\u4e00-\u9fff]+/)) {
                                // Chinese word - add clickable span
                                const frequency = wordFrequencyData[segment.word] || 1;
                                const lingqData = lingqTerms[segment.word] || null;
                                const status = lingqData ? lingqData.status : null;
                                const color = getStatusColor(status);
                                
                                enhancedHTML += \`<span class="subtitle-word" data-word="\${segment.word}" data-frequency="\${frequency}" data-status="\${status}" style="border-bottom: 2px solid \${color}; cursor: pointer;">\${segment.word}</span>\`;
                            } else {
                                // Non-Chinese text - add as-is
                                enhancedHTML += segment.word;
                            }
                        });
                        
                        document.getElementById('subtitleDisplay').innerHTML = enhancedHTML;
                        addWordClickListeners();
                    }
                    
                    // Hide video selector
                    document.getElementById('videoSelector').style.display = 'none';
                }
            } catch (error) {
                console.error('Error loading video subtitles:', error);
            }
        }
        
        function getStatusColor(status) {
            switch(status) {
                case 0: return '#ffe600'; // New - bright yellow
                case 1: return 'rgba(255,230,0,0.5)'; // Learning - lighter yellow
                case 2: return 'rgba(255,230,0,0.2)'; // Familiar - very light yellow
                case 3: return 'rgba(128,128,128,0.3)'; // Learned - gray
                default: return 'blue'; // Not in LingQ data
            }
        }
        
        function clearSubtitles() {
            document.getElementById('subtitleDisplay').innerHTML = 'Click "Load Sample" to see enhanced subtitles';
            hidePopup();
            document.getElementById('videoSelector').style.display = 'none';
        }
        
        function addWordClickListeners() {
            const words = document.querySelectorAll('.subtitle-word');
            words.forEach(word => {
                word.addEventListener('click', showWordPopup);
            });
        }
        
        function showWordPopup(event) {
            const word = event.target;
            const wordText = word.dataset.word;
            const frequency = word.dataset.frequency;
            const status = word.dataset.status;
            
            hidePopup();
            
            const popup = document.createElement('div');
            popup.className = 'word-popup';
            popup.innerHTML = \`
                <div style="font-weight: bold; margin-bottom: 10px;">\${wordText}</div>
                <div style="margin-bottom: 10px;">Frequency: \${frequency}</div>
                <div style="margin-bottom: 10px;">Status: \${status || 'Not in LingQ'}</div>
                <div class="status-buttons">
                    <button class="status-btn" data-status="0">0</button>
                    <button class="status-btn" data-status="1">1</button>
                    <button class="status-btn" data-status="2">2</button>
                    <button class="status-btn" data-status="3">3</button>
                    <button class="status-btn" data-status="4">4</button>
                </div>
            \`;
            
            // Position popup
            const rect = word.getBoundingClientRect();
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.top - popup.offsetHeight - 10) + 'px';
            
            document.body.appendChild(popup);
            currentPopup = popup;
            
            // Add status button listeners
            popup.querySelectorAll('.status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    updateWordStatus(wordText, btn.dataset.status);
                    hidePopup();
                });
            });
        }
        
        function hidePopup() {
            if (currentPopup) {
                currentPopup.remove();
                currentPopup = null;
            }
        }
        
        function updateWordStatus(wordText, status) {
            console.log('Updating word status:', wordText, status);
            // Here you would integrate with your LingQ API
        }
        
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
        
        // Close popup when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.word-popup') && !event.target.closest('.subtitle-word')) {
                hidePopup();
            }
        });
        
        // Keyboard navigation for TV remote
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'Escape':
                    hidePopup();
                    break;
                case 'Enter':
                    // Handle selection
                    break;
            }
        });
    </script>
</body>
</html>
    `);
});

// Proxy endpoint for Plex requests (from your existing server)
app.use('/plex', async (req, res) => {
    try {
        const plexPath = req.path.substring(1);
        const plexUrl = `http://192.168.4.113:32400/${plexPath}`;
        
        console.log(`Proxying request to: ${plexUrl}`);
        
        const response = await fetch(plexUrl);
        const data = await response.text();
        
        res.set('Content-Type', response.headers.get('content-type'));
        res.send(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to check Plex connectivity
app.get('/test-plex', async (req, res) => {
    try {
        const response = await fetch('http://192.168.4.113:32400/DeviceDescription.xml');
        if (response.ok) {
            const data = await response.text();
            res.json({ 
                success: true, 
                message: 'Connected to Plex server',
                deviceDescription: data.substring(0, 500) + '...'
            });
        } else {
            res.json({ 
                success: false, 
                message: `HTTP ${response.status}: ${response.statusText}` 
            });
        }
    } catch (error) {
        res.json({ 
            success: false, 
            message: `Connection error: ${error.message}` 
        });
    }
});

// Load enriched subtitles for a specific video
app.get('/enriched-subtitles/:videoTitle', async (req, res) => {
    try {
        const videoTitle = req.params.videoTitle;
        const filename = `../../enriched_subtitles/${videoTitle}.enriched.json`;
        
        const subtitleData = await fs.readFile(filename, 'utf8');
        const subtitles = JSON.parse(subtitleData);
        
        res.json({
            success: true,
            videoTitle: videoTitle,
            subtitles: subtitles
        });
        
    } catch (error) {
        console.error('Error loading enriched subtitles:', error);
        res.status(404).json({ 
            success: false, 
            error: 'Enriched subtitles not found for this video' 
        });
    }
});

// List available enriched subtitle files
app.get('/available-subtitles', async (req, res) => {
    try {
        const subtitleDir = '../../enriched_subtitles';
        const files = await fs.readdir(subtitleDir);
        const enrichedFiles = files.filter(file => file.endsWith('.enriched.json'));
        
        const videoList = enrichedFiles.map(file => {
            return file.replace('.enriched.json', '');
        });
        
        res.json({
            success: true,
            videos: videoList
        });
        
    } catch (error) {
        console.error('Error listing subtitles:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Could not list available subtitles' 
        });
    }
});

// Serve word frequency data to frontend
app.get('/word-frequency-data', (req, res) => {
    res.json({
        success: true,
        data: SUBTITLE_PROCESSING.wordFrequency
    });
});

// Serve LingQ data to frontend
app.get('/lingq-data', (req, res) => {
    res.json({
        success: true,
        data: SUBTITLE_PROCESSING.lingqTerms
    });
});

// Video streaming endpoint
app.get('/stream-video/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        // Get video URL from Plex
        const plexUrl = `http://192.168.4.113:32400/library/metadata/${videoId}/media`;
        
        console.log(`Streaming video from: ${plexUrl}`);
        
        const response = await fetch(plexUrl);
        if (!response.ok) {
            throw new Error(`Plex request failed: ${response.status}`);
        }
        
        const data = await response.text();
        
        // Parse the XML response to get the actual video URL
        const mediaUrlMatch = data.match(/<Part[^>]*key="([^"]*)"[^>]*>/);
        if (!mediaUrlMatch) {
            throw new Error('Could not find video URL in Plex response');
        }
        
        const videoPath = mediaUrlMatch[1];
        const fullVideoUrl = `http://192.168.4.113:32400${videoPath}`;
        
        console.log(`Full video URL: ${fullVideoUrl}`);
        
        // Stream the video
        const videoResponse = await fetch(fullVideoUrl);
        if (!videoResponse.ok) {
            throw new Error(`Video streaming failed: ${videoResponse.status}`);
        }
        
        // Set appropriate headers for video streaming
        res.set('Content-Type', videoResponse.headers.get('content-type') || 'video/mp4');
        res.set('Accept-Ranges', 'bytes');
        
        // Pipe the video stream
        videoResponse.body.pipe(res);
        
    } catch (error) {
        console.error('Video streaming error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug Plex endpoints with different ports
app.get('/debug-plex', async (req, res) => {
    try {
        const ports = [32469, 32400, 8324, 3000, 8080];
        const endpoints = ['/', '/library/sections', '/status/sessions'];
        
        const results = {};
        
        for (const port of ports) {
            results[`port_${port}`] = {};
            
            for (const endpoint of endpoints) {
                try {
                    const url = `http://192.168.4.113:${port}${endpoint}`;
                    console.log(`Testing: ${url}`);
                    
                    const response = await fetch(url, { timeout: 5000 });
                    results[`port_${port}`][endpoint] = {
                        status: response.status,
                        ok: response.ok,
                        contentType: response.headers.get('content-type'),
                        preview: response.ok ? (await response.text()).substring(0, 200) : null
                    };
                } catch (error) {
                    results[`port_${port}`][endpoint] = {
                        error: error.message
                    };
                }
            }
        }
        
        res.json({
            success: true,
            results: results
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Browse Plex library sections
app.get('/plex-sections', async (req, res) => {
    try {
        const plexUrl = 'http://192.168.4.113:32400/library/sections';
        
        // Try without authentication first, then with token if provided
        let response;
        if (req.query.token) {
            const headers = {
                'X-Plex-Token': req.query.token,
                'X-Plex-Client-Identifier': 'enhanced-dlna-server',
                'X-Plex-Product': 'Enhanced DLNA Server',
                'X-Plex-Version': '1.0.0'
            };
            response = await fetch(plexUrl, { headers });
        } else {
            // Try without authentication (for local network access)
            response = await fetch(plexUrl);
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required. Please provide a Plex token.');
            }
            throw new Error(`Plex request failed: ${response.status}`);
        }
        
        const data = await response.text();
        
        // Parse sections from XML
        const sectionMatches = data.match(/<Directory[^>]*key="([^"]*)"[^>]*title="([^"]*)"[^>]*>/g);
        const sections = [];
        
        if (sectionMatches) {
            sectionMatches.forEach(match => {
                const keyMatch = match.match(/key="([^"]*)"/);
                const titleMatch = match.match(/title="([^"]*)"/);
                if (keyMatch && titleMatch) {
                    sections.push({
                        key: keyMatch[1],
                        title: titleMatch[1]
                    });
                }
            });
        }
        
        res.json({
            success: true,
            sections: sections
        });
        
    } catch (error) {
        console.error('Sections error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Browse items in a section
app.get('/plex-section/:sectionKey', async (req, res) => {
    try {
        const sectionKey = req.params.sectionKey;
        const plexUrl = `http://192.168.4.113:32400/library/sections/${sectionKey}/all`;
        
        const response = await fetch(plexUrl);
        if (!response.ok) {
            throw new Error(`Plex request failed: ${response.status}`);
        }
        
        const data = await response.text();
        
        // Parse items from XML
        const itemMatches = data.match(/<Video[^>]*ratingKey="([^"]*)"[^>]*title="([^"]*)"[^>]*>/g);
        const items = [];
        
        if (itemMatches) {
            itemMatches.forEach(match => {
                const ratingKeyMatch = match.match(/ratingKey="([^"]*)"/);
                const titleMatch = match.match(/title="([^"]*)"/);
                if (ratingKeyMatch && titleMatch) {
                    items.push({
                        ratingKey: ratingKeyMatch[1],
                        title: titleMatch[1]
                    });
                }
            });
        }
        
        res.json({
            success: true,
            items: items.slice(0, 20) // Limit to first 20 items
        });
        
    } catch (error) {
        console.error('Section items error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get video metadata
app.get('/video-metadata/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const plexUrl = `http://192.168.4.113:32400/library/metadata/${videoId}`;
        
        const response = await fetch(plexUrl);
        if (!response.ok) {
            throw new Error(`Plex request failed: ${response.status}`);
        }
        
        const data = await response.text();
        
        // Parse basic metadata from XML
        const titleMatch = data.match(/<title>([^<]+)<\/title>/);
        const durationMatch = data.match(/duration="([^"]+)"/);
        
        res.json({
            success: true,
            title: titleMatch ? titleMatch[1] : 'Unknown',
            duration: durationMatch ? parseInt(durationMatch[1]) : 0,
            videoId: videoId
        });
        
    } catch (error) {
        console.error('Metadata error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize data loading
async function initialize() {
    await loadWordFrequencyData();
    await loadLingQData();
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Enhanced DLNA server running at http://localhost:${PORT}`);
    console.log(`📺 TV Interface: http://localhost:${PORT}/tv-interface`);
    console.log(`🌐 Plex server: http://192.168.4.113:32400`);
    
    await initialize();
    console.log('✅ Server initialized with subtitle processing capabilities');
}); 