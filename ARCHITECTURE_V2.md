# Fireburst OS - Architectural Refactoring (v2.0)

This document describes the major architectural changes implemented to align with best practices for cross-origin isolation and cloud backend integration.

## Overview of Changes

### Problem Addressed

The original architecture had several issues:
1. **CheerpX in Main Context**: Running CheerpX with `SharedArrayBuffer` required the entire app to be cross-origin isolated (COOP/COEP), which broke third-party iframe integrations
2. **Google Apps Script Backend**: Plaintext credentials stored in localStorage and GAS properties, plus JSONP bypass needed in the service worker
3. **Security Issues**: Third-party apps couldn't be loaded due to COI requirements
4. **Poor Scalability**: GAS backend has usage limits and no built-in user account management

### Solution Implemented

Following Codex's recommendations, we've implemented a cleaner architecture:

```
┌─────────────────────────────────────────────────────────────┐
│           Main Fireburst OS Shell (index.html)              │
│  - Non-isolated (can load third-party iframes)              │
│  - Manages windows, taskbar, notifications                  │
│  - No SharedArrayBuffer requirement                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─────────────────────────────────┬───────────────────┐
             │                                 │                   │
      ┌──────▼──────────┐        ┌────────────▼────────┐  ┌──────▼──┐
      │  CheerpX Runner │        │  Puter.js Backend   │  │  Apps   │
      │  (popup/tab)    │        │  (cloud storage)    │  │ (iframes)
      │  - Isolated     │        │  - Auth & DB        │  │
      │  - COEP/COOP    │        │  - File storage     │  │
      │  - postMessage  │        │  - User mgmt        │  │
      └─────────────────┘        └─────────────────────┘  └─────────┘
```

## Architecture Components

### 1. CheerpX Runner (cheerpx-runner.html)

**Purpose**: Runs CheerpX in a separate, cross-origin isolated context

**Features**:
- Separate HTML page with COOP/COEP headers enabled
- Initializes CheerpX Linux environment
- Provides a terminal interface
- Communicates with main OS via `postMessage`
- No SharedArrayBuffer needed in main app

**File**: `/cheerpx-runner.html`

**Usage**:
```javascript
// In main OS
const bridge = new CheerpXBridge();
const connected = await bridge.open({
  width: 800,
  height: 600
});

// Execute commands
await bridge.executeCommand('ls -la /');

// Run native apps
await bridge.runNativeApp('/usr/bin/gcc', ['program.c', '-o', 'program']);

// Close when done
bridge.close();
```

### 2. CheerpX Bridge (js/cheerpx-bridge.js)

**Purpose**: Provides postMessage communication between main OS and CheerpX runner

**Class**: `CheerpXBridge`

**Methods**:
- `open(options)` - Open runner window
- `close()` - Close runner window
- `executeCommand(command)` - Run shell command
- `uploadFile(file, remotePath)` - Upload file to CheerpX
- `downloadFile(filepath)` - Download file from CheerpX
- `runNativeApp(filepath, args)` - Execute native binary
- `runWindowsApp(exePath, args)` - Run Windows app via Wine
- `ping()` - Check connection status
- `on(action, callback)` - Listen for messages
- `once(action, callback)` - Wait for single message

**Example**:
```javascript
// Listen for app execution completion
cheerpxBridge.on('appExecuted', (message) => {
  console.log(`App finished: ${message.filepath}`);
});

// Execute command and wait for result
try {
  const result = await cheerpxBridge.executeCommand('python3 script.py');
  console.log('Command succeeded');
} catch (error) {
  console.error('Command failed:', error.message);
}
```

### 3. Puter Backend (js/puter-backend.js)

**Purpose**: Replaces Google Apps Script with Puter.js for cloud storage, authentication, and database

**Class**: `PuterBackend`

**Key Features**:
- **Authentication**: User login/signup without managing backend secrets
- **File Storage**: Cloud storage at `/Puter/` namespace
- **Database**: Document storage for messages, chat history, etc.
- **User Management**: Built-in user accounts and permissions

**Methods**:

#### Authentication
```javascript
// Initialize
await puterBackend.initialize();

// Check if authenticated
const isAuth = await puterBackend.isAuthenticated();

// Get current user
const user = await puterBackend.getCurrentUser();

// Login
const result = await puterBackend.authenticate(email, password);

// Sign up
const result = await puterBackend.signUp(email, password, username);
```

#### File Operations
```javascript
// Upload file
const result = await puterBackend.uploadFile(file, '/Fireburst/');

// Download file
const blob = await puterBackend.downloadFile('/Fireburst/myfile.txt');

// List files
const files = await puterBackend.listFiles('/Fireburst/');

// Delete file
const result = await puterBackend.deleteFile('/Fireburst/myfile.txt');
```

