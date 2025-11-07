# CCTV Monitoring - Quick Start Implementation Guide

## 🚀 Quick Overview

**Goal**: Connect the existing CCTV monitoring frontend (currently using mockup data) to a fully functional backend system.

**Current State**: 
- ✅ Frontend UI is complete (with mockup data)
- ✅ BARDI API integration exists (screenshot capability)
- ⚠️ Backend CCTV-specific endpoints don't exist
- ⚠️ Database tables don't exist
- ⚠️ Background workers don't exist

**Target State**:
- ✅ Full backend API with database
- ✅ Automated screenshot capture
- ✅ OCR processing
- ✅ Real-time health monitoring
- ✅ Frontend connected to real data

---

## 📋 Implementation Checklist

### Phase 1: Database Setup (Day 1)

- [ ] **Step 1.1**: Create CCTV Session Model
  - File: `backend/src/models/cctvSession.model.js`
  - Copy from: `CCTV_MONITORING_IMPLEMENTATION_PLAN.md` → Phase 1.1

- [ ] **Step 1.2**: Create CCTV Screenshot Model  
  - File: `backend/src/models/cctvScreenshot.model.js`
  - Copy from: `CCTV_MONITORING_IMPLEMENTATION_PLAN.md` → Phase 1.2

- [ ] **Step 1.3**: Update Models Index
  - File: `backend/src/models/index.js`
  - Add imports and relationships for CCTV models

- [ ] **Step 1.4**: Create Migration
  - File: `backend/src/migrations/20250101_create_cctv_monitoring.js`
  - Copy from: `CCTV_MONITORING_IMPLEMENTATION_PLAN.md` → Phase 1.4

- [ ] **Step 1.5**: Run Migration
  ```bash
  cd backend
  npm run migrate
  # Or manually: node src/migrations/20250101_create_cctv_monitoring.js
  ```

- [ ] **Step 1.6**: Verify Tables Created
  ```sql
  -- Connect to database and verify
  \dt cctv_*
  -- Should show: cctv_sessions, cctv_screenshots
  ```

---

### Phase 2: Backend Services (Day 2-3)

- [ ] **Step 2.1**: Create CCTV Monitoring Service
  - File: `backend/src/services/cctvMonitoringService.js`
  - Implement core functions:
    - `createSession()`
    - `stopSession()`
    - `captureScreenshot()`
    - `getSessionHealth()`

- [ ] **Step 2.2**: Create Meter OCR Service
  - File: `backend/src/services/meterOcrService.js`
  - Integrate with existing OCR service
  - Add meter-specific parsing logic

- [ ] **Step 2.3**: Enhance BARDI Service (Optional)
  - File: `backend/src/services/bardiScrapingService.js`
  - Add any needed enhancements for screenshot capture
  - Already has basic functionality

---

### Phase 3: API Routes & Controllers (Day 3-4)

- [ ] **Step 3.1**: Create CCTV Controller
  - File: `backend/src/controllers/cctvMonitoring.controller.js`
  - Implement all endpoints (see API Contract document)
  - Key functions:
    - `getSessions()`
    - `createSession()`
    - `stopSession()`
    - `getSessionScreenshots()`
    - `manualCapture()`
    - `retryOcr()`

- [ ] **Step 3.2**: Create CCTV Routes
  - File: `backend/src/routes/cctvMonitoring.routes.js`
  - Define all routes with proper middleware

- [ ] **Step 3.3**: Register Routes in Server
  - File: `backend/src/server.js`
  - Add near line 358:
    ```javascript
    const cctvMonitoringRoutes = require("./routes/cctvMonitoring.routes");
    app.use("/api/cctv-monitoring", cctvMonitoringRoutes);
    app.use("/api/web/cctv-monitoring", cctvMonitoringRoutes);
    ```

- [ ] **Step 3.4**: Test Basic Endpoints
  ```bash
  # Test session list
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       http://localhost:3001/api/cctv-monitoring/sessions
  
  # Test session creation
  curl -X POST \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"delivery_order_id": 1, "customer_name": "Test"}' \
       http://localhost:3001/api/cctv-monitoring/sessions
  ```

---

### Phase 4: Background Workers (Day 5)

- [ ] **Step 4.1**: Install Dependencies
  ```bash
  cd backend
  npm install bull node-cron
  ```

