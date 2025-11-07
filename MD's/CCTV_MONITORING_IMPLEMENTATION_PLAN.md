# CCTV Monitoring System - Implementation Plan

## Overview
This document outlines the complete implementation plan for connecting the CCTV Monitoring dashboard (frontend) with the backend infrastructure. The system will integrate with BARDI camera devices to automatically capture screenshots during CNG delivery operations and perform OCR on meter readings.

## Current State Analysis

### Frontend (✅ Complete - Mockup)
**File**: `frontend/src/pages/operations/CCTVMonitoringPage.tsx`

**Features Implemented**:
- Session management dashboard with health monitoring
- Real-time session status (active, dead, stopped, completed)
- Screenshot gallery view with OCR results
- Manual session creation with delivery order selection
- BARDI token management modal
- Auto-refresh capability
- Health statistics display
- Session stop/restart functionality

**Mockup Data Used**:
- `MOCKUP_SESSIONS`: Demo CCTV sessions
- `MOCKUP_SCREENSHOTS`: Placeholder screenshot data with OCR results
- `MOCKUP_DELIVERY_ORDERS`: Sample delivery orders
- `MOCKUP_CUSTOMERS`: Sample customer data

**API Endpoints Expected (Currently Commented Out)**:
```typescript
// GET /api/cctv-monitoring/sessions - Fetch all monitoring sessions
// GET /api/cctv-monitoring/sessions/:id/screenshots - Get screenshots for a session
// POST /api/cctv-monitoring/sessions/:id/stop - Stop a session
// POST /api/cctv-monitoring/sessions - Create new session
// POST /api/cctv-monitoring/sessions/:id/retry-ocr - Retry OCR on a screenshot
// PUT /api/cctv-monitoring/sessions/:id/token - Update BARDI token
```

### Backend (⚠️ Partial)
**Existing Infrastructure**:

1. **BARDI Integration** (`backend/src/services/bardiScrapingService.js`)
   - Session authentication with BARDI API
   - Device listing and management
   - Screenshot capture capability (basic)
   - Cookie/token management

2. **Routes** (`backend/src/routes/bardiScraping.js`)
   - `/api/bardi/devices` - Get BARDI devices
   - `/api/bardi/devices/:deviceId/screenshot` - Take screenshot
   - `/api/bardi/session` - Session management

3. **OCR Capability** 
   - Existing OCR services for receipt processing
   - Can be adapted for meter reading

**Missing Components**:
- ❌ Database models for CCTV sessions and screenshots
- ❌ CCTV-specific routes and controllers
- ❌ Automated screenshot capture mechanism
- ❌ Screenshot storage and management
- ❌ OCR integration for meter readings
- ❌ Session health monitoring logic
- ❌ Integration with delivery orders

---

## Implementation Plan

### Phase 1: Database Schema Setup

#### 1.1 Create CCTV Session Model
**File**: `backend/src/models/cctvSession.model.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CCTVSession = sequelize.define('CCTVSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  delivery_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'delivery_orders',
      key: 'id'
    }
  },
  customer_location_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Index of customer location in delivery order'
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  device_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'BARDI device ID used for monitoring'
  },
  bardi_session_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted BARDI session token for API access'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'dead', 'stopped'),
    allowNull: false,
    defaultValue: 'active'
  },
  total_screenshots_captured: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  last_screenshot_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  session_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_nota_kecil_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'nota_kecils',
      key: 'id'
    },
    comment: 'Nota Kecil created from this monitoring session'
  },
  panel_row: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Panel row location in BARDI interface'
  },
  panel_column: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Panel column location in BARDI interface'
  },
  screenshot_interval_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: 'Interval between automatic screenshots'
  },
  health_check_interval_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15,
    comment: 'Interval for health status checks'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'cctv_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CCTVSession;
```