#### Database Operations
```javascript
// Save data
await puterBackend.saveData('chat_messages', {
  room: 'general',
  sender: 'user@example.com',
  text: 'Hello',
  timestamp: new Date()
});

// Get data
const messages = await puterBackend.getData('chat_messages', { room: 'general' });

// Update data
await puterBackend.updateData('chat_messages', messageId, { edited: true });

// Delete data
await puterBackend.deleteData('chat_messages', messageId);
```

#### Chat/Messages Operations
```javascript
// Create room
await puterBackend.createRoom('developers', false);

// Get room messages
const messages = await puterBackend.getRoomMessages('general');

// Add message
await puterBackend.addMessage('general', 'Hello everyone!');

// Get room members
const members = await puterBackend.getRoomMembers('developers');

// Add user to private room
await puterBackend.addUserToRoom('private-room', 'user@example.com');

// Check if room is private
const isPrivate = await puterBackend.isRoomPrivate('developers');
```

### 4. Messages App (apps/store/messages.html)

**Purpose**: Chat and messaging application

**Changes**:
- Replaced `google.script.run` with compatibility wrapper
- Wrapper automatically uses Puter.js backend if available
- Falls back to Google Apps Script if needed
- No code changes needed in app logic (backward compatible)

**Configuration**:
```javascript
// Automatically detects backend
const usePuterBackend = typeof window.puterBackend !== 'undefined';

// Set fallback GAS URL if needed
if (window.puterBackend) {
  window.puterBackend.setFallbackBackend(BACKEND_URL);
}
```

## Migration Guide

### Step 1: Remove COI Service Worker Requirement

The main app no longer requires cross-origin isolation. The service worker is now optional:

**Before** (index.html):
```html
<script src="coi-serviceworker.js"></script>
```

**After** (index.html):
```html
<script>
    const enableCOI = false; // Set to true only if native CheerpX needed
    if (enableCOI) {
        const script = document.createElement('script');
        script.src = 'coi-serviceworker.js';
        document.head.appendChild(script);
    }
</script>
```

### Step 2: Load New Backend Modules

Add these scripts to index.html in order:

```html
<script src="js/runtime-config.js"></script>
<script src="js/vfs.js"></script>
<script src="js/puter-backend.js"></script>      <!-- New: Puter backend -->
<script src="js/cheerpx-bridge.js"></script>     <!-- New: CheerpX bridge -->
<script src="js/proxy-manager.js"></script>
<script src="js/browsercode-manager.js"></script>
<script src="js/window-manager.js"></script>
<script src="js/os.js"></script>
```

### Step 3: Migrate Apps Using GAS Backend

For any app using `google.script.run`:

**Before**:
```javascript
google.script.run.withSuccessHandler(callback).getData(room);
```

**After**:
No changes needed! The wrapper maintains backward compatibility.

### Step 4: Deploy CheerpX Runner

Deploy `cheerpx-runner.html` to the same server as the main app. It will be loaded in a separate window/tab.

### Step 5: Configure Puter.js

#### Option A: Use Puter.js Cloud Platform

1. Sign up at https://puter.com
2. Create an app in Puter dashboard
3. The SDK will auto-initialize

#### Option B: Self-Hosted Puter (Optional)

If self-hosting, configure the backend URL in your app:

```javascript
window.PUTER_CONFIG = {
  apiUrl: 'https://your-puter-server/api/v1'
};
```

### Step 6: Configure Fallback (Optional)

For backward compatibility, you can still use Google Apps Script as a fallback:

```javascript
// In index.html, after loading puter-backend
if (window.puterBackend) {
  window.puterBackend.setFallbackBackend(BACKEND_URL);
}
```

## Using CheerpX in Your App

### Opening the CheerpX Runner

```javascript
// In your app code
async function launchCheerpX() {
  const bridge = new CheerpXBridge();
  
  const connected = await bridge.open({
    width: 1024,
    height: 768
  });
  
  if (!connected) {
    console.error('Failed to connect to CheerpX runner');
    return;
  }
  
  console.log('✓ CheerpX runner opened');
  
  // Store reference globally so other parts of app can use it
  window.cheerpxBridge = bridge;
}
```

### Running Commands

```javascript
async function runTerminalCommand(command) {
  try {
    const result = await cheerpxBridge.executeCommand(command);
    console.log('Command output:', result);
  } catch (error) {
    console.error('Command failed:', error.message);
  }
}
```

### Uploading Files to CheerpX

```javascript
async function uploadToLinux(fileInput) {
  const file = fileInput.files[0];
  try {
    const result = await cheerpxBridge.uploadFile(file, '/tmp/');
    console.log('✓ File uploaded:', result.filename);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}
```

### Compiling Code

