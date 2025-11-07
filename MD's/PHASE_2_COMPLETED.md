# Phase 2: Backend Services - COMPLETED ✅

## What We've Built

Phase 2 is now complete! We've created the core business logic services for CCTV monitoring.

### Files Created

1. **`backend/src/services/cctvMonitoringService.js`** ✅ (750+ lines)
   - Complete CCTV session management
   - Screenshot capture orchestration
   - Health monitoring and statistics
   - Integration with BARDI and OCR services

2. **`backend/src/services/meterOcrService.js`** ✅ (400+ lines)
   - Specialized OCR for gas meters
   - Extracts meter readings, pressure, temperature, flow rate
   - Mock OCR for development/testing
   - Confidence scoring and validation

---

## Service: cctvMonitoringService.js

### Core Methods

#### Session Management
- `createSession(sessionData)` - Create new monitoring session
- `getSessions(filters)` - Get all sessions with statistics
- `getSessionById(sessionId)` - Get single session details
- `stopSession(sessionId, options)` - Stop active session
- `restartSession(sessionId)` - Restart stopped/dead session

#### Screenshot Operations
- `captureScreenshot(sessionId, options)` - Capture screenshot manually
- `getSessionScreenshots(sessionId, filters)` - Get session screenshots
- `processScreenshotOcr(screenshotId)` - Process OCR for screenshot
- `retryOcr(screenshotId)` - Retry failed OCR processing

#### Health & Statistics
- `calculateHealthStats(sessions)` - Calculate system-wide statistics
- `getSessionHealth(sessionId)` - Get detailed session health info

### Features Implemented

✅ **Session Lifecycle Management**
- Create sessions linked to delivery orders
- Prevent duplicate active sessions
- Track session status (active, stopped, dead, completed)
- Auto-generate device IDs

✅ **Screenshot Handling**
- Integration with BARDI API
- Upload to Cloudinary (placeholder ready)
- Sequence numbering
- Automatic OCR queueing

✅ **Health Monitoring**
- Calculate health status (healthy, warning, critical, dead)
- Track time since last capture
- Monitor capture success rates
- OCR success rate tracking

✅ **Statistics & Analytics**
- Session counts by status
- Screenshot counts (today, this week)
- OCR success rates
- Average confidence scores

✅ **Error Handling**
- Comprehensive try-catch blocks
- Detailed error logging
- Graceful failure handling

---

## Service: meterOcrService.js

### Core Methods

#### OCR Processing
- `processMeterReading(imageUrl)` - Main OCR processing
- `callOcrApi(imageUrl)` - OCR API integration
- `getMockOcrResponse()` - Mock data for development

#### Data Parsing
- `parseMeterData(text)` - Extract meter data from OCR text
- `validateMeterData(data)` - Validate extracted values
- `calculateConfidence(parsedData, ocrResponse)` - Confidence scoring

#### Advanced Features
- `retryWithEnhancements(imageUrl, options)` - Enhanced retry
- `batchProcess(imageUrls)` - Batch processing

### Data Extraction

Extracts the following from meter images:

| Field | Pattern | Validation |
|-------|---------|------------|
| **Meter Reading** | Numbers + m³ unit | 0 - 999,999 |
| **Pressure** | Numbers + bar/psi | 0 - 500 bar |
| **Temperature** | Numbers + °C/°F | -50 - 100°C |
| **Flow Rate** | Numbers + m³/h | 0 - 200 m³/h |
| **Timestamp** | Date/Time formats | Valid date/time |

### Mock Data for Development

The service includes **mock OCR responses** for development:
- Random realistic meter readings
- Confidence scores (0.85-0.95)
- Properly formatted output
- No OCR API required for testing

**Enable Mock Mode:**
```env
# In .env file
NODE_ENV=development
# OR
OCR_API_KEY=demo
```

---

## Integration Points

### With Existing Services

**BARDI Integration** (`bardiScrapingService.js`)
```javascript
// Called in captureScreenshot()
const bardiResult = await bardiScrapingService.takeCameraScreenshot(session.device_id);
```

**Cloudinary** (Already configured)
```javascript
// Ready for actual image upload
const upload = await cloudinary.uploader.upload(imageBuffer, {
  folder: 'cctv',
  resource_type: 'image',
});
```

**Database Models**
```javascript
const { CCTVSession, CCTVScreenshot, DeliveryOrder, NotaKecil, User } = db;
```

---

## Example Usage

### Create a Session

```javascript
const cctvService = require('./services/cctvMonitoringService');

const result = await cctvService.createSession({
  delivery_order_id: 123,
  customer_name: 'PT Qurpol Indonesia',
  customer_location_index: 0,
  device_id: 'BARDI-CAM-001',
  panel_row: 1,
  panel_column: 2,
  screenshot_interval_minutes: 10,
  created_by: 5, // User ID
});

console.log(result.session.id); // New session ID
```