#### 1.2 Create CCTV Screenshot Model
**File**: `backend/src/models/cctvScreenshot.model.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CCTVScreenshot = sequelize.define('CCTVScreenshot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'cctv_sessions',
      key: 'id'
    }
  },
  screenshot_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'URL to screenshot image (Cloudinary or local)'
  },
  cloudinary_public_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cloudinary public ID for image management'
  },
  captured_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  sequence_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Sequential number within the session'
  },
  ocr_status: {
    type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  ocr_result: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'OCR extracted data: meter_reading, pressure, temperature, etc.'
  },
  ocr_raw_response: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full raw OCR API response for debugging'
  },
  ocr_confidence_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'OCR confidence score (0-1)'
  },
  ocr_processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ocr_error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of OCR retry attempts'
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'cctv_screenshots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['session_id', 'sequence_number']
    },
    {
      fields: ['captured_at']
    },
    {
      fields: ['ocr_status']
    }
  ]
});

module.exports = CCTVScreenshot;
```

#### 1.3 Update Models Index
**File**: `backend/src/models/index.js`

Add CCTV models and define relationships:

```javascript
// Import CCTV models
const CCTVSession = require('./cctvSession.model');
const CCTVScreenshot = require('./cctvScreenshot.model');

// Define relationships
CCTVSession.belongsTo(DeliveryOrder, { 
  foreignKey: 'delivery_order_id', 
  as: 'delivery_order' 
});

CCTVSession.belongsTo(NotaKecil, { 
  foreignKey: 'created_nota_kecil_id', 
  as: 'created_nota_kecil' 
});

CCTVSession.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

CCTVSession.hasMany(CCTVScreenshot, { 
  foreignKey: 'session_id', 
  as: 'screenshots',
  onDelete: 'CASCADE'
});

CCTVScreenshot.belongsTo(CCTVSession, { 
  foreignKey: 'session_id', 
  as: 'session' 
});

// Export
module.exports = {
  // ... existing models
  CCTVSession,
  CCTVScreenshot
};
```