```javascript
async function compileAndRun() {
  try {
    // Upload source file
    const sourceFile = document.getElementById('source').files[0];
    await cheerpxBridge.uploadFile(sourceFile, '/tmp/');
    
    // Compile
    const compiled = await cheerpxBridge.executeCommand(`gcc /tmp/${sourceFile.name} -o /tmp/program`);
    
    // Run
    const output = await cheerpxBridge.executeCommand('/tmp/program');
    
    console.log('Program output:', output);
  } catch (error) {
    console.error('Compilation failed:', error.message);
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file or set in your build process:

```bash
# CheerpX Configuration
CHEERPX_RUNNER_URL=./cheerpx-runner.html
CHEERPX_ENABLE_IN_MAIN=false

# Puter.js Configuration
PUTER_API_URL=https://api.puter.com/v1
PUTER_USE_FALLBACK_GAS=true

# Google Apps Script (Fallback)
BACKEND_URL=https://script.google.com/macros/d/.../usercontent

# jsDelivr CDN (for static assets)
CDN_BASE_URL=https://cdn.jsdelivr.net/gh/jaxonkhyer/Dragon-Gaming-Platforms@main
```

### Runtime Configuration

In `js/runtime-config.js`, you can override settings:

```javascript
window.RUNTIME_CONFIG = Object.assign(
    {
        BACKEND_URL: "",
        CHEERPX_RUNNER_URL: "./cheerpx-runner.html",
        PUTER_ENABLED: true,
        PUTER_API_URL: "https://api.puter.com/v1"
    },
    window.RUNTIME_CONFIG || {}
);
```

## Security Considerations

### CheerpX Isolation

- CheerpX runner runs in a separate context with COOP/COEP headers
- Main app is not isolated, allowing third-party iframes
- Communication via `postMessage` is safe - only strings/serializable objects

### Puter.js Security

- User credentials are managed by Puter.js (not stored in localStorage)
- API calls use secure tokens
- Database operations are user-scoped

### Fallback to GAS

If using GAS as fallback:
- Credentials should be in environment variables, not code
- Use JSONP bypass only if necessary
- Consider rotating API keys regularly

## Troubleshooting

### CheerpX Runner Won't Open

**Problem**: `Failed to open CheerpX runner window - popup may be blocked`

**Solution**:
- Check browser popup blocker settings
- Ensure `cheerpx-runner.html` is deployed
- Verify the file path in CheerpXBridge constructor

### Puter Backend Not Initializing

**Problem**: `Puter SDK not available`

**Solution**:
- Ensure Puter.js SDK is loaded (check network tab)
- Verify internet connection
- Check browser console for CORS errors
- Consider using GAS fallback temporarily

### postMessage Errors

**Problem**: `CheerpX runner not connected`

**Solution**:
- Ensure `cheerpx-runner.html` is on same origin or properly configured for cross-origin
- Check window is not blocked by popup blocker
- Verify COOP/COEP headers are set correctly

### Messages App Not Showing Rooms

**Problem**: No rooms or messages displayed

**Solution**:
- Check if `puterBackend.isInitialized` is true
- Verify user is authenticated
- Check browser console for database errors
- Try refreshing the page

## Performance Optimization

### CheerpX Runner Lazy Loading

Only open CheerpX when needed:

```javascript
// Don't open by default
let cheerpxBridge = null;

function getCheerpXBridge() {
  if (!cheerpxBridge) {
    cheerpxBridge = new CheerpXBridge();
    return cheerpxBridge.open();
  }
  return Promise.resolve(true);
}
```

### Database Query Optimization

For large message collections:

```javascript
// Only get recent messages
const recentMessages = await puterBackend.getData('chat_messages', {
  room: 'general',
  timestamp: { $gt: Date.now() - 86400000 } // Last 24 hours
});
```

### CDN for Static Assets

Use jsDelivr for CheerpX binaries:

```javascript
const imageUrl = `https://cdn.jsdelivr.net/gh/jaxonkhyer/Dragon-Gaming-Platforms@main/vendor/cheerpx/cheerpXImage.ext2`;
```

## Future Enhancements

1. **Real-time Sync**: Integrate WebSockets for live message updates
2. **Offline Support**: Add IndexedDB for offline functionality
3. **Progressive Web App**: Make Fireburst installable as PWA
4. **Custom Domains**: Support self-hosted Puter instances
5. **WebAssembly**: Move more logic to WASM for performance
6. **Mobile Support**: Optimize UI for mobile browsers

## References

- **CheerpX Documentation**: https://cheerpx.io/docs/getting-started.html
- **Puter.js Documentation**: https://docs.puter.com/
- **MDN: Cross-Origin Isolation**: https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
- **Chrome: SharedArrayBuffer Isolation**: https://developer.chrome.com/blog/enabling-shared-array-buffer/

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check GitHub issues: https://github.com/jaxonkhyer/Dragon-Gaming-Platforms/issues
4. Report bugs with detailed reproduction steps