- [ ] **Step 4.2**: Create Screenshot Capture Worker
  - File: `backend/src/workers/screenshotCaptureWorker.js`
  - Implements automatic screenshot capture every N minutes

- [ ] **Step 4.3**: Create OCR Processing Worker
  - File: `backend/src/workers/ocrProcessingWorker.js`
  - Queue-based OCR processing for screenshots

- [ ] **Step 4.4**: Create Health Monitor Worker
  - File: `backend/src/workers/healthMonitorWorker.js`
  - Monitors session health and marks dead sessions

- [ ] **Step 4.5**: Start Workers in Server
  - File: `backend/src/server.js`
  - Add worker initialization:
    ```javascript
    const screenshotWorker = require('./workers/screenshotCaptureWorker');
    const ocrWorker = require('./workers/ocrProcessingWorker');
    const healthWorker = require('./workers/healthMonitorWorker');
    
    // Start workers after server starts
    screenshotWorker.start();
    ocrWorker.start();
    healthWorker.start();
    ```

---

### Phase 5: Frontend Integration (Day 6-7)

- [ ] **Step 5.1**: Update Session Fetching
  - File: `frontend/src/pages/operations/CCTVMonitoringPage.tsx`
  - Line ~206-243: Replace mockup with API call
  ```typescript
  const fetchSessions = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/cctv-monitoring/sessions');
      setSessions(response.data.data || []);
      setHealthStats(response.data.stats || {});
    } catch (error) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);
  ```

- [ ] **Step 5.2**: Update Screenshot Fetching
  - Same file, line ~262-278:
  ```typescript
  const fetchSessionScreenshots = async (sessionId: number) => {
    setLoadingScreenshots(true);
    try {
      const response = await apiClient.get(
        `/api/cctv-monitoring/sessions/${sessionId}/screenshots`
      );
      setScreenshots(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load screenshots');
    } finally {
      setLoadingScreenshots(false);
    }
  };
  ```

- [ ] **Step 5.3**: Update Session Creation
  - Same file, line ~304-360:
  ```typescript
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSession(true);
    try {
      const response = await apiClient.post('/api/cctv-monitoring/sessions', {
        delivery_order_id: createForm.delivery_order_id,
        customer_name: createForm.customer_name,
        customer_location_index: createForm.customer_location_index,
        device_id: createForm.device_id,
        panel_row: createForm.panel_row,
        panel_column: createForm.panel_column
      });
      toast.success('Monitoring session created successfully');
      setShowCreateModal(false);
      fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };
  ```

- [ ] **Step 5.4**: Update OCR Retry
  - Same file, line ~362-380:
  ```typescript
  const handleRetryOcr = async (screenshotId: number) => {
    try {
      await apiClient.post(
        `/api/cctv-monitoring/screenshots/${screenshotId}/retry-ocr`
      );
      toast.success('OCR processing queued');
      setTimeout(() => {
        if (selectedSession) {
          fetchSessionScreenshots(selectedSession.id);
        }
      }, 3000);
    } catch (error: any) {
      toast.error('Failed to retry OCR');
    }
  };
  ```

- [ ] **Step 5.5**: Load Real Delivery Orders
  - Add to useEffect:
  ```typescript
  useEffect(() => {
    const fetchDeliveryOrders = async () => {
      try {
        const response = await apiClient.get('/api/web/delivery-orders?status=in_progress');
        setDeliveryOrders(response.data.data);
      } catch (error) {
        toast.error('Failed to load delivery orders');
      }
    };
    fetchDeliveryOrders();
  }, []);
  ```

- [ ] **Step 5.6**: Remove Mockup Data
  - Comment out or remove:
    - `MOCKUP_SESSIONS` (line ~88-129)
    - `MOCKUP_SCREENSHOTS` (line ~131-144)
    - `MOCKUP_DELIVERY_ORDERS` (line ~147-152)
    - `MOCKUP_CUSTOMERS` (line ~155-160)

- [ ] **Step 5.7**: Test Frontend
  - Open http://localhost:5173
  - Verify sessions load from backend
  - Try creating a new session
  - Check screenshot gallery
  - Test OCR retry

---

### Phase 6: Testing (Day 7)

- [ ] **Step 6.1**: Manual Testing
  - [ ] Create a monitoring session
  - [ ] Verify session appears in dashboard
  - [ ] Check automated screenshot capture (wait 10 mins)
  - [ ] Verify screenshots appear in gallery
  - [ ] Check OCR results
  - [ ] Test manual screenshot capture
  - [ ] Test session stop functionality
  - [ ] Test health monitoring (wait for warning/dead status)
  - [ ] Test session restart
  - [ ] Test OCR retry on failed screenshots