#### 1.4 Create Migration
**File**: `backend/src/migrations/20250101_create_cctv_monitoring.js`

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create cctv_sessions table
    await queryInterface.createTable('cctv_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      delivery_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      customer_location_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bardi_session_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'dead', 'stopped'),
        allowNull: false,
        defaultValue: 'active'
      },
      total_screenshots_captured: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_screenshot_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      session_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_nota_kecil_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'nota_kecils',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      panel_row: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      panel_column: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      screenshot_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      health_check_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create cctv_screenshots table
    await queryInterface.createTable('cctv_screenshots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cctv_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      screenshot_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      cloudinary_public_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      sequence_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ocr_status: {
        type: Sequelize.ENUM('pending', 'processing', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      ocr_result: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ocr_raw_response: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ocr_confidence_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      ocr_processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ocr_error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('cctv_screenshots', ['session_id', 'sequence_number'], {
      name: 'idx_cctv_screenshots_session_sequence'
    });

    await queryInterface.addIndex('cctv_screenshots', ['captured_at'], {
      name: 'idx_cctv_screenshots_captured_at'
    });

    await queryInterface.addIndex('cctv_screenshots', ['ocr_status'], {
      name: 'idx_cctv_screenshots_ocr_status'
    });

    await queryInterface.addIndex('cctv_sessions', ['delivery_order_id'], {
      name: 'idx_cctv_sessions_delivery_order'
    });

    await queryInterface.addIndex('cctv_sessions', ['status'], {
      name: 'idx_cctv_sessions_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cctv_screenshots');
    await queryInterface.dropTable('cctv_sessions');
  }
};
```

---

### Phase 2: Backend Services

#### 2.1 Enhanced BARDI Service
**File**: `backend/src/services/cctvMonitoringService.js`

This service will handle:
- Automated screenshot capture from BARDI devices
- Screenshot upload to Cloudinary
- OCR processing of meter readings
- Session health monitoring
- Integration with delivery orders

Key Methods:
```javascript
- createMonitoringSession(deliveryOrderId, customerId, deviceId, panelConfig)
- startAutomatedCapture(sessionId)
- stopMonitoringSession(sessionId)
- captureAndProcessScreenshot(sessionId)
- processScreenshotOCR(screenshotId)
- checkSessionHealth(sessionId)
- getSessionStatistics()
- retryFailedOCR(screenshotId)
```

#### 2.2 Enhanced OCR Service for Meter Reading
**File**: `backend/src/services/meterOcrService.js`

Specialized OCR for reading:
- Gas meter readings (volume)
- Pressure gauges
- Temperature displays
- Flow rates

---

### Phase 3: API Routes & Controllers

#### 3.1 CCTV Monitoring Controller
**File**: `backend/src/controllers/cctvMonitoring.controller.js`

Endpoints:
```javascript
// Session Management
GET    /api/cctv-monitoring/sessions              // List all sessions
GET    /api/cctv-monitoring/sessions/:id          // Get session details
POST   /api/cctv-monitoring/sessions              // Create new session
PUT    /api/cctv-monitoring/sessions/:id          // Update session
POST   /api/cctv-monitoring/sessions/:id/stop     // Stop session
POST   /api/cctv-monitoring/sessions/:id/restart  // Restart dead session
DELETE /api/cctv-monitoring/sessions/:id          // Delete session

// Screenshots
GET    /api/cctv-monitoring/sessions/:id/screenshots        // Get session screenshots
POST   /api/cctv-monitoring/sessions/:id/capture            // Manual screenshot capture
DELETE /api/cctv-monitoring/screenshots/:id                 // Delete screenshot

// OCR
POST   /api/cctv-monitoring/screenshots/:id/retry-ocr       // Retry OCR processing
GET    /api/cctv-monitoring/screenshots/:id/ocr-result      // Get OCR result

// Health & Stats
GET    /api/cctv-monitoring/health                          // System health stats
GET    /api/cctv-monitoring/sessions/:id/health             // Session health

// BARDI Token Management
PUT    /api/cctv-monitoring/bardi-token                     // Update BARDI session token
```

#### 3.2 Route Registration
**File**: `backend/src/routes/cctvMonitoring.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const cctvController = require('../controllers/cctvMonitoring.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Session routes
router.get('/sessions', cctvController.getSessions);
router.get('/sessions/:id', cctvController.getSessionById);
router.post('/sessions', cctvController.createSession);
router.put('/sessions/:id', cctvController.updateSession);
router.post('/sessions/:id/stop', cctvController.stopSession);
router.post('/sessions/:id/restart', cctvController.restartSession);
router.delete('/sessions/:id', isAdmin, cctvController.deleteSession);

// Screenshot routes
router.get('/sessions/:id/screenshots', cctvController.getSessionScreenshots);
router.post('/sessions/:id/capture', cctvController.manualCapture);
router.delete('/screenshots/:id', isAdmin, cctvController.deleteScreenshot);

// OCR routes
router.post('/screenshots/:id/retry-ocr', cctvController.retryOcr);
router.get('/screenshots/:id/ocr-result', cctvController.getOcrResult);

// Health routes
router.get('/health', cctvController.getHealthStats);
router.get('/sessions/:id/health', cctvController.getSessionHealth);

// Token management
router.put('/bardi-token', cctvController.updateBardiToken);

module.exports = router;
```

#### 3.3 Register Routes in Server
**File**: `backend/src/server.js`

Add to server initialization:
```javascript
const cctvMonitoringRoutes = require("./routes/cctvMonitoring.routes");

// ... in route registration section
app.use("/api/cctv-monitoring", cctvMonitoringRoutes);
app.use("/api/web/cctv-monitoring", cctvMonitoringRoutes); // Also for web
```

---

### Phase 4: Background Jobs & Automation

#### 4.1 Screenshot Capture Worker
**File**: `backend/src/workers/screenshotCaptureWorker.js`

Background service that:
- Monitors active sessions
- Triggers screenshots at configured intervals
- Handles failed captures with retry logic
- Updates session health status

#### 4.2 OCR Processing Queue
**File**: `backend/src/workers/ocrProcessingWorker.js`

Queue-based OCR processing:
- Processes screenshots asynchronously
- Handles batch OCR for multiple screenshots
- Implements retry logic for failed OCR
- Sends notifications on low confidence scores

#### 4.3 Health Monitoring Service
**File**: `backend/src/workers/healthMonitorWorker.js`

Monitors:
- Session liveness (last screenshot time)
- BARDI token validity
- OCR processing delays
- Marks sessions as "dead" when inactive

---

### Phase 5: Frontend Integration

#### 5.1 Update API Calls in Frontend
**File**: `frontend/src/pages/operations/CCTVMonitoringPage.tsx`

**Changes Required**:

1. **Remove Mockup Data** - Replace with real API calls
2. **Uncomment API Integration Code** (lines 231-234, 270-271, etc.)
3. **Add Error Handling** for network failures
4. **Implement Real-time Updates** via polling or WebSockets

Example changes:

```typescript
// BEFORE (Mockup):
const fetchSessions = useCallback(async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const updatedSessions = MOCKUP_SESSIONS.map(...);
  setSessions(updatedSessions);
}, []);

// AFTER (Real API):
const fetchSessions = useCallback(async () => {
  try {
    const response = await apiClient.get('/api/cctv-monitoring/sessions');
    setSessions(response.data.data || []);
    const stats = calculateHealthStats(response.data.data || []);
    setHealthStats(stats);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    toast.error('Failed to fetch monitoring sessions');
  } finally {
    setLoading(false);
  }
}, []);
```

#### 5.2 Add Real Delivery Order & Customer Dropdowns

Replace mockup dropdowns with API calls:

```typescript
// Fetch delivery orders
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

// Fetch customers
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/api/web/customers');
      setCustomers(response.data.data);
    } catch (error) {
      toast.error('Failed to load customers');
    }
  };
  fetchCustomers();
}, []);
```

#### 5.3 Implement BARDI Token Update

Connect token modal to backend:

```typescript
const handleUpdateToken = async () => {
  try {
    await apiClient.put('/api/cctv-monitoring/bardi-token', {
      sessionToken
    });
    toast.success('BARDI token updated successfully');
    setShowTokenModal(false);
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to update token');
  }
};
```

---

### Phase 6: Testing & Deployment

#### 6.1 Unit Tests
- Test CCTV session CRUD operations
- Test screenshot capture and storage
- Test OCR processing pipeline
- Test health monitoring logic

#### 6.2 Integration Tests
- Test end-to-end session flow
- Test BARDI API integration
- Test Cloudinary image upload
- Test OCR API integration

#### 6.3 Manual Testing Checklist
- [ ] Create a new monitoring session
- [ ] View active sessions dashboard
- [ ] Capture manual screenshot
- [ ] View automated screenshots
- [ ] Verify OCR results
- [ ] Stop a session
- [ ] Restart a dead session
- [ ] Update BARDI token
- [ ] Check health monitoring alerts
- [ ] Verify screenshot auto-refresh

#### 6.4 Performance Considerations
- Implement pagination for screenshots (large sessions)
- Add caching for session data
- Optimize OCR processing (queue-based)
- Consider WebSocket for real-time updates vs polling

---

## Implementation Timeline

### Week 1: Database & Core Backend
- Day 1-2: Create database models and migrations
- Day 3-4: Implement CCTV monitoring service
- Day 5: Implement enhanced BARDI service integration

### Week 2: API & Controllers
- Day 1-2: Create controllers and routes
- Day 3-4: Implement OCR meter reading service
- Day 5: Testing and bug fixes

### Week 3: Background Workers & Automation
- Day 1-2: Screenshot capture worker
- Day 3: OCR processing queue
- Day 4: Health monitoring worker
- Day 5: Integration testing

### Week 4: Frontend Integration & Testing
- Day 1-2: Replace mockup with real API calls
- Day 3: Real-time updates and error handling
- Day 4-5: End-to-end testing and refinement

---

## Technical Dependencies

### Backend
- **Database**: PostgreSQL with JSONB support
- **Image Storage**: Cloudinary (already configured)
- **OCR Service**: Existing OCR service or external API
- **Queue System**: Consider Bull or BullMQ for background jobs
- **Scheduler**: node-cron for periodic tasks

### Frontend
- **HTTP Client**: axios (already configured via apiClient)
- **State Management**: React hooks (already in use)
- **Real-time**: Polling (initial) → WebSockets (future enhancement)

---

## Security Considerations

1. **BARDI Token Management**
   - Encrypt BARDI session tokens in database
   - Implement token refresh mechanism
   - Don't expose tokens in API responses

2. **Authentication**
   - All CCTV endpoints require authentication
   - Admin-only endpoints for deletion operations
   - Validate user permissions for delivery order access

3. **Image Storage**
   - Use signed URLs for temporary screenshot access
   - Implement cleanup for old screenshots
   - Validate image uploads

4. **Rate Limiting**
   - Limit screenshot capture frequency
   - Prevent OCR API abuse
   - Throttle session creation

---

## Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Real-time Notifications**
   - Alert when session goes dead
   - Notify on low OCR confidence
   - Alert on unusual meter readings

2. **Advanced Analytics**
   - Session performance metrics
   - OCR accuracy tracking
   - Device reliability statistics

3. **Export & Reporting**
   - Export session data to Excel
   - Generate PDF reports with screenshots
   - Historical trend analysis

4. **AI Enhancements**
   - Custom OCR model training for meters
   - Automatic anomaly detection
   - Predictive maintenance alerts

5. **Mobile App Integration**
   - View sessions on mobile
   - Manual capture from mobile device
   - Push notifications for alerts

---

## Rollback Plan

If issues arise during deployment:

1. **Database Rollback**
   ```bash
   # Run migration down
   npm run migrate:down
   ```

2. **Frontend Rollback**
   - Keep mockup code in comments
   - Can easily revert to mockup mode
   - Use feature flags for gradual rollout

3. **Backend Rollback**
   - Remove route registration from server.js
   - Revert to BARDI scraping only (no CCTV sessions)

---

## Configuration Checklist

### Environment Variables Required
```env
# BARDI Configuration
BARDI_API_URL=https://ipc.bardi.co.id
BARDI_SESSION_PATH=./session.json

