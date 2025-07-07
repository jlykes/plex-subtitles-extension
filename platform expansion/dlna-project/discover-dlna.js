// discover-dlna.js
// Simple DLNA/UPnP device discovery using node-ssdp

const { Client } = require('node-ssdp');

const client = new Client();

console.log('Searching for DLNA/UPnP devices on your network...');

client.on('response', (headers, statusCode, rinfo) => {
  console.log('--- Device Found ---');
  console.log('IP:', rinfo.address);
  console.log('Headers:', headers);
  console.log('--------------------\n');
});

// Search for all UPnP root devices
client.search('ssdp:all');

// Wait for a few seconds then exit
setTimeout(() => {
  client.stop();
  console.log('Discovery finished.');
  process.exit(0);
}, 5000); 