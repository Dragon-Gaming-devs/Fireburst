// Browser Configuration for Fireburst OS
// Customize browser behavior and default URLs here

window.BROWSER_CONFIG = {
    // Default homepage
    homepage: "https://www.google.com",
    
    // Default search engine
    searchEngine: "https://www.google.com/search?q=",
    
    // Allowed iframe sources (for security - add domains you trust)
    trustedDomains: [
        "*.google.com",
        "*.github.com",
        "*.wikipedia.org",
        "*.youtube.com",
        "*.reddit.com",
        "*.stackoverflow.com",
        "*.codeforces.com",
        "*.leetcode.com",
        "*.w3schools.com",
        "*.mdn.org",
        "*.codepen.io",
        "*.replit.com",
        "*"  // Allow all for development (remove for production)
    ],
    
    // Browser UI settings
    ui: {
        showNavBar: true,
        showSearchBar: true,
        showHistoryButton: true,
        showBookmarks: true,
        enableZoom: true,
        enableDownloads: false
    },
    
    // Performance settings
    performance: {
        cachePages: true,
        maxCacheSize: 50, // MB
        preloadTimeout: 3000 // ms
    },
    
    // Security settings
    security: {
        blockPopups: false,
        blockCookies: false,
        enableReferer: true,
        sandboxMode: "allow-forms allow-scripts allow-popups allow-top-navigation allow-same-origin"
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.BROWSER_CONFIG;
}