# Cloudinary (Already configured)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# OCR Service
OCR_API_URL=xxx
OCR_API_KEY=xxx

# Background Jobs
SCREENSHOT_INTERVAL_MINUTES=10
HEALTH_CHECK_INTERVAL_MINUTES=15
OCR_RETRY_LIMIT=3
```

### File Structure Summary
```
backend/
├── src/
│   ├── models/
│   │   ├── cctvSession.model.js         [NEW]
│   │   ├── cctvScreenshot.model.js      [NEW]
│   │   └── index.js                     [MODIFIED]
│   ├── services/
│   │   ├── cctvMonitoringService.js     [NEW]
│   │   ├── meterOcrService.js           [NEW]
│   │   └── bardiScrapingService.js      [ENHANCED]
│   ├── controllers/
│   │   └── cctvMonitoring.controller.js [NEW]
│   ├── routes/
│   │   └── cctvMonitoring.routes.js     [NEW]
│   ├── workers/
│   │   ├── screenshotCaptureWorker.js   [NEW]
│   │   ├── ocrProcessingWorker.js       [NEW]
│   │   └── healthMonitorWorker.js       [NEW]
│   ├── migrations/
│   │   └── 20250101_create_cctv_monitoring.js [NEW]
│   └── server.js                        [MODIFIED]

frontend/
└── src/
    └── pages/
        └── operations/
            └── CCTVMonitoringPage.tsx   [MODIFIED]
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for connecting the CCTV monitoring frontend (which currently uses mockup data) to a fully functional backend system. The plan leverages existing infrastructure (BARDI integration, OCR services, Cloudinary) while adding specialized CCTV monitoring capabilities.

**Key Success Factors**:
1. Robust error handling for BARDI API failures
2. Efficient background job processing
3. Clear session health monitoring
4. Seamless frontend-backend integration
5. Comprehensive testing at each phase

**Next Steps**:
1. Review and approve this plan
2. Set up development database
3. Begin Phase 1 implementation
4. Regular progress check-ins during development