- [ ] **Step 6.2**: API Testing
  ```bash
  # Test all endpoints with Postman or curl
  # See CCTV_MONITORING_API_CONTRACT.md for examples
  ```

- [ ] **Step 6.3**: Database Verification
  ```sql
  -- Check sessions
  SELECT * FROM cctv_sessions ORDER BY created_at DESC LIMIT 5;
  
  -- Check screenshots
  SELECT id, session_id, ocr_status, sequence_number 
  FROM cctv_screenshots 
  ORDER BY captured_at DESC LIMIT 10;
  
  -- Check health stats
  SELECT status, COUNT(*) 
  FROM cctv_sessions 
  GROUP BY status;
  ```

- [ ] **Step 6.4**: Worker Verification
  ```bash
  # Check logs for worker activity
  tail -f backend/logs/app.log | grep -i "worker\|screenshot\|ocr"
  ```

---

## 🔧 Configuration

### Environment Variables

Add to `backend/.env`:

```env
# BARDI Configuration
BARDI_API_URL=https://ipc.bardi.co.id
BARDI_SESSION_PATH=./session.json

# Cloudinary (should already exist)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OCR Configuration
OCR_API_URL=your_ocr_api_url
OCR_API_KEY=your_ocr_api_key

# CCTV Settings
SCREENSHOT_INTERVAL_MINUTES=10
HEALTH_CHECK_INTERVAL_MINUTES=15
OCR_RETRY_LIMIT=3

# Redis (for job queue)
REDIS_URL=redis://localhost:6379
```

### BARDI Session Token

Ensure `backend/session.json` is properly configured:

```json
{
  "cookies": {
    "s-sid": "your_session_id",
    "s-sid.sig": "your_session_signature",
    "uid": "your_user_id"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Accept": "application/json"
  },
  "clientId": "your_client_id",
  "deviceId": "your_device_id"
}
```

---

## 🐛 Troubleshooting

### Issue: Sessions not appearing in frontend

**Check:**
1. Backend is running: `curl http://localhost:3001/api/cctv-monitoring/sessions`
2. Authentication token is valid
3. CORS is configured properly
4. Check browser console for errors

**Fix:**
```javascript
// backend/src/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

---

### Issue: Screenshots not capturing automatically

**Check:**
1. Screenshot worker is running
2. BARDI session token is valid
3. Check worker logs for errors

**Fix:**
```bash
# Test BARDI connection
curl http://localhost:3001/api/bardi/test-session

# Check worker status
ps aux | grep node | grep worker
```

---

### Issue: OCR not processing

**Check:**
1. OCR worker is running
2. OCR API credentials are correct
3. Check screenshot URL is accessible

**Fix:**
```javascript
// Test OCR directly
const testOcr = async () => {
  const result = await meterOcrService.processScreenshot(screenshotId);
  console.log('OCR Result:', result);
};
```

---

### Issue: Session marked as "dead" immediately

**Check:**
1. Health check interval configuration
2. Screenshot capture is working
3. Check session.last_screenshot_at field

**Fix:**
```javascript
// Adjust health check threshold in healthMonitorWorker.js
const DEAD_THRESHOLD_MINUTES = 30; // Increase if needed
```

---

## 📚 Key Files Reference

### Must Create (New Files)
```
backend/src/
├── models/
│   ├── cctvSession.model.js ⭐ NEW
│   └── cctvScreenshot.model.js ⭐ NEW
├── services/
│   ├── cctvMonitoringService.js ⭐ NEW
│   └── meterOcrService.js ⭐ NEW
├── controllers/
│   └── cctvMonitoring.controller.js ⭐ NEW
├── routes/
│   └── cctvMonitoring.routes.js ⭐ NEW
├── workers/
│   ├── screenshotCaptureWorker.js ⭐ NEW
│   ├── ocrProcessingWorker.js ⭐ NEW
│   └── healthMonitorWorker.js ⭐ NEW
└── migrations/
    └── 20250101_create_cctv_monitoring.js ⭐ NEW
```

### Must Modify (Existing Files)
```
backend/src/
├── models/index.js ✏️ MODIFY (add CCTV models)
└── server.js ✏️ MODIFY (register routes, start workers)

