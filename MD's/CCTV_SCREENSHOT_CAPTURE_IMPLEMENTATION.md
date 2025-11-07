# CCTV Screenshot Capture - Implementation Complete ✅

## What Was Implemented

### 1. BARDI Camera Snapshot Service ✅
**File**: `backend/src/services/bardiScrapingService.js`

**New Method**: `getCameraSnapshot(deviceId)`

**What it does**:
- Tries common BARDI camera snapshot URLs in order:
  1. `/tmpfs/snap.jpg` (most common for BARDI cameras)
  2. `/snapshot.cgi`
  3. `/cgi-bin/snapshot.cgi`
  4. `/api/snapshot`
  5. `/snapshot`
  6. `/api/device/{deviceId}/snapshot` (if deviceId provided)

- Gets image as **Buffer** (binary data)
- Validates it's actually an image (checks `Content-Type`)
- Returns image buffer ready for upload

**Response Format**:
```javascript
{
  success: true,
  imageBuffer: Buffer,        // The actual image data
  contentType: 'image/jpeg',  // Image type
  endpoint: '/tmpfs/snap.jpg',// Which URL worked
  size: 123456                // Image size in bytes
}
```

---

### 2. Cloudinary CCTV Screenshot Upload ✅
**File**: `backend/src/services/cloudinaryService.js`

**New Method**: `uploadCCTVScreenshot(imageBuffer, sessionId, sequenceNumber)`

**What it does**:
- Takes image buffer from BARDI
- Converts to base64 for Cloudinary
- Uploads to folder: `cctv/session_{sessionId}/`
- Filename: `screenshot_{sequenceNumber}_{timestamp}.jpg`
- Applies optimizations:
  - Max resolution: 1920x1080
  - Quality: auto:good
  - Format: JPEG

**Response Format**:
```javascript
{
  success: true,
  publicId: 'cctv/session_1/screenshot_1_2025-11-01...',
  secureUrl: 'https://res.cloudinary.com/...',
  url: 'http://res.cloudinary.com/...',
  format: 'jpg',
  width: 1280,
  height: 720,
  bytes: 145632
}
```

---

### 3. Integrated Screenshot Capture Flow ✅
**File**: `backend/src/services/cctvMonitoringService.js`

**Updated Method**: `captureScreenshot(sessionId, options)`

**New Flow**:
```
1. Get session from database
2. Call BARDI API → getCameraSnapshot(deviceId)
3. Receive image buffer
4. Upload to Cloudinary → uploadCCTVScreenshot()
5. Store screenshot record with REAL URL
6. Update session statistics
7. Return screenshot data
```

**Changes Made**:
- ✅ Removed placeholder URLs
- ✅ Actual BARDI snapshot download
- ✅ Real Cloudinary upload
- ✅ Proper error handling
- ✅ Detailed logging
- ✅ OCR disabled by default (`processOcr = false`)

---

## How It Works Now

### When You Click "Capture Screenshot":

#### 1. Frontend sends request:
```http
POST /api/web/cctv-monitoring/sessions/{id}/capture
Authorization: Bearer {token}
```

#### 2. Backend flow:
```
📸 Calling BARDI API for device: {device_id}
🔍 Trying snapshot URL: /tmpfs/snap.jpg
✅ Got snapshot from: /tmpfs/snap.jpg (image/jpeg)
✅ BARDI snapshot received: 145632 bytes (image/jpeg)
📤 Uploading to Cloudinary...
📸 Uploading CCTV screenshot to Cloudinary...
Session: 1, Sequence: 1, Size: 145632 bytes
✅ CCTV screenshot uploaded: cctv/session_1/screenshot_1_2025-11-01...
✅ Screenshot uploaded successfully
   URL: https://res.cloudinary.com/.../screenshot_1_2025-11-01...
   Size: 1280x720
   Bytes: 145632
```

#### 3. Database record created:
```sql
INSERT INTO cctv_screenshots (
  session_id,
  screenshot_url,          -- REAL Cloudinary URL
  cloudinary_public_id,    -- Cloudinary public ID
  captured_at,             -- Timestamp
  sequence_number,         -- Screenshot number
  ocr_status              -- 'pending' (OCR disabled)
)
```

#### 4. API Response:
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "id": 1,
    "session_id": 1,
    "screenshot_url": "https://res.cloudinary.com/.../screenshot_1_2025-11-01...",
    "cloudinary_public_id": "cctv/session_1/screenshot_1_2025-11-01...",
    "captured_at": "2025-11-01T03:45:12.345Z",
    "sequence_number": 1,
    "ocr_status": "pending",
    "notes": "Manual snapshot"
  }
}
```

#### 5. Frontend displays:
- ✅ Real screenshot image from Cloudinary
- ✅ Capture timestamp
- ✅ OCR status: "Pending" (not processed)
- ✅ No fake meter readings

---

## Testing Checklist

### Prerequisites:
- ✅ Backend running in Docker
- ✅ BARDI session token configured
- ✅ Cloudinary credentials in `.env`
- ✅ Active CCTV session created

### Test Steps:

#### 1. **Create a Session**
```
1. Go to CCTV Monitoring page
2. Toggle "Real Data" ON
3. Click "Create Session"
4. Check "Include completed/cancelled delivery orders"
5. Select a delivery order
6. Select a customer
7. Enter device ID (or leave empty for testing)
8. Set panel location (row/column)
9. Click "Create Monitoring Session"
```

**Expected Result**: Session created with status `active`

#### 2. **Capture Screenshot (Manual)**
```
1. Find your active session in the table
2. Click the camera icon (📸) button
3. Watch the Docker logs
```

**Expected Logs**:
```
📸 Calling BARDI API for device: ...
🔍 Trying snapshot URL: /tmpfs/snap.jpg
✅ Got snapshot from: /tmpfs/snap.jpg
✅ BARDI snapshot received: X bytes
📤 Uploading to Cloudinary...
✅ CCTV screenshot uploaded
```

**Expected Result**: 
- Screenshot record created
- Real Cloudinary URL stored
- No OCR processing
- Toast notification: "Screenshot captured!"

#### 3. **View Screenshot**
```
1. Click "View Details" on the session
2. Check the screenshot gallery
3. Click on the screenshot thumbnail
```

**Expected Result**:
- ✅ Real camera image displayed (from Cloudinary)
- ✅ No placeholder/broken image
- ✅ Lightbox opens with full-size image
- ✅ OCR status shows "Pending"
- ✅ No fake meter readings

#### 4. **Check Database**
```sql
SELECT 
  id,
  screenshot_url,
  cloudinary_public_id,
  ocr_status,
  ocr_result,
  sequence_number,
  captured_at
