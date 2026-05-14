# Fireburst OS V2.0 - Developer Migration Guide

Quick start guide for migrating Fireburst OS to the new architecture with CheerpX isolation and Puter.js backend.

## What Changed?

### 🎯 Main Benefits

1. ✅ **Main app is no longer cross-origin isolated** - Third-party iframes work now
2. ✅ **CheerpX runs in isolated popup** - No SharedArrayBuffer pollution
3. ✅ **Cloud backend via Puter.js** - No more GAS complexity
4. ✅ **Backward compatible** - Existing apps still work

### 📊 Architecture Comparison

| Aspect | V1 (Old) | V2 (New) |
|--------|----------|----------|
| CheerpX Location | Main app | Separate popup |
| Isolation | Global COOP/COEP | Isolated to runner |
| Backend | Google Apps Script | Puter.js (+ GAS fallback) |
| Third-party Iframes | ❌ Blocked | ✅ Allowed |
| Backend Secrets | Risky | Secure |
| User Auth | Custom JSONP | Puter managed |

## Quick Start (5 minutes)

### 1. No Changes Needed for Most Apps

Apps using `postMessage` with parent window continue to work without changes.

### 2. Apps Using Google Apps Script

For apps like `messages.html`, the wrapper automatically handles the migration:

```javascript
// Your existing code just works!
google.script.run.withSuccessHandler(callback).getData(room);
```

The wrapper now:
- ✅ Detects Puter.js backend automatically
- ✅ Falls back to GAS if Puter unavailable
- ✅ No code changes required

### 3. Apps Needing CheerpX

For terminal, code editor, or native app runners:

```javascript
// Open CheerpX runner
const bridge = new CheerpXBridge();
await bridge.open();

// Execute commands
await bridge.executeCommand('gcc program.c -o program');
```

## File Changes Checklist

### 🆕 New Files Added

- ✅ `cheerpx-runner.html` - Isolated CheerpX environment
- ✅ `js/cheerpx-bridge.js` - postMessage bridge
- ✅ `js/puter-backend.js` - Puter.js integration
- ✅ `ARCHITECTURE_V2.md` - Full documentation
- ✅ `MIGRATION_GUIDE.md` - This file

### 📝 Files Modified

- `index.html` - Updated to load new modules, made COI optional
- `apps/store/messages.html` - Updated backend wrapper
- `js/runtime-config.js` - No changes needed

### ❌ Files Removed/Deprecated

- ❌ Direct use of `js/cheerpx-manager.js` - Use `cheerpx-bridge.js` instead
- ⚠️  `coi-serviceworker.js` - Still available but optional

## Deployment Steps

### Step 1: Deploy New Files

```bash
git add cheerpx-runner.html ARCHITECTURE_V2.md MIGRATION_GUIDE.md
git add js/cheerpx-bridge.js js/puter-backend.js
git commit -m "feat: Implement v2 architecture with CheerpX isolation and Puter.js"
git push
```

### Step 2: Update index.html

Changes already made, but verify:

```html
<!-- ✅ OLD COI SERVICE WORKER - NOW OPTIONAL -->
<script>
    const enableCOI = false; // Changed from automatic load
    if (enableCOI) {
        const script = document.createElement('script');
        script.src = 'coi-serviceworker.js';
        document.head.appendChild(script);
    }
</script>

<!-- ✅ NEW BACKEND MODULES - ADDED TO BOTTOM -->
<script src="js/puter-backend.js"></script>
<script src="js/cheerpx-bridge.js"></script>
```

### Step 3: Verify in Staging

Test that:
- [ ] Main OS loads without COI warnings
- [ ] Third-party iframes load (if you have any)
- [ ] Messages app works
- [ ] Can open CheerpX runner

### Step 4: Deploy to Production

```bash
# Ensure tests pass
npm test

# Deploy
npm run deploy
```

## Migration Patterns

### Pattern 1: Terminal/Code Editor

**Before (V1)**:
```javascript
const manager = new CheerpXManager();
await manager.initialize();
await manager.createTerminal(container);
```

**After (V2)**:
```javascript
const bridge = new CheerpXBridge();
await bridge.open();
await bridge.executeCommand('bash');
```

### Pattern 2: Chat/Messages App

**Before (V1)**:
```javascript
function google() {
  script: {
    run: {
      // Manual GAS wrapper
      getData: async function(room) {
        const response = await fetch(BACKEND_URL, {
          // Complex JSONP bypass
        });
      }
    }
  }
}
```

**After (V2)**:
```javascript
// ✅ Automatic wrapper handles both Puter + GAS
const google = {
  script: {
    run: {
      withSuccessHandler(callback) {
        return {
          async _call(action, params) {
            // Automatically uses Puter.js or GAS
            const result = usePuterBackend 
              ? await backend.getData(params.room)
              : await jsonpRequest(BACKEND_URL, params);
            callback(result);
          },
          getData: (room) => this._call('getData', { room })
        };
      }
    }
  }
};
```

