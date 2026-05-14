# Puter.js Setup Guide for Fireburst OS

Complete guide to setting up and configuring Puter.js as your backend for Fireburst OS.

## What is Puter.js?

Puter.js is a modern cloud platform for frontend applications. It provides:

- 👤 **User Authentication** - Built-in account system, no secrets to manage
- 📁 **Cloud Storage** - File upload/download with user isolation
- 💾 **Database** - Store messages, settings, and application data
- 🔐 **Security** - Automatic credential management
- ⚡ **Performance** - Global CDN, fast response times

**Official Website**: https://puter.com  
**Documentation**: https://docs.puter.com/

## Option 1: Using Puter.js Cloud (Easiest)

### Step 1: Create Account

1. Visit https://puter.com
2. Click "Sign Up"
3. Complete registration with email
4. Verify email address

### Step 2: Create Application

1. Log into Puter dashboard
2. Click "Create Application"
3. Name it "Fireburst OS"
4. Select "Web App"
5. Set homepage URL: `https://your-domain.com/` (or GitHub Pages URL)
6. Save application ID

### Step 3: Copy SDK URL

In Puter dashboard:
1. Go to App Settings
2. Copy the JavaScript SDK URL
3. Paste it before other scripts in `index.html`:

```html
<head>
    <!-- ... other meta tags ... -->
    <!-- Add Puter.js SDK -->
    <script src="https://js.puter.com/v2/puter.js"></script>
</head>
```

### Step 4: Initialize in Fireburst

The SDK will auto-initialize. To verify it's working:

```javascript
// In browser console
console.log(typeof puter); // Should be 'object'
console.log(puter.auth);   // Should show auth methods
```

### Step 5: Test Login

1. Open Messages app in Fireburst
2. Log in with your Puter account
3. Create a chat room
4. Verify data syncs to Puter backend

## Option 2: Self-Hosted Puter Server

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Docker (optional but recommended)

### Step 1: Clone Puter Repository

```bash
git clone https://github.com/HeyPuter/puter.git
cd puter
```

### Step 2: Configure Environment

Create `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=puter_db
DB_USER=puter
DB_PASS=your_secure_password

# App Configuration
NODE_ENV=production
PORT=3000
DOMAIN=puter.your-domain.com
PROTOCOL=https

# File Storage
STORAGE_ENGINE=fs
STORAGE_PATH=/var/lib/puter/storage

# API Keys
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
```

### Step 3: Install Dependencies

```bash
npm install
npm install -g pm2  # Process manager for Node
```

### Step 4: Initialize Database

```bash
npm run migrate:latest
npm run seed  # Optional: seed with test data
```

### Step 5: Start Server

```bash
# Development
npm start

# Production with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start on system reboot
```

### Step 6: SSL/HTTPS Setup

Using Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d puter.your-domain.com
```

Configure nginx reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name puter.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/puter.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/puter.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 7: Configure Fireburst to Use Self-Hosted

In `index.html` or `js/runtime-config.js`:

```javascript
window.PUTER_CONFIG = {
    apiUrl: 'https://puter.your-domain.com/api/v1'
};
```

Or in `puter-backend.js` constructor:

```javascript
class PuterBackend {
    constructor() {
        this.puterUrl = 'https://puter.your-domain.com';
        this.apiUrl = 'https://puter.your-domain.com/api/v1';
        // ...
    }
}
```

## Configuration Options

### Using Cloud Puter (Default)

No configuration needed! The SDK auto-initializes.

### Using Custom Puter Instance

In `js/puter-backend.js`, modify the constructor:

```javascript
class PuterBackend {
    constructor(customConfig = {}) {
        this.isInitialized = false;
        this.currentUser = null;
        this.authToken = null;
        
        // Use custom config if provided
        this.puterUrl = customConfig.puterUrl || 'https://puter.com';
        this.apiUrl = customConfig.apiUrl || 'https://api.puter.com/v1';
        
        // ... rest of constructor
    }
}

