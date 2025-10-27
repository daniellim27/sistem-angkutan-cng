# Bardi IPC Scraping Service

This service enables web scraping and API interaction with the Bardi IPC (ipc.bardi.co.id) platform using session token injection.

## 🚀 Quick Start

### 1. Setup Session Credentials

First, you need to obtain valid session cookies from your browser:

1. Open your browser and navigate to https://ipc.bardi.co.id/
2. Login to your account
3. Open Developer Tools (F12)
4. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
5. Navigate to **Cookies** → `https://ipc.bardi.co.id`
6. Copy the following cookie values:
   - `s-sid`
   - `s-sid.sig`
   - `uid`
   - `clientId`
   - `deviceId`

### 2. Update session.json

Edit `backend/session.json` with your copied values:

```json
{
  "cookies": {
    "s-sid": "YOUR_S_SID_VALUE",
    "s-sid.sig": "YOUR_S_SID_SIG_VALUE",
    "uid": "YOUR_UID_VALUE",
    "clientId": "YOUR_CLIENT_ID_VALUE",
    "deviceId": "YOUR_DEVICE_ID_VALUE"
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

### 3. Start the Backend Server

```bash
cd backend
npm start
```

### 4. Test the Scraping Service

Run the test script:

```bash
npm run test:bardi
```

Or manually:

```bash
node test-bardi-scraping.js
```

## 📡 API Endpoints

### Public Endpoints (No Authentication Required)

#### Test Session
```
GET /api/bardi/test-session
```
Tests if the session in `session.json` is valid.

**Response:**
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

#### Get Session Info
```
GET /api/bardi/session-info
```
Returns information about the current session configuration.

**Response:**
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

### Protected Endpoints (Authentication Required)

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get User Info
```
GET /api/bardi/user-info
```
Retrieves user information from Bardi.

#### Get Devices
```
GET /api/bardi/devices
```
Retrieves all devices associated with the Bardi account.

#### Get Device Details
```
GET /api/bardi/devices/:deviceId
```
Retrieves detailed information about a specific device.

**Parameters:**
- `deviceId` (path) - The ID of the device

#### Get Device Status
```
GET /api/bardi/devices/:deviceId/status
```
Retrieves the current status/events of a specific device.

**Parameters:**
- `deviceId` (path) - The ID of the device

#### Make Custom Request
```
POST /api/bardi/custom-request
```
Makes a custom request to any Bardi endpoint.

**Request Body:**
```json
{
  "endpoint": "/api/some-endpoint",
  "method": "GET",
  "data": {}
}
```

**Parameters:**
- `endpoint` (required) - The endpoint to call (relative or absolute URL)
- `method` (optional) - HTTP method (GET, POST, PUT, DELETE). Default: GET
- `data` (optional) - Request body data for POST/PUT requests

#### Update Session
```
PUT /api/bardi/session
```
Updates the session credentials.

**Request Body:**
```json
{
  "cookies": {
    "s-sid": "NEW_VALUE",
    "s-sid.sig": "NEW_VALUE",
    ...
  },
  "headers": {
    "User-Agent": "...",
    ...
  }
}
```

## 🧪 Testing

### Using the Test Script

The test script (`test-bardi-scraping.js`) provides comprehensive testing:

```bash
npm run test:bardi
```

### Manual Testing with cURL

#### Test Session (No Auth)
```bash
curl http://localhost:5000/api/bardi/test-session
```

#### Get User Info (With Auth)
```bash
# First, login to get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"awak1234"}' \
  | jq -r '.token')

# Then use the token
curl http://localhost:5000/api/bardi/user-info \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman

1. Import the following environment variables:
   - `BASE_URL`: `http://localhost:5000`
   - `TOKEN`: (set after login)

2. Login to get token:
   ```
   POST {{BASE_URL}}/api/auth/login
   Body: {"username":"admin","password":"awak1234"}
   ```

3. Test Bardi endpoints:
   ```
   GET {{BASE_URL}}/api/bardi/test-session
   GET {{BASE_URL}}/api/bardi/devices
   Headers: Authorization: Bearer {{TOKEN}}
   ```

## 🔧 Service Architecture

### File Structure

