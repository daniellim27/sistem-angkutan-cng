# 🚀 Bardi Scraping - Quick Start Guide

This guide will help you get the Bardi scraping service up and running in 5 minutes.

## 📋 Prerequisites

1. Backend server running
2. Valid Bardi IPC account (https://ipc.bardi.co.id/)
3. Admin user created (username: `admin`, password: `awak1234`)

## 🔧 Setup Steps

### Step 1: Get Your Session Cookies

1. **Open Browser** and go to https://ipc.bardi.co.id/
2. **Login** to your Bardi account
3. **Open DevTools** (Press F12)
4. **Go to Application/Storage tab**
5. **Navigate to Cookies** → `https://ipc.bardi.co.id`
6. **Copy these cookie values:**
   - `s-sid`
   - `s-sid.sig`
   - `uid`
   - `clientId`
   - `deviceId`

### Step 2: Update session.json

Open `backend/session.json` and update with your values:

```json
{
  "cookies": {
    "s-sid": "PASTE_YOUR_S_SID_HERE",
    "s-sid.sig": "PASTE_YOUR_SIG_HERE",
    "uid": "PASTE_YOUR_UID_HERE",
    "clientId": "PASTE_YOUR_CLIENT_ID_HERE",
    "deviceId": "PASTE_YOUR_DEVICE_ID_HERE"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://ipc.bardi.co.id/",
    "Origin": "https://ipc.bardi.co.id",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br"
  }
}
```

### Step 3: Start Backend Server

```bash
cd backend
npm start
```

You should see:
```
🚀 Server running on http://0.0.0.0:5000
```

### Step 4: Test the Service

**Option A: Using Node.js Test Script**
```bash
cd backend
npm run test:bardi
```

**Option B: Using Web Interface**
1. Open `backend/test-bardi-web.html` in your browser
2. Click "Login" (uses admin/awak1234)
3. Click "Test Session" to verify Bardi cookies work
4. Try other tests

**Option C: Using cURL**
```bash
# Test session (no auth needed)
curl http://localhost:5000/api/bardi/test-session

# Get session info
curl http://localhost:5000/api/bardi/session-info
```

## ✅ Verify It's Working

You should see:

**Test Session Response:**
```json
{
  "success": true,
  "message": "Session is valid and working",
  "data": {
    "statusCode": 200,
    "responseLength": 12345
  }
}
```

**Session Info Response:**
```json
{
  "success": true,
  "data": {
    "cookies": ["s-sid", "s-sid.sig", "uid", "clientId", "deviceId"],
    "headers": ["User-Agent", "Referer", "Origin", "Accept"],
    "hasValidStructure": true
  }
}
```

## 🎯 Available Endpoints

### Public (No Auth Required)
- `GET /api/bardi/test-session` - Test if session is valid
- `GET /api/bardi/session-info` - Get session structure info

### Protected (Requires Login)
- `GET /api/bardi/user-info` - Get Bardi user info
- `GET /api/bardi/devices` - Get all devices
- `GET /api/bardi/devices/:deviceId` - Get device details
- `GET /api/bardi/devices/:deviceId/status` - Get device status
- `POST /api/bardi/custom-request` - Make custom API call
- `PUT /api/bardi/session` - Update session credentials

## 🐛 Troubleshooting

### ❌ "Session test failed" or 401 Error

**Problem:** Session cookies expired or invalid

**Solution:**
1. Get fresh cookies from browser (they expire periodically)
2. Make sure you're still logged in to ipc.bardi.co.id
3. Clear browser cache and login again
4. Copy ALL cookie values exactly as shown

### ❌ "Authentication required"

**Problem:** No auth token provided

**Solution:**
1. Login first: `POST /api/auth/login`
2. Use the returned token in Authorization header
3. In test script, make sure login() is called first

### ❌ "Cannot find session.json"

**Problem:** Session file doesn't exist

**Solution:**
1. Copy `session.json.template` to `session.json`
2. Update with your actual cookie values

### ❌ "CORS error" in browser

**Problem:** Browser blocking cross-origin requests

**Solution:**
1. Server already has CORS enabled
2. Make sure backend is running on port 5000
3. If using different port, update `API_BASE` in test-bardi-web.html

## 📚 Next Steps

1. **Read Full Guide:** See `BARDI_SCRAPING_GUIDE.md` for detailed documentation
2. **Explore API:** Use custom-request endpoint to discover more endpoints
3. **Automate:** Set up automatic session refresh (see guide)
4. **Integrate:** Use the service in your application

## 🔒 Security Notes

- ⚠️ **NEVER** commit `session.json` to git (already in .gitignore)
- 🔐 Session cookies are sensitive - treat them like passwords
- ⏰ Cookies expire - you'll need to refresh them periodically
- 🛡️ Protected endpoints require JWT authentication

## 💡 Tips

- **Cookie Expiration:** Bardi cookies typically last 1-7 days
- **Rate Limiting:** Don't spam requests to avoid IP bans
- **Error Handling:** Always check `success` field in responses
- **Testing:** Use the web interface for quick manual tests
- **Production:** Consider implementing automatic session refresh

## 🆘 Need Help?

1. Check server logs for detailed error messages
2. Verify backend is running: `curl http://localhost:5000/health`
3. Test basic auth: `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"awak1234"}'`
4. Review `BARDI_SCRAPING_GUIDE.md` for more details

## 📁 File Structure

```
backend/
├── session.json                    # Your session credentials (git-ignored)
├── session.json.template          # Template file
├── test-bardi-scraping.js        # Node.js test script
├── test-bardi-web.html           # Web test interface
├── BARDI_SCRAPING_GUIDE.md       # Full documentation
├── BARDI_SETUP_QUICK_START.md    # This file
└── src/
    ├── services/
    │   └── bardiScrapingService.js
    ├── controllers/
    │   └── bardiScrapingController.js
    └── routes/
        └── bardiScraping.js
```

---

**Happy Scraping! 🎉**