### Capture Screenshot

```javascript
const screenshot = await cctvService.captureScreenshot(sessionId, {
  processOcr: true,
  notes: 'Manual capture for verification',
});

console.log(screenshot.screenshot.id);
// OCR processing starts automatically in background
```

### Get Session Health

```javascript
const health = await cctvService.getSessionHealth(sessionId);

console.log(health.data);
// {
//   health_status: 'healthy',
//   uptime_minutes: 120,
//   capture_success_rate: 0.95,
//   ocr_success_rate: 0.88,
//   recommendations: ['System operating normally']
// }
```

### Process OCR

```javascript
const meterOcrService = require('./services/meterOcrService');

const result = await meterOcrService.processMeterReading(imageUrl);

if (result.success) {
  console.log(result.data);
  // {
  //   meter_reading: 1234.56,
  //   pressure: 205.3,
  //   temperature: 28.5,
  //   flow_rate: 15.2,
  //   unit: 'm³'
  // }
}
```

---

## Key Features

### 🔄 Automatic Health Monitoring

Sessions automatically calculate their health status:

```javascript
const healthStatus = session.getHealthStatus();
// Returns: 'healthy', 'warning', 'critical', or 'dead'
```

**Logic:**
- **Healthy**: Recent screenshots within interval
- **Warning**: Delayed by 1.5x interval
- **Critical**: Delayed by 2x interval
- **Dead**: No screenshots for > health_check_interval

### 📊 Comprehensive Statistics

System-wide statistics:
- Total sessions (by status)
- Screenshots captured (today/week)
- OCR success rates
- Average confidence scores

### 🛡️ Validation & Error Handling

**Data Validation:**
- Meter readings: 0 - 999,999
- Pressure: 0 - 500 bar
- Temperature: -50 - 100°C
- Flow rate: 0 - 200 m³/h

**Error Handling:**
- Try-catch on all async operations
- Detailed error logging
- Failed OCR tracking with retry count
- Graceful degradation

### 🔧 Mock Mode for Development

Both services work **without external dependencies** in development:
- Mock BARDI screenshot captures
- Mock OCR responses with realistic data
- No API keys required for testing

---

## Environment Variables

Add to `backend/.env`:

```env
# OCR Configuration
OCR_API_URL=https://api.ocr.space/parse/image
OCR_API_KEY=your_ocr_api_key_here

# Development Mode (uses mocks)
NODE_ENV=development

# Cloudinary (should already exist)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Next Steps: Phase 3

Now that we have the service layer, we need to expose it via API:

### Phase 3: API Routes & Controllers

1. **Create `cctvMonitoring.controller.js`** ✅ Next
   - Connect service methods to HTTP endpoints
   - Request validation
   - Response formatting
   - Error handling middleware

2. **Create `cctvMonitoring.routes.js`**
   - Define all API routes
   - Apply authentication middleware
   - Configure route parameters

3. **Register routes in `server.js`**
   - Mount CCTV routes
   - Test basic endpoints

**Estimated Time:** 2-3 hours

---

## Testing the Services

You can test the services directly in Node.js:

```javascript
// backend/test_services.js
require('dotenv').config();
const cctvService = require('./src/services/cctvMonitoringService');
const db = require('./src/models');

async function testServices() {
  try {
    await db.sequelize.authenticate();
    console.log('✓ Database connected');
    
    // Create a test session
    const session = await cctvService.createSession({
      delivery_order_id: 1, // Must exist in your DB
      customer_name: 'Test Customer',
      customer_location_index: 0,
    });
    
    console.log('✓ Session created:', session.session.id);
    
    // Capture a screenshot
    const screenshot = await cctvService.captureScreenshot(
      session.session.id,
      { processOcr: true }
    );
    
    console.log('✓ Screenshot captured:', screenshot.screenshot.id);
    
    // Wait for OCR to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get screenshots
    const screenshots = await cctvService.getSessionScreenshots(
      session.session.id
    );
    
    console.log('✓ Screenshots:', screenshots.data.length);
    console.log('OCR Result:', screenshots.data[0]?.ocr_result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

testServices();
```

Run it:
```bash
node backend/test_services.js
```

---

## Success Criteria ✅

Phase 2 is complete when:

- ✅ CCTV monitoring service created
- ✅ Meter OCR service created
- ✅ Session management implemented
- ✅ Screenshot capture implemented
- ✅ OCR processing implemented
- ✅ Health monitoring implemented
- ✅ Statistics calculation implemented
- ✅ Mock mode for development
- ✅ Error handling comprehensive
- ⏳ Services tested (your next step)

---

## What's Next?

**Phase 3: API Routes & Controllers** 🚀

We'll create:
1. Controller with 15+ endpoints
2. Routes file with authentication
3. Server.js registration
4. Basic API testing

This will make all our service methods accessible via HTTP API, which the frontend can then call!

**Ready to continue to Phase 3?** 🎯