frontend/src/pages/operations/
└── CCTVMonitoringPage.tsx ✏️ MODIFY (replace mockup with API)
```

### Already Exists (No Changes)
```
backend/src/
├── services/bardiScrapingService.js ✅ READY
├── routes/bardiScraping.js ✅ READY
└── controllers/bardiScrapingController.js ✅ READY
```

---

## 🎯 Success Criteria

Your implementation is complete when:

✅ **Database**
- [ ] Tables `cctv_sessions` and `cctv_screenshots` exist
- [ ] Can create sessions via API
- [ ] Screenshots are saved to database

✅ **Backend API**
- [ ] All endpoints return proper responses
- [ ] Authentication works
- [ ] Error handling is consistent

✅ **Frontend**
- [ ] Session list loads from API (no mockup data)
- [ ] Can create new sessions
- [ ] Screenshots display properly
- [ ] OCR results show correctly
- [ ] Health status updates

✅ **Background Workers**
- [ ] Screenshots capture automatically every N minutes
- [ ] OCR processes new screenshots
- [ ] Dead sessions are detected and marked

✅ **Integration**
- [ ] End-to-end flow works: create session → auto capture → OCR → display
- [ ] Manual capture works
- [ ] Session stop/restart works
- [ ] Health monitoring works

---

## 📞 Quick Reference Commands

### Development
```bash
# Start backend with workers
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev

# Run migration
cd backend
npm run migrate

# Test API endpoint
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3001/api/cctv-monitoring/sessions
```

### Database
```bash
# Connect to database
psql -U postgres -d angkutan_db

# Check tables
\dt cctv_*

# Check data
SELECT * FROM cctv_sessions;
SELECT * FROM cctv_screenshots;
```

### Logs
```bash
# Watch logs
tail -f backend/logs/app.log

# Filter for CCTV
tail -f backend/logs/app.log | grep -i cctv

# Filter for errors
tail -f backend/logs/app.log | grep -i error
```

---

## 🚀 Next Steps After Basic Implementation

Once the core system is working:

1. **Performance Optimization**
   - Add caching for session list
   - Implement pagination for large screenshot lists
   - Optimize OCR processing (batch mode)

2. **Real-time Updates**
   - Implement WebSocket for live updates
   - Add push notifications for alerts
   - Real-time health status changes

3. **Advanced Features**
   - Export session data to Excel/PDF
   - Historical trend analysis
   - Automated anomaly detection
   - Integration with mobile app

4. **Production Deployment**
   - Set up Docker containers
   - Configure production environment
   - Set up monitoring and alerts
   - Implement backup strategy

---

## 📖 Documentation Links

- **Full Implementation Plan**: `CCTV_MONITORING_IMPLEMENTATION_PLAN.md`
- **API Contract**: `CCTV_MONITORING_API_CONTRACT.md`
- **Architecture Diagram**: `CCTV_MONITORING_ARCHITECTURE.md`

---

## 💡 Tips

1. **Start Small**: Implement Phase 1-3 first, test thoroughly, then add workers
2. **Test Frequently**: After each file creation, test that endpoint
3. **Check Logs**: Always check logs when something doesn't work
4. **Use Postman**: Test API endpoints independently before frontend integration
5. **Git Commits**: Commit after each phase completion
6. **Backup Database**: Before running migrations, backup your database

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Don't skip database migrations - always run them first
2. ❌ Don't forget to register routes in server.js
3. ❌ Don't leave mockup data in frontend after API integration
4. ❌ Don't start workers before routes are working
5. ❌ Don't forget to add authentication middleware
6. ❌ Don't skip error handling in API calls
7. ❌ Don't forget to add CORS configuration

---

## ✅ Final Checklist

Before considering implementation complete:

- [ ] All database tables created and verified
- [ ] All API endpoints working and tested
- [ ] Frontend loads real data (no mockups)
- [ ] Background workers running and functioning
- [ ] Error handling implemented throughout
- [ ] Authentication and authorization working
- [ ] BARDI integration tested
- [ ] OCR processing working
- [ ] Health monitoring functional
- [ ] Documentation updated
- [ ] Code committed to git
- [ ] Tested in production-like environment

---

**Estimated Total Implementation Time**: 5-7 days for a single developer

**Ready to start? Begin with Phase 1, Step 1.1!** 🚀

