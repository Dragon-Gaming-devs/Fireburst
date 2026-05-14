// Virtual Filesystem using Puter.js Cloud Storage
// All files are stored in user's Puter cloud storage

var VFS = {
    // Cache for performance
    cache: new Map(),
    cacheEnabled: true,
    
    // Initialize VFS - ensure Puter backend is ready
    init: function() {
        return new Promise(async (resolve, reject) => {
            try {
                // Wait for Puter backend to be available
                if (!window.puterBackend) {
                    throw new Error('Puter backend not loaded');
                }

                let attempts = 0;
                while (!window.puterBackend.isInitialized && attempts < 10) {
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                if (!window.puterBackend.isInitialized) {
                    throw new Error('Puter backend failed to initialize');
                }

                console.log('✓ VFS initialized with Puter cloud storage');
                resolve();
            } catch (error) {
                console.error('VFS initialization failed:', error);
                reject(error);
            }
        });
    },

    // Save file to Puter cloud storage
    saveFile: function(name, type, content) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create blob from content
                const blob = new Blob([content], { type: type });
                const file = new File([blob], name, { type: type });

                // Upload to Puter
                const result = await window.puterBackend.uploadFile(file, '/Fireburst/Files/');

                if (result.success) {
                    // Update cache
                    if (VFS.cacheEnabled) {
                        VFS.cache.set(name, {
                            name: name,
                            type: type,
                            content: content,
                            path: result.path,
                            size: file.size,
                            modified: new Date().toISOString()
                        });
                    }

                    resolve();
                    window.dispatchEvent(new Event('vfs-updated'));
                } else {
                    reject(new Error('Upload failed: ' + result.error));
                }
            } catch (error) {
                console.error('Save file error:', error);
                reject(error);
            }
        });
    },

    // Get all files from Puter cloud storage
    getFiles: function() {
        return new Promise(async (resolve, reject) => {
            try {
                const files = await window.puterBackend.listFiles('/Fireburst/Files/');

                // Convert to expected format
                const formattedFiles = files.map(f => ({
                    name: f.name,
                    type: f.type || 'text/plain',
                    path: f.path,
                    size: f.size,
                    modified: f.modified
                }));

                resolve(formattedFiles);
            } catch (error) {
                console.error('Get files error:', error);
                // Return empty array as fallback
                resolve([]);
            }
        });
    },

    // Get specific file from Puter cloud storage
    getFile: function(name) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check cache first
                if (VFS.cacheEnabled && VFS.cache.has(name)) {
                    resolve(VFS.cache.get(name).content);
                    return;
                }

                // Download from Puter
                const filePath = `/Fireburst/Files/${name}`;
                const blob = await window.puterBackend.downloadFile(filePath);

                if (blob) {
                    const text = await blob.text();
                    // Update cache
                    if (VFS.cacheEnabled) {
                        VFS.cache.set(name, {
                            name: name,
                            content: text,
                            path: filePath,
                            size: blob.size,
                            modified: new Date().toISOString()
                        });
                    }
                    resolve(text);
                } else {
                    reject(new Error('File not found: ' + name));
                }
            } catch (error) {
                console.error('Get file error:', error);
                reject(error);
            }
        });
    },

    // Delete file from Puter cloud storage
    deleteFile: function(name) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await window.puterBackend.deleteFile(`/Fireburst/Files/${name}`);

                if (result.success) {
                    // Remove from cache
                    if (VFS.cacheEnabled) {
                        VFS.cache.delete(name);
                    }

                    resolve();
                    window.dispatchEvent(new Event('vfs-updated'));
                } else {
                    reject(new Error('Delete failed: ' + result.error));
                }
            } catch (error) {
                console.error('Delete file error:', error);
                reject(error);
            }
        });
    },

    // Clear all files from Puter storage
    clear: function() {
        return new Promise(async (resolve, reject) => {
            try {
                const files = await VFS.getFiles();

                // Delete all files
                for (const file of files) {
                    try {
                        await window.puterBackend.deleteFile(file.path);
                    } catch (e) {
                        console.warn('Failed to delete file:', file.name, e);
                    }
                }

                VFS.cache.clear();
                resolve();
                window.dispatchEvent(new Event('vfs-updated'));
            } catch (error) {
                console.error('Clear VFS error:', error);
                reject(error);
            }
        });
    },

    // Clear cache
    clearCache: function() {
        VFS.cache.clear();
    },

    // Get cache stats
    getCacheStats: function() {
        return {
            cacheEnabled: VFS.cacheEnabled,
            cacheSize: VFS.cache.size,
            cachedFiles: Array.from(VFS.cache.keys())
        };
    }
};