```
backend/
├── session.json                          # Session credentials (git-ignored)
├── session.json.template                 # Template for session file
├── test-bardi-scraping.js               # Test script
├── BARDI_SCRAPING_GUIDE.md              # This file
└── src/
    ├── services/
    │   └── bardiScrapingService.js      # Main scraping service
    ├── controllers/
    │   └── bardiScrapingController.js   # API controllers
    └── routes/
        └── bardiScraping.js             # Route definitions
```

### Service Methods

The `bardiScrapingService` provides these methods:

- `loadSession()` - Load session from session.json
- `getAxiosConfig()` - Get axios config with session cookies
- `testSession()` - Test if session is valid
- `getUserInfo()` - Get user information
- `getDevices()` - Get all devices
- `getDeviceDetails(deviceId)` - Get device details
- `getDeviceStatus(deviceId)` - Get device status
- `makeRequest(endpoint, method, data)` - Make custom request
- `updateSession(newSession)` - Update session credentials

## 🔒 Security Notes

1. **session.json** contains sensitive credentials and should NEVER be committed to git
2. The `.gitignore` should include `session.json`
3. Protected endpoints require JWT authentication from your main app
4. Session cookies may expire - you'll need to refresh them periodically
5. Consider rate limiting to avoid IP bans from Bardi

## 🐛 Troubleshooting

### Session Test Fails

**Symptoms:** `/api/bardi/test-session` returns 401 or error

**Solutions:**
1. Get fresh cookies from browser (they may have expired)
2. Verify you're logged in to ipc.bardi.co.id
3. Check that all required cookies are present
4. Ensure cookie values don't have extra whitespace

### Authentication Required Error

**Symptoms:** Protected endpoints return 401

**Solutions:**
1. Login first: `POST /api/auth/login`
2. Include the token in Authorization header: `Bearer YOUR_TOKEN`
3. Verify the token hasn't expired

### API Returns Unexpected Data

**Symptoms:** Data structure is different than expected

**Solutions:**
1. Bardi may have changed their API
2. Update the API base URL in `bardiScrapingService.js`
3. Use `/api/bardi/custom-request` to explore the actual API structure
4. Check browser Network tab to see actual API endpoints used by Bardi

### Session Expires Frequently

**Solutions:**
1. Implement automatic session refresh
2. Store session in database instead of file
3. Use a browser automation tool like Puppeteer to maintain session
4. Contact Bardi for official API access

## 📝 Notes

- The Bardi IPC API endpoints used in this service are based on typical API patterns
- Actual endpoints may differ - use browser DevTools to discover the real endpoints
- This is a scraping solution - official API would be more reliable
- Session cookies typically expire after some time (hours/days)
- Consider implementing session refresh automation for production use

## 🔄 Keeping Sessions Fresh

You may want to implement automatic session refresh. Here are some options:

### Option 1: Browser Automation with Puppeteer

```javascript
const puppeteer = require('puppeteer');

async function refreshSession() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://ipc.bardi.co.id/login');
  
  // Login
  await page.type('#username', 'your-username');
  await page.type('#password', 'your-password');
  await page.click('#login-button');
  await page.waitForNavigation();
  
  // Extract cookies
  const cookies = await page.cookies();
  const session = {
    cookies: {},
    headers: { /* ... */ }
  };
  
  cookies.forEach(cookie => {
    session.cookies[cookie.name] = cookie.value;
  });
  
  // Save to session.json
  await fs.writeFile('session.json', JSON.stringify(session, null, 2));
  
  await browser.close();
}
```

### Option 2: Scheduled Session Check

Add to your server.js:

```javascript
const bardiScrapingService = require('./services/bardiScrapingService');

// Check session every hour
setInterval(async () => {
  const result = await bardiScrapingService.testSession();
  if (!result.success) {
    console.warn('⚠️ Bardi session expired - manual refresh needed');
    // Send notification or trigger refresh
  }
}, 60 * 60 * 1000); // 1 hour
```

## 📚 Additional Resources

- Bardi Official Website: https://bardi.id/
- Bardi IPC Platform: https://ipc.bardi.co.id/
- Axios Documentation: https://axios-http.com/
- Express.js Routing: https://expressjs.com/en/guide/routing.html

