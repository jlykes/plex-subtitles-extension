// discover-plex.js
// More targeted DLNA discovery specifically for Plex

const { Client } = require('node-ssdp');

const client = new Client();

console.log('Searching specifically for Plex Media Server...');

// Track unique devices to avoid duplicates
const devices = new Set();

client.on('response', (headers, statusCode, rinfo) => {
  const deviceKey = `${rinfo.address}:${headers.LOCATION || 'unknown'}`;
  
  if (devices.has(deviceKey)) return; // Skip duplicates
  devices.add(deviceKey);
  
  // Look for Plex-specific indicators
  const isPlex = headers.SERVER && headers.SERVER.includes('Plex') ||
                 headers.LOCATION && headers.LOCATION.includes('32469') ||
                 headers.LOCATION && headers.LOCATION.includes('32400') ||
                 headers.USN && headers.USN.includes('Plex');
  
  if (isPlex) {
    console.log('🎯 PLEX SERVER FOUND!');
  }
  
  console.log('--- Device Found ---');
  console.log('IP:', rinfo.address);
  console.log('Location:', headers.LOCATION);
  console.log('Server:', headers.SERVER);
  console.log('USN:', headers.USN);
  if (isPlex) console.log('✅ This appears to be Plex!');
  console.log('--------------------\n');
});

// Try different search types
const searchTypes = [
  'ssdp:all',
  'urn:schemas-upnp-org:device:MediaServer:1',
  'urn:schemas-upnp-org:service:ContentDirectory:1'
];

searchTypes.forEach((searchType, index) => {
  setTimeout(() => {
    console.log(`Searching for: ${searchType}`);
    client.search(searchType);
  }, index * 2000);
});

// Wait longer and exit
setTimeout(() => {
  client.stop();
  console.log('Discovery finished.');
  if (devices.size === 0) {
    console.log('No devices found. Try checking:');
    console.log('1. Plex DLNA is enabled');
    console.log('2. Both devices are on same network');
    console.log('3. Try VLC method instead');
  }
  process.exit(0);
}, 10000); 