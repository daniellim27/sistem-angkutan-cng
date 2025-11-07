# CCTV Auto-Capture Scheduler Implementation

## Overview

The CCTV Auto-Capture Scheduler automatically captures screenshots at regular intervals and creates Nota Kecil documents after monitoring sessions reach 4 hours duration.

## Features

### ✅ Automatic Screenshot Capture
- Captures screenshots every N minutes (default: 10 minutes)
- Configurable per session via `screenshot_interval_minutes`
- Respects the "Auto Snapshot" toggle in the frontend

### ✅ Automatic OCR Processing
- Each screenshot is automatically processed with OpenAI Vision OCR
- Extracts meter readings, pressure, and temperature
- Stores OCR results with confidence scores

### ✅ Automatic Session Completion
- Sessions are automatically stopped after 4 hours
- Creates Nota Kecil from averaged OCR data
- Calculates final gas volume (Vt, k, V)

### ✅ Frontend Toggle Control
- "Auto Snapshot" toggle starts/stops the scheduler
- Real-time status updates
- Error handling with automatic rollback

## Architecture

### Components

1. **CCTVScheduler** (`backend/src/services/cctvScheduler.js`)
   - Cron job running every minute
   - Checks all active sessions
   - Triggers captures when needed
   - Completes sessions after 4 hours

2. **API Endpoints** (`backend/src/routes/cctvMonitoring.routes.js`)
   - `GET /api/cctv-monitoring/scheduler/status` - Get scheduler status
   - `POST /api/cctv-monitoring/scheduler/start` - Start scheduler
   - `POST /api/cctv-monitoring/scheduler/stop` - Stop scheduler

3. **Frontend Toggle** (`frontend/src/pages/operations/CCTVMonitoringPage.tsx`)
   - Calls start/stop endpoints
   - Updates UI state
   - Shows notifications

## Workflow

### 1. Session Creation
```
User creates CCTV session
↓
Session saved to database with panel_row, panel_column, screenshot_interval_minutes
↓
Status: "active"
```

### 2. Automatic Capture Loop (Every Minute Check)
```
Scheduler checks active sessions
↓
For each session:
  - Calculate time since last capture
  - If >= screenshot_interval_minutes:
    → Capture screenshot from specified panel
    → Save to Cloudinary
    → Trigger OCR processing
    → Update last_screenshot_at
```

### 3. Session Completion (After 4 Hours)
```
Session duration >= 4 hours
↓
Get all screenshots with successful OCR
↓
Extract meter readings:
  - stan_awal = first reading
  - stan_akhir = last reading
  - avg_pressure = average of all pressure readings
  - avg_temperature = average of all temperature readings
↓
Calculate gas volume (Vt, k, V)
↓
Create Nota Kecil
↓
Update session:
  - status = "completed"
  - end_time = now
  - created_nota_kecil_id = nota_kecil.id
```

## Configuration

### Environment Variables

```env
# Enable/disable CCTV scheduler (default: enabled)
ENABLE_CCTV_SCHEDULER=true
```

### Session Parameters

When creating a session:
```json
{
  "delivery_order_id": 123,
  "customer_name": "PT Example",
  "panel_row": 1,
  "panel_column": 2,
  "screenshot_interval_minutes": 10,  // Capture every 10 minutes
  "health_check_interval_minutes": 15 // Health check interval
}
```

## Usage

### Start Scheduler

**Backend automatically starts on server boot:**
```javascript
// backend/src/server.js
cctvScheduler.start();
```

**Frontend toggle:**
```typescript
// When user turns ON auto-snapshot
await apiClient.post('/cctv-monitoring/scheduler/start');
```

### Stop Scheduler

**Frontend toggle:**
```typescript
// When user turns OFF auto-snapshot
await apiClient.post('/cctv-monitoring/scheduler/stop');
```

### Check Status

```typescript
const response = await apiClient.get('/cctv-monitoring/scheduler/status');
console.log(response.data);
// {
//   running: true,
//   stats: {
//     totalRuns: 150,
//     successfulCaptures: 140,
//     failedCaptures: 10,
//     sessionsCompleted: 5,
//     notasCreated: 5,
//     lastRunTime: "2025-11-05T10:30:00.000Z"
//   }
// }
```

## Scheduler Logic

### Should Capture Screenshot?

```javascript
shouldCaptureScreenshot(session) {
  const now = new Date();
  
  // Never captured? Capture now
  if (!session.last_screenshot_at) return true;
  
  // Calculate time since last capture
  const minutesSinceLastCapture = (now - lastCapture) / (1000 * 60);
  const intervalMinutes = session.screenshot_interval_minutes || 10;
  
  // Time for next capture?
  return minutesSinceLastCapture >= intervalMinutes;
}
```

### Session Completion

```javascript
shouldCompleteSession(session) {
  const sessionDurationHours = (now - session.start_time) / (1000 * 60 * 60);
  return sessionDurationHours >= 4;
}
```

## Nota Kecil Creation

### Data Averaging

```javascript
// First and last meter readings
stan_awal = meterReadings[0]
stan_akhir = meterReadings[meterReadings.length - 1]

// Average pressure and temperature
avg_pressure = sum(all_pressure_readings) / count
avg_temperature = sum(all_temperature_readings) / count
```