### Pattern 3: File Operations

**Before (V1)**:
```javascript
// Required CheerpX to be in main app
const file = await cheerpxManager.fileSystemBridge.downloadFile('/tmp/file.txt');
```

**After (V2)**:
```javascript
// Option A: Through CheerpX runner
const file = await cheerpxBridge.downloadFile('/tmp/file.txt');

// Option B: Through Puter.js cloud storage
const file = await puterBackend.downloadFile('/Fireburst/file.txt');
```

## Testing Checklist

```javascript
// Test 1: Main app works without COI
✓ window.crossOriginIsolated === false

// Test 2: Third-party iframes work
✓ Can embed YouTube, CodePen, etc.

// Test 3: CheerpX bridge connects
✓ cheerpxBridge.open() succeeds
✓ cheerpxBridge.ping() returns true

// Test 4: Puter backend works
✓ puterBackend.isInitialized === true
✓ Can authenticate users
✓ Can save/retrieve data

// Test 5: Messages app works
✓ Can create rooms
✓ Can send messages
✓ Can see message history

// Test 6: Fallback to GAS works
✓ Set enableCOI = false
✓ Messages app still works via GAS fallback
```

## Common Issues & Solutions

### Issue: "CheerpX runner not connected"

**Cause**: Window blocking or popup disabled

**Solution**:
```javascript
// Add delay to allow user interaction first
setTimeout(async () => {
  const bridge = new CheerpXBridge();
  const connected = await bridge.open();
}, 500);
```

### Issue: "Puter SDK not available"

**Cause**: Network issue or Puter.js not loaded

**Solution**:
```javascript
// In index.html, ensure proper loading order
<script src="js/runtime-config.js"></script>
<script src="js/puter-backend.js"></script>  <!-- Load before other scripts -->
```

### Issue: Messages app only works with GAS

**Cause**: Puter backend not initialized

**Solution**:
```javascript
// Wait for initialization
await new Promise(resolve => {
  const check = setInterval(() => {
    if (window.puterBackend.isInitialized) {
      clearInterval(check);
      resolve();
    }
  }, 100);
});
```

### Issue: CheerpX commands timeout

**Cause**: Long-running operation or connection lost

**Solution**:
```javascript
// Increase timeout for long operations
const result = await cheerpxBridge.execute('long-command', {
  timeout: 30000  // 30 seconds instead of default 10
});
```

## Performance Tips

### 1. Lazy Load CheerpX

```javascript
let cheerpxBridge = null;

async function getCheerpX() {
  if (!cheerpxBridge) {
    cheerpxBridge = new CheerpXBridge();
    await cheerpxBridge.open();
  }
  return cheerpxBridge;
}
```

### 2. Batch Database Queries

```javascript
// ❌ Bad: Multiple round trips
for (let i = 0; i < 100; i++) {
  const msg = await puterBackend.getData('messages', { id: i });
}

// ✅ Good: Single query with filter
const msgs = await puterBackend.getData('messages', {
  room: 'general'
});
```

### 3. Cache Expensive Operations

```javascript
let cachedRooms = null;

async function getRooms() {
  if (!cachedRooms) {
    cachedRooms = await puterBackend.getData('chat_rooms', {});
  }
  return cachedRooms;
}
```

## Rollback Plan

If you need to revert to V1:

```bash
# Revert commits
git revert <commit-sha>

# Or manually restore:
1. Remove js/cheerpx-bridge.js and js/puter-backend.js
2. Restore js/cheerpx-manager.js from git history
3. Restore index.html to load coi-serviceworker.js directly
4. Restore apps/store/messages.html GAS wrapper
```

## Support & Questions

- 📖 Full docs: See `ARCHITECTURE_V2.md`
- 🐛 Bug reports: GitHub issues
- 💬 Questions: GitHub discussions
- 📧 Contact: Through repository

## Success Checklist

Before launching V2 in production:

- [ ] All files deployed correctly
- [ ] Main app works without COI
- [ ] CheerpX runner opens successfully
- [ ] Messages app syncs with Puter backend
- [ ] Third-party iframes load (if used)
- [ ] GAS fallback works (if configured)
- [ ] No console errors
- [ ] Performance acceptable
- [ ] User authentication works
- [ ] File uploads/downloads work

## Next Steps

1. ✅ Deploy V2 code
2. ✅ Update GitHub README with new setup instructions
3. ✅ Test in staging environment
4. ✅ Get feedback from early users
5. ✅ Monitor error logs in production
6. ✅ Plan future enhancements (real-time sync, PWA, etc.)

---

**Version**: 2.0  
**Date**: 2024  
**Status**: Ready for Production
