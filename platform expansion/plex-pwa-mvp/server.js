/**
 * Simple web server for MVP testing with DLNA integration
 * 
 * This server serves our HTML video player so we can test it on Google TV.
 * It uses Express.js, a popular web framework for Node.js.
 * It also includes DLNA discovery and browsing for Plex integration.
 */

// Import required libraries
const express = require('express');    // Web server framework
const path = require('path');          // Utilities for working with file paths
const { Client } = require('node-ssdp'); // DLNA/UPnP discovery, which is a way to find devices on the network. SSDP stands for Simple Service Discovery Protocol.

// Create an Express application
const app = express();

// Define the port number for the server
// Port 3000 is commonly used for development servers
const PORT = 3000;

/**
 * Middleware: Serve static files
 * 
 * This tells Express to serve any files (HTML, CSS, JS, images) 
 * from the current directory when requested by a browser.
 * 
 * Example: When someone requests '/index.html', Express will serve the file.
 */
app.use(express.static('.'));

/**
 * Route: Handle requests to the root URL ('/')
 * 
 * When someone visits http://192.168.7.76:3000/ (or localhost:3000/),
 * this function runs and sends them our index.html file.
 * 
 * @param {Object} req - The request object (contains info about what the browser wants)
 * @param {Object} res - The response object (used to send data back to the browser)
 */
app.get('/', (req, res) => {
    // Send the index.html file as the response
    // path.join() creates the correct file path for the current operating system
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * DLNA Discovery Endpoint
 * 
 * Discovers Plex servers on the local network using UPnP/SSDP.
 * Returns a list of found Plex servers with their IP addresses and ports.
 */
app.get('/discover-dlna', async (req, res) => {
    try {
        const client = new Client(); // This is the client that will be used to discover the devices
        const devices = []; // This is an array to store the devices found
        
        return new Promise((resolve) => {
            client.on('response', (headers, statusCode, rinfo) => {
                const deviceKey = `${rinfo.address}:${headers.LOCATION || 'unknown'}`; // This is a unique identifier for the device
                
                // Look for Plex-specific indicators, including the port number,
                // the server name, and the USN (Unique Service Name)
                const isPlex = headers.SERVER && headers.SERVER.includes('Plex') ||
                             headers.LOCATION && headers.LOCATION.includes('32469') ||
                             headers.LOCATION && headers.LOCATION.includes('32400') ||
                             headers.USN && headers.USN.includes('Plex');
                
                if (isPlex) { // If the device is a Plex server, add it to the list
                    devices.push({
                        ip: rinfo.address, // The IP address of the device          
                        location: headers.LOCATION, // The location of the device
                        server: headers.SERVER, // The server name
                        usn: headers.USN, // The USN (Unique Service Name)
                        isPlex: true // Whether the device is a Plex server
                    });
                }
            });
            
            // Search for devices
            client.search('ssdp:all'); // This is the search query to find all devices on the network
            
            setTimeout(() => { // This is a timeout to wait for the devices to be found
                client.stop(); // This is the client that will be used to discover the devices
                res.json({ success: true, devices: devices }); // This is the response to the client
            }, 5000);
        });
        
    } catch (error) {
        console.error('DLNA discovery error:', error); // This is the error message//
        res.status(500).json({ error: error.message }); // This is the response to the client
    }
});

/**
 * DLNA Browse Endpoint
 * 
 * Browses content on a Plex server using DLNA SOAP requests.
 * Returns a list of folders and files that can be browsed.
 * req.params.objectId is the object ID to browse
 * req.query.plexIP is the IP address of the Plex server
 * req.query.plexPort is the port number of the Plex server
 */
app.get('/browse-dlna/:objectId?', async (req, res) => {
    try {
        const objectId = req.params.objectId || '0'; // This is the object ID to browse
        const plexIP = req.query.plexIP || '192.168.7.76'; // Default to your computer's IP
        const plexPort = req.query.plexPort || '32469'; // Default Plex DLNA port
        
        console.log(`Browsing DLNA object ID: ${objectId} on ${plexIP}:${plexPort}`);
        
        // Get device description
        const deviceResponse = await fetch(`http://${plexIP}:${plexPort}/DeviceDescription.xml`); // This is the URL to get the device description
        if (!deviceResponse.ok) {
            throw new Error('Failed to get device description');
        }
        
        const deviceXml = await deviceResponse.text(); // This is the device description
        
        // Parse ContentDirectory service, which is a service that allows you to browse the content of a Plex server
        const contentDirMatch = deviceXml.match(/<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/);
        
        if (!contentDirMatch) {
            throw new Error('ContentDirectory service not found');
        }
        
        const controlURL = contentDirMatch[1]; // This is the control URL for the ContentDirectory service
        const fullControlURL = controlURL.startsWith('http') ? controlURL : `http://${plexIP}:${plexPort}${controlURL}`; // This is the full control URL for the ContentDirectory service
        
        // Create SOAP request, which is a way to communicate with a Plex server
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
                'SOAPAction': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"' // This is the SOAP action for the ContentDirectory service, which is the action to browse the content of a Plex server
            },
            body: soapRequest
        });
        
        if (!soapResponse.ok) {
            throw new Error(`SOAP request failed: ${soapResponse.status}`);
        }
        
        const soapData = await soapResponse.text(); // This is the SOAP response, which should have a Result element, containing the content of the folder
        const items = parseDIDLResponse(soapData); // This is the function that parses the SOAP response and returns the content of the folder
        
        res.json({ // This is the response to the client
            success: true,
            objectId: objectId, // This is the object ID to browse
            items: items // This is the content of the folder
        });
        
    } catch (error) {
        console.error('Browse DLNA error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Parse DIDL-Lite response from SOAP
 * 
 * Extracts container (folders) and item (files) information from the SOAP response.
 * This is the same parsing logic from your existing dlna-project.
 * DIDL-Lite is a standard for describing media content in XML format.
 * DIDL stands for Digital Item Declaration Language.
 */
function parseDIDLResponse(soapData) {
    const items = []; // This is an array to store the items found
    
    try {
        // Extract the Result element from SOAP response
        const resultMatch = soapData.match(/<Result>([\s\S]*?)<\/Result>/); // This is the Result element from the SOAP response
        if (!resultMatch) {
            console.log('No Result element found in SOAP response');
            return items;
        }
        
        let didlContent = resultMatch[1]; // This is the DIDL-Lite content from the SOAP response
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
                        type: 'file',
                        isContainer: false,
                        url: resMatch ? resMatch[1] : null
                    });
                }
            });
        }
        
    } catch (error) {
        console.error('Error parsing DIDL response:', error);
    }
    
    return items;
}

/**
 * Start the web server
 * 
 * This tells Express to start listening for incoming web requests
 * on the specified port (3000).
 * 
 * The callback function runs once the server is successfully started.
 */
app.listen(PORT, () => {
    // Log messages to show the server is running
    console.log(`MVP Server running at http://localhost:${PORT}`);
    console.log(`Access from your Google TV at http://192.168.7.76:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
}); 