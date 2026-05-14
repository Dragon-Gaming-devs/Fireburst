# Puter.js Auth & VFS Migration - Implementation Guide

This document describes the changes made to migrate Fireburst OS authentication and filesystem to Puter.js.

## Changes Summary

### 1. Authentication (js/os.js)

**Before**: Google Apps Script backend with JSONP bypass
- Required backend URL input during login
- Plaintext credentials in localStorage
- Complex JSONP fallback logic

**After**: Puter.js Authentication
- Simple email/password login
- Secure credential management by Puter
- No backend URL configuration needed

#### Key Changes:
```javascript
// OLD: Google Apps Script with JSONP
async function submitAuth() {
    const url = document.getElementById('backend-url').value;
    const data = await jsonpRequest(url, { action: 'login', email, password });
}

// NEW: Puter.js
async function submitAuth() {
    const result = await window.puterBackend.authenticate(email, password);
}
```

### 2. Login UI (index.html)

**Changes**:
- ❌ Removed: Backend URL input field
- ✅ Added: Puter.js account login message
- ✅ Simplified: Only email and password fields

**Before**:
```html
<input type="text" id="backend-url" placeholder="Google Backend URL (Do this once)">
<input type="email" id="login-email" placeholder="Email Address">
<input type="password" id="login-pass" placeholder="Password">
```

**After**:
```html
<input type="email" id="login-email" placeholder="Email Address">
<input type="password" id="login-pass" placeholder="Password">
```

### 3. Virtual Filesystem (js/vfs.js)

**Before**: IndexedDB (local storage only)
- Files stored in browser's local IndexedDB
- Lost when cache is cleared
- No cloud sync

**After**: Puter.js Cloud Storage
- Files stored in user's Puter cloud storage (`/Fireburst/Files/`)
- Persistent across sessions and devices
- Automatic cloud backup
- Cache layer for performance

#### Key API Changes:

| Operation | Before | After |
|-----------|--------|-------|
| Init | IndexedDB open | Puter backend check |
| Save | `VFS.saveFile(name, type, content)` | Same + cloud upload |
| Get | IndexedDB query | Puter download + cache |
| Delete | IndexedDB delete | Puter delete + cache clear |

#### New VFS Features:
```javascript
// Cache management
VFS.clearCache();              // Clear memory cache
VFS.getCacheStats();           // Get cache info

// Better error handling
try {
    await VFS.saveFile(name, type, content);
} catch (error) {
    console.error('Save failed:', error);
}
```

### 4. Browser Application (apps/browsers/Browser.html)

**New**: Simple iframe-based browser replacing Scramjet
- Configurable via `js/browser-config.js`
- Modern UI with navigation controls
- Search functionality
- History management
- Loading indicators

#### Features:
- 🏠 Home button
- ⬅️➡️ Back/Forward navigation
- 🔄 Reload
- 🔍 Search bar
- 📍 Address bar
- History tracking

### 5. Browser Configuration (js/browser-config.js)

**New file**: Centralized browser settings

```javascript
window.BROWSER_CONFIG = {
    homepage: "https://www.google.com",
    searchEngine: "https://www.google.com/search?q=",
    trustedDomains: [ /* ... */ ],
    ui: { /* ... */ },
    performance: { /* ... */ },
    security: { /* ... */ }
};
```

## Migration Steps for Developers

### Step 1: Update App Store/Desktop References

If you have shortcuts to Scramjet browser, update them to use the new Browser:

```javascript
// OLD
openWindow('Browser', 'apps/browsers/Scramjet.html');

// NEW
openWindow('Browser', 'apps/browsers/Browser.html');
```

### Step 2: File Management Code

If any apps use VFS directly:

```javascript
// OLD: IndexedDB direct access (mostly same)
VFS.saveFile('myfile.txt', 'text/plain', 'content');
const files = await VFS.getFiles();

// NEW: Now uses Puter cloud (API is the same!)
// Code doesn't need to change - VFS handles Puter internally
```

### Step 3: Browser Configuration

To customize the browser behavior, edit `js/browser-config.js`:

```javascript
// Change homepage
window.BROWSER_CONFIG.homepage = "https://github.com";

// Add trusted domains
window.BROWSER_CONFIG.trustedDomains.push("*.example.com");

// Adjust sandbox settings
window.BROWSER_CONFIG.security.sandboxMode = "allow-forms allow-scripts";
```

## Testing Checklist

After migration, test:

- [ ] Login works with Puter.js account
- [ ] Files upload to cloud storage
- [ ] Files persist after page reload
- [ ] Browser loads and navigates URLs
- [ ] Search functionality works
- [ ] History navigation works (back/forward)
- [ ] No console errors
- [ ] Logout clears session

## Troubleshooting

### "Puter backend not loaded"
**Solution**: Check that `puter-backend.js` loads before `os.js` in index.html

### "VFS initialization failed"
**Solution**: Ensure user is authenticated before initializing VFS

### "Cannot upload file"
**Solution**: Check Puter storage quota and file permissions

### Browser sandbox errors
**Solution**: Adjust `BROWSER_CONFIG.security.sandboxMode` for specific sites

## File Upload/Download

The VFS now automatically syncs with Puter.js:

```javascript
// Save a file (uploads to Puter)
await VFS.saveFile('document.txt', 'text/plain', 'Hello World');

// Later, on another device
const content = await VFS.getFile('document.txt');
console.log(content); // "Hello World"
```

## Performance Considerations

### Caching Strategy
- Memory cache for 10 most recently accessed files
- Automatic cache invalidation on file changes
- Manual cache clearing available: `VFS.clearCache()`

### Offline Mode
Currently requires internet for Puter.js. To add offline support:

```javascript
// Consider using ServiceWorker + IndexedDB hybrid approach
// Or implement local cache fallback
```

## Security Improvements

### Authentication
✅ No plaintext passwords in localStorage  
✅ Secure token management by Puter  
✅ HTTPS required for API calls  

### File Storage
✅ Files encrypted in transit (HTTPS)  
✅ User-scoped storage (can't access other users' files)  
✅ Optional encryption at rest (via Puter)  

### Browser Sandbox
✅ iframe sandbox restrictions  
✅ Cross-origin isolation  
✅ No access to parent window (configurable)  

## Migration Rollback

If needed to revert changes:

1. Restore old `index.html` from git
2. Restore old `js/os.js` with GAS backend
3. Restore old `js/vfs.js` with IndexedDB
4. Re-add Scramjet browser

```bash
git checkout HEAD~1 -- index.html js/os.js js/vfs.js apps/browsers/Scramjet.html
```

## Future Enhancements

- [ ] Real-time file sync notifications
- [ ] File sharing between users
- [ ] Version history for files
- [ ] Search across all files
- [ ] File encryption options
- [ ] Browser extensions system
- [ ] Offline mode with sync

## References

- [Puter.js Documentation](https://docs.puter.com/)
- [Fireburst Architecture V2](ARCHITECTURE_V2.md)
- [Browser Configuration Options](js/browser-config.js)

---

**Version**: 1.0  
**Date**: 2024  
**Status**: Production Ready