// Usage in index.html
const customPuterConfig = {
    puterUrl: 'https://puter.your-domain.com',
    apiUrl: 'https://puter.your-domain.com/api/v1'
};

window.puterBackend = new PuterBackend(customPuterConfig);
```

## User Authentication

### Automatic Login Flow

The Messages app automatically handles authentication:

```javascript
// User logs in through Puter UI
const result = await puterBackend.authenticate(email, password);

if (result.success) {
    console.log('✓ Logged in as:', result.user.email);
    console.log('Auth token:', result.token);
} else {
    console.error('Login failed:', result.error);
}
```

### Persistent Authentication

Puter.js stores auth tokens in secure storage:

```javascript
// Check if user is already logged in
const isAuthenticated = await puterBackend.isAuthenticated();

if (isAuthenticated) {
    const user = await puterBackend.getCurrentUser();
    console.log('Already authenticated as:', user.email);
}
```

### Logout

```javascript
// Puter provides logout method
if (typeof puter !== 'undefined' && puter.auth) {
    await puter.auth.logout();
}
```

## File Storage

### Upload Files

```javascript
// User selects file
const file = document.getElementById('fileInput').files[0];

// Upload to Puter
const result = await puterBackend.uploadFile(file, '/Fireburst/');

if (result.success) {
    console.log('✓ Uploaded:', result.filename);
    console.log('Path:', result.path);
    console.log('Size:', result.size);
}
```

### Download Files

```javascript
// Download from Puter
const blob = await puterBackend.downloadFile('/Fireburst/myfile.pdf');

// Create download link
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'myfile.pdf';
a.click();
```

### List Files

```javascript
// List files in directory
const files = await puterBackend.listFiles('/Fireburst/');

files.forEach(file => {
    console.log(`${file.name} (${file.size} bytes)`);
    console.log(`Modified: ${new Date(file.modified).toLocaleString()}`);
});
```

### Delete Files

```javascript
// Delete file
const result = await puterBackend.deleteFile('/Fireburst/old-file.txt');

if (result.success) {
    console.log('✓ File deleted');
}
```

## Database Operations

### Collections

Puter stores data in collections (like tables). Common collections for Fireburst:

- `chat_messages` - Messages from chat
- `chat_rooms` - Chat room metadata
- `user_settings` - User preferences
- `file_metadata` - File information

### Create Document

```javascript
// Save a new message
const messageId = await puterBackend.saveData('chat_messages', {
    room: 'general',
    sender: 'user@example.com',
    text: 'Hello everyone!',
    timestamp: new Date(),
    reactions: {}
});
```

### Query Documents

```javascript
// Get all messages in a room
const messages = await puterBackend.getData('chat_messages', {
    room: 'general'
});

// Get messages from a specific user
const userMessages = await puterBackend.getData('chat_messages', {
    sender: 'user@example.com'
});
```

### Update Document

```javascript
// Edit a message
const result = await puterBackend.updateData(
    'chat_messages', 
    messageId, 
    {
        text: 'Edited message',
        edited: true,
        editedAt: new Date()
    }
);
```

### Delete Document

```javascript
// Delete a message
const result = await puterBackend.deleteData('chat_messages', messageId);
```

## Chat Rooms

### Create Room

```javascript
// Create public room
await puterBackend.createRoom('developers', false);

// Create private room
await puterBackend.createRoom('secret-group', true);
```

### Get Room Members

```javascript
const members = await puterBackend.getRoomMembers('developers');
console.log('Members:', members);
```

### Add User to Room

```javascript
// Add user to private room
await puterBackend.addUserToRoom('secret-group', 'newuser@example.com');
```

### Check Privacy

```javascript
const isPrivate = await puterBackend.isRoomPrivate('developers');
console.log('Is private?', isPrivate);
```

## Monitoring & Administration

### User Management

In your Puter admin dashboard:

1. View all registered users
2. Manage user permissions
3. Reset user passwords
4. Monitor storage usage

### Database Monitoring

View database stats:

```bash
# Connect to Puter database
psql -h localhost -U puter -d puter_db