FROM cctv_screenshots
ORDER BY captured_at DESC
LIMIT 1;
```

**Expected Result**:
- `screenshot_url`: Real Cloudinary URL (starts with `https://res.cloudinary.com/`)
- `cloudinary_public_id`: `cctv/session_X/screenshot_Y_...`
- `ocr_status`: `pending`
- `ocr_result`: `null`

---

## Error Handling

### Error 1: BARDI Snapshot Failed
**Error Message**: 
```
Failed to capture screenshot: No valid snapshot endpoint found
```

**Possible Causes**:
- BARDI session token expired
- Device ID incorrect
- Camera offline
- BARDI uses different snapshot URL

**Solution**:
1. Update BARDI token
2. Check device ID
3. Test BARDI camera access manually
4. Check Docker logs for attempted URLs

### Error 2: Cloudinary Upload Failed
**Error Message**: 
```
Failed to capture screenshot: Failed to upload CCTV screenshot: ...
```

**Possible Causes**:
- Cloudinary credentials not configured
- Network issue
- Image too large
- Cloudinary quota exceeded

**Solution**:
1. Check `.env` has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
2. Check Docker logs for Cloudinary error details
3. Check Cloudinary dashboard for usage/quota

### Error 3: Session Not Active
**Error Message**: 
```
Session X is not active (status: completed)
```

**Solution**: Only capture screenshots from `active` sessions

---

## What Changed from Before

### Before ❌:
```json
{
  "screenshot_url": "https://via.placeholder.com/800x600.png?text=...",
  "ocr_status": "success",
  "ocr_result": {
    "meter_reading": 2456.78,  // Fake data
    "pressure": 198.7,
    "temperature": 27.3
  }
}
```

### After ✅:
```json
{
  "screenshot_url": "https://res.cloudinary.com/your-cloud/image/upload/v.../cctv/session_1/screenshot_1_2025-11-01...",
  "ocr_status": "pending",
  "ocr_result": null
}
```

---

## Environment Variables Required

Add to `.env`:
```bash
# Cloudinary (required for screenshot upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OCR (optional - can be disabled)
# OCR_API_KEY=your_ocr_api_key
# OCR_API_URL=https://api.ocr.space/parse/image
```

---

## Architecture

```
┌─────────────┐
│  Frontend   │
│  (Manual    │
│  Capture)   │
└──────┬──────┘
       │ POST /sessions/{id}/capture
       ▼
┌──────────────────────────────────┐
│  CCTV Monitoring Service         │
│  captureScreenshot()             │
└──────┬───────────────────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ BARDI API    │    │ Cloudinary   │
│ Service      │    │ Service      │
│              │    │              │
│ Get Snapshot │    │ Upload Image │
└──────┬───────┘    └───────┬──────┘
       │                    │
       │ imageBuffer        │ secureUrl
       │                    │
       └────────┬───────────┘
                ▼
       ┌─────────────────┐
       │   PostgreSQL    │
       │ cctv_screenshots│
       │  - screenshot_url
       │  - cloudinary_id
       │  - ocr_status
       └─────────────────┘
```

---

## Next Steps (Optional)

### 1. Implement Auto-Snapshot (Phase 4)
- Background worker that captures screenshots automatically
- Based on `screenshot_interval_minutes` setting
- Only for sessions with auto-snapshot enabled

### 2. Implement OCR Processing
- When meter readings are visible in camera
- Configure OCR API key
- Enable OCR processing
- Extract meter readings automatically

### 3. Health Monitoring
- Detect missed captures
- Mark sessions as "dead" if no recent screenshots
- Send alerts

---

## Troubleshooting

### Check if BARDI snapshot URL is working:
```bash
# Get BARDI session from session.json
docker exec -it angkutan_backend cat /app/session.json

# Test snapshot URL manually
curl -H "Cookie: s-sid=YOUR_SESSION_SID" https://ipc.bardi.co.id/tmpfs/snap.jpg --output test.jpg
```

### Check Cloudinary upload:
```bash
# Check Docker logs
docker logs angkutan_backend -f

# Look for:
✅ CCTV screenshot uploaded: cctv/session_X/screenshot_Y
```

### Check database:
```sql
-- See latest screenshot
SELECT * FROM cctv_screenshots ORDER BY captured_at DESC LIMIT 1;

-- Count screenshots per session
SELECT session_id, COUNT(*) as total
FROM cctv_screenshots
GROUP BY session_id;
```

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**  
**Last Updated**: November 1, 2025  
**Ready for Testing**: YES

