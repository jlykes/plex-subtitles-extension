// Basic PWA App Logic
class PlexPWA {
    constructor() {
        this.servers = [];
        this.selectedServer = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateStatus('Ready');
    }
    
    bindEvents() {
        const discoverBtn = document.getElementById('discoverBtn');
        discoverBtn.addEventListener('click', () => this.discoverServers());
    }
    
    updateStatus(message) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        console.log('Status:', message);
    }
    
    async discoverServers() {
        this.updateStatus('Discovering servers...');
        
        try {
            // For now, just simulate discovery
            // We'll add real DLNA discovery in the next step
            await this.simulateDiscovery();
            
            this.updateStatus(`Found ${this.servers.length} servers`);
            this.displayServers();
            
        } catch (error) {
            this.updateStatus('Discovery failed');
            console.error('Discovery error:', error);
        }
    }
    
    async simulateDiscovery() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock server data for testing
        this.servers = [
            {
                name: 'Plex Server (Mock)',
                ip: '192.168.1.100',
                port: '32469',
                type: 'plex'
            }
        ];
    }
    
    displayServers() {
        const serversList = document.getElementById('serversList');
        serversList.innerHTML = '';
        
        if (this.servers.length === 0) {
            serversList.innerHTML = '<p>No servers found</p>';
            return;
        }
        
        this.servers.forEach(server => {
            const serverEl = document.createElement('div');
            serverEl.className = 'server-item';
            serverEl.innerHTML = `
                <div><strong>${server.name}</strong></div>
                <div>${server.ip}:${server.port}</div>
            `;
            serverEl.addEventListener('click', () => this.selectServer(server));
            serversList.appendChild(serverEl);
        });
    }
    
    selectServer(server) {
        this.selectedServer = server;
        
        // Update visual selection
        document.querySelectorAll('.server-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.closest('.server-item').classList.add('selected');
        
        this.updateStatus(`Selected: ${server.name}`);
        this.enableBrowsing();
    }
    
    enableBrowsing() {
        const browserContent = document.getElementById('browserContent');
        browserContent.innerHTML = `
            <p>Server selected: ${this.selectedServer.name}</p>
            <button class="btn" onclick="app.browseContent()">Browse Content</button>
        `;
    }
    
    async browseContent() {
        this.updateStatus('Browsing content...');
        
        // We'll implement real browsing in the next step
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const browserContent = document.getElementById('browserContent');
        browserContent.innerHTML = `
            <p>Content browsing will be implemented in the next step</p>
            <p>Selected server: ${this.selectedServer.name}</p>
        `;
        
        this.updateStatus('Ready');
    }
}

// Initialize the app
const app = new PlexPWA(); 