### Gas Calculation

```javascript
const { Vt, k, V } = gasCalculationService.calculateVolumeGas(
  stan_awal,
  stan_akhir,
  avg_pressure,
  avg_temperature
);
```

### Nota Kecil Fields

```javascript
{
  delivery_order_id: session.delivery_order_id,
  customer_location_index: session.customer_location_index,
  customer_name: session.customer_name,
  stan_awal: 1234.567,          // First reading
  stan_akhir: 1250.123,         // Last reading
  tekanan_operasi: 8.5,         // Averaged
  temperatur_operasi: 25.3,     // Averaged
  Vt: 15.556,                   // Calculated
  k: 1.002345,                  // Calculated
  V: 15.592,                    // Calculated (Vt * k)
  driver_confirmed: false,      // Needs driver confirmation
  driver_notes: "Auto-created from CCTV session #123 after 4 hours monitoring"
}
```

## Error Handling

### Screenshot Capture Failures

```javascript
try {
  await captureScreenshot(session.id);
  stats.successfulCaptures++;
} catch (error) {
  stats.failedCaptures++;
  
  // Mark session as dead if BARDI token expired
  if (error.message.includes('expired') || error.message.includes('login')) {
    await session.update({
      status: 'dead',
      session_notes: `Auto-marked dead: ${error.message}`
    });
  }
}
```

### Nota Creation Failures

```javascript
try {
  // Create nota kecil
  const notaKecil = await NotaKecil.create({...});
  session.created_nota_kecil_id = notaKecil.id;
} catch (error) {
  // Session still marked as completed even if nota fails
  session.session_notes += `\nNota creation failed: ${error.message}`;
}
```

## Monitoring & Logs

### Console Output

```
🔄 CCTV Scheduler Cycle #150 - 11/5/2025, 10:30:00 AM
   Found 3 active session(s)
   📸 Capturing screenshot for session 1 (PT Example)
   ✅ Screenshot captured successfully
   ⏭️  Session 2 - not yet time for next capture
   ⏰ Session 3 has reached 4 hours - auto-completing...
   
📊 Creating Nota Kecil for session 3...
   Found 24 screenshot(s) with successful OCR
   📏 Meter readings: Stan Awal=1234.567, Stan Akhir=1250.123
   📏 Averages: Pressure=8.50 bar, Temp=25.30°C
   ✅ Nota Kecil #45 created successfully
   📊 Volume: Vt=15.556m³, k=1.002345, V=15.592m³
   ✅ Session 3 completed and nota kecil created

✅ Scheduler cycle completed
   Stats: 1 captures, 0 failures, 1 notas created
```

## Testing

### Test Automatic Capture

1. Create a new CCTV session
2. Ensure "Auto Snapshot" is ON
3. Wait for `screenshot_interval_minutes`
4. Check logs for automatic capture
5. Verify screenshot in database/Cloudinary

### Test Session Completion

1. Create a session with test data
2. Manually update `start_time` to 4+ hours ago:
   ```sql
   UPDATE cctv_sessions 
   SET start_time = NOW() - INTERVAL '4 hours 1 minute'
   WHERE id = 123;
   ```
3. Wait for next scheduler cycle
4. Verify session marked as "completed"
5. Verify Nota Kecil created

### Test Toggle Control

1. Turn OFF "Auto Snapshot" toggle
2. Verify scheduler stopped via API: `GET /scheduler/status`
3. Wait several minutes
4. Verify no new captures
5. Turn ON toggle
6. Verify scheduler restarted

## Troubleshooting

### Issue: Scheduler not capturing

**Check:**
1. Scheduler status: `GET /api/cctv-monitoring/scheduler/status`
2. Session has `screenshot_interval_minutes` set
3. Enough time has passed since `last_screenshot_at`
4. BARDI token is valid
5. Check server logs for errors

### Issue: Session not completing after 4 hours

**Check:**
1. Session `start_time` is correct
2. Session status is "active"
3. Scheduler is running
4. Check server logs for errors in completion logic

### Issue: Nota Kecil not created

**Check:**
1. At least 2 screenshots with successful OCR
2. OCR results contain valid meter readings
3. Check logs for specific error message
4. Verify gas calculation service is working

## Future Enhancements

- [ ] Configurable session duration (not hardcoded 4 hours)
- [ ] Email notifications when nota kecil created
- [ ] Retry logic for failed captures
- [ ] Health check notifications
- [ ] Dashboard for scheduler statistics
- [ ] Support for multiple OCR providers
- [ ] Advanced OCR result validation
- [ ] Custom averaging strategies

## Related Files

- `backend/src/services/cctvScheduler.js` - Main scheduler logic
- `backend/src/services/cctvMonitoringService.js` - Session management
- `backend/src/services/bardiScrapingService.js` - Screenshot capture
- `backend/src/services/ocrService.js` - OCR processing
- `backend/src/services/gasCalculationService.js` - Gas volume calculations
- `backend/src/controllers/cctvMonitoring.controller.js` - API endpoints
- `backend/src/routes/cctvMonitoring.routes.js` - Route definitions
- `frontend/src/pages/operations/CCTVMonitoringPage.tsx` - UI toggle

## API Reference

See `CCTV_MONITORING_API_CONTRACT.md` for full API documentation.