# View message count
SELECT COUNT(*) FROM chat_messages;

# View disk usage
SELECT pg_size_pretty(pg_database_size('puter_db'));
```

### Logs

```bash
# View Puter server logs
pm2 logs puter

# Filter by specific app
pm2 logs puter --lines 100
```

### Backups

```bash
# Automated daily backups
pg_dump -U puter -h localhost puter_db > backup_$(date +%Y%m%d).sql

# Setup cron for automatic backups
0 2 * * * pg_dump -U puter -h localhost puter_db > /backups/puter_$(date +\%Y\%m\%d).sql
```

## Performance Tuning

### Database Connection Pool

In self-hosted setup, optimize PostgreSQL:

```bash
# In postgresql.conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
```

### Caching

Enable Redis for session caching:

```bash
npm install redis
# Configure in .env
CACHE_ENGINE=redis
REDIS_URL=redis://localhost:6379
```

### CDN Integration

For self-hosted, use a CDN for static assets:

```javascript
// In index.html
<script src="https://cdn.example.com/puter-api.js"></script>
```

## Troubleshooting

### Authentication Issues

**Problem**: Users can't log in

**Solution**:
```javascript
// Check Puter initialization
console.log('Puter initialized:', typeof puter !== 'undefined');
console.log('Auth available:', typeof puter.auth !== 'undefined');

// Check for CORS issues in console
```

### File Upload Fails

**Problem**: Upload hangs or fails

**Solution**:
```javascript
// Check file size limit
const maxSize = 100 * 1024 * 1024; // 100MB
if (file.size > maxSize) {
    console.error('File too large');
}

// Check quota
const user = await puter.auth.getUser();
console.log('Storage used:', user.storage.used);
console.log('Storage limit:', user.storage.limit);
```

### Database Connection Error

**Problem**: Can't connect to Puter backend

**Solution**:
```bash
# Check if Puter server is running
curl https://puter.your-domain.com/api/health

# Check network connectivity
ping -c 4 puter.your-domain.com

# Check firewall
sudo ufw status
```

### Performance Issues

**Problem**: Slow queries or timeouts

**Solution**:
```javascript
// Add indexes in Puter database
// Contact Puter support for query optimization

// Cache frequently accessed data
const cachedRooms = {};
async function getRoomsCached() {
    if (!cachedRooms.data || Date.now() - cachedRooms.time > 60000) {
        cachedRooms.data = await puterBackend.getData('chat_rooms', {});
        cachedRooms.time = Date.now();
    }
    return cachedRooms.data;
}
```

## Security Best Practices

### 1. API Keys

- ✅ Store in environment variables
- ✅ Rotate regularly
- ❌ Never commit to Git
- ❌ Never expose in client code

### 2. User Permissions

- Set minimum required permissions
- Use role-based access control (RBAC)
- Regular audit of user access

### 3. Data Privacy

- Enable encryption for sensitive data
- Implement data retention policies
- GDPR compliance for user data

### 4. Rate Limiting

```javascript
// Implement rate limiting on Fireburst side
const requestCounts = {};

function isRateLimited(userId) {
    const count = requestCounts[userId] || 0;
    if (count > 100) return true; // 100 requests per minute
    requestCounts[userId] = count + 1;
    setTimeout(() => requestCounts[userId]--, 60000);
    return false;
}
```

## Support

- 📧 Puter Support: https://puter.com/support
- 💬 Community Discord: https://discord.gg/PQcx7Tye9u
- 🐛 Bug Reports: https://github.com/HeyPuter/puter/issues
- 📖 API Reference: https://docs.puter.com/reference

## Next Steps

1. ✅ Choose cloud or self-hosted option
2. ✅ Complete setup steps above
3. ✅ Test authentication with Messages app
4. ✅ Monitor logs and performance
5. ✅ Set up backups (if self-hosted)
6. ✅ Configure firewall/security
7. ✅ Deploy to production

---

**Last Updated**: 2024  
**Version**: 1.0
