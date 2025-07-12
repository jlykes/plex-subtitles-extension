/**
 * Simple web server for MVP testing
 * 
 * This server serves our HTML video player so we can test it on Google TV.
 * It uses Express.js, a popular web framework for Node.js.
 */

// Import required libraries
const express = require('express');    // Web server framework
const path = require('path');          // Utilities for working with file paths

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