// server.js - Simple proxy server for Plex DLNA testing
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static('.'));

// Proxy endpoint for Plex requests - using a simpler approach
app.use('/plex', async (req, res) => {
    try {
        const plexPath = req.path.substring(1); // Remove leading slash
        const plexUrl = `http://192.168.4.113:32469/${plexPath}`;
        
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
        const response = await fetch('http://192.168.4.113:32469/DeviceDescription.xml');
        if (response.ok) {
            const data = await response.text();
            res.json({ 
                success: true, 
                message: 'Connected to Plex server',
                deviceDescription: data.substring(0, 500) + '...' // First 500 chars
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

// Browse Plex library using SOAP - root endpoint
app.get('/browse', async (req, res) => {
    try {
        const objectId = '0'; // Default to root
        
        console.log(`Browsing object ID: ${objectId}`);
        
        // First, get the device description to find the ContentDirectory service
        const deviceResponse = await fetch('http://192.168.4.113:32469/DeviceDescription.xml');
        if (!deviceResponse.ok) {
            throw new Error('Failed to get device description');
        }
        
        const deviceXml = await deviceResponse.text();
        
        // Parse the device description to find ContentDirectory service
        const contentDirMatch = deviceXml.match(/<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/);
        
        if (!contentDirMatch) {
            throw new Error('ContentDirectory service not found');
        }
        
        const controlURL = contentDirMatch[1];
        const fullControlURL = controlURL.startsWith('http') ? controlURL : `http://192.168.4.113:32469${controlURL}`;
        
        console.log(`ContentDirectory control URL: ${fullControlURL}`);
        
        // Create SOAP request for Browse action
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
        console.log('SOAP response received');
        console.log('SOAP response preview:', soapData.substring(0, 1000));
        
        // Parse the SOAP response to extract items
        const items = parseDIDLResponse(soapData);
        
        res.json({
            success: true,
            objectId: objectId,
            items: items
        });
        
    } catch (error) {
        console.error('Browse error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Browse Plex library using SOAP - with objectId parameter
app.get('/browse/:objectId', async (req, res) => {
    try {
        const objectId = req.params.objectId;
        
        console.log(`Browsing object ID: ${objectId}`);
        
        // First, get the device description to find the ContentDirectory service
        const deviceResponse = await fetch('http://192.168.4.113:32469/DeviceDescription.xml');
        if (!deviceResponse.ok) {
            throw new Error('Failed to get device description');
        }
        
        const deviceXml = await deviceResponse.text();
        
        // Parse the device description to find ContentDirectory service
        const contentDirMatch = deviceXml.match(/<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/);
        
        if (!contentDirMatch) {
            throw new Error('ContentDirectory service not found');
        }
        
        const controlURL = contentDirMatch[1];
        const fullControlURL = controlURL.startsWith('http') ? controlURL : `http://192.168.4.113:32469${controlURL}`;
        
        console.log(`ContentDirectory control URL: ${fullControlURL}`);
        
        // Create SOAP request for Browse action
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
        console.log('SOAP response received');
        console.log('SOAP response preview:', soapData.substring(0, 1000));
        
        // Parse the SOAP response to extract items
        const items = parseDIDLResponse(soapData);
        
        res.json({
            success: true,
            objectId: objectId,
            items: items
        });
        
    } catch (error) {
        console.error('Browse error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Parse DIDL-Lite response from SOAP
function parseDIDLResponse(soapData) {
    const items = [];
    
    try {
        // Extract the Result element from SOAP response
        const resultMatch = soapData.match(/<Result>([\s\S]*?)<\/Result>/);
        if (!resultMatch) {
            console.log('No Result element found in SOAP response');
            return items;
        }
        
        let didlContent = resultMatch[1];
        // Decode XML entities
        didlContent = didlContent
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        
        // Parse container elements (folders)
        const containerMatches = didlContent.match(/<container([\s\S]*?)<\/container>/g);
        if (containerMatches) {
            containerMatches.forEach(container => {
                const idMatch = container.match(/id="([^"]+)"/);
                const titleMatch = container.match(/<dc:title>([^<]+)<\/dc:title>/);
                
                if (idMatch && titleMatch) {
                    items.push({
                        id: idMatch[1],
                        title: titleMatch[1],
                        type: 'folder',
                        isContainer: true
                    });
                }
            });
        }
        
        // Parse item elements (files)
        const itemMatches = didlContent.match(/<item([\s\S]*?)<\/item>/g);
        if (itemMatches) {
            itemMatches.forEach(item => {
                const idMatch = item.match(/id="([^"]+)"/);
                const titleMatch = item.match(/<dc:title>([^<]+)<\/dc:title>/);
                const resMatch = item.match(/<res[^>]*>([^<]+)<\/res>/);
                
                if (idMatch && titleMatch) {
                    items.push({
                        id: idMatch[1],
                        title: titleMatch[1],
                        type: 'video',
                        isContainer: false,
                        url: resMatch ? resMatch[1] : null
                    });
                }
            });
        }
        
        console.log(`Parsed ${items.length} items from DIDL response`);
        
    } catch (error) {
        console.error('Error parsing DIDL response:', error);
    }
    
    return items;
}

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📺 Plex server: http://192.168.4.113:32469`);
    console.log(`🌐 Test page: http://localhost:${PORT}/test-plex-player.html`);
}); 