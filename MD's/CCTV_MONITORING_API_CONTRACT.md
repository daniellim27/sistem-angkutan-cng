# CCTV Monitoring System - API Contract & Data Flow

## API Endpoints Reference

### 1. Session Management

#### GET /api/cctv-monitoring/sessions
Get all monitoring sessions with health statistics.

**Request:**
```http
GET /api/cctv-monitoring/sessions?status=active&limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (active, completed, dead, stopped)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `delivery_order_id` (optional): Filter by delivery order

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "delivery_order_id": 123,
      "customer_location_index": 0,
      "customer_name": "PT Qurpol Indonesia",
      "device_id": "BARDI-CAM-001",
      "start_time": "2025-01-15T08:00:00Z",
      "end_time": null,
      "status": "active",
      "total_screenshots_captured": 24,
      "last_screenshot_at": "2025-01-15T10:30:00Z",
      "session_notes": null,
      "created_nota_kecil_id": null,
      "panel_row": 1,
      "panel_column": 2,
      "screenshot_interval_minutes": 10,
      "health_check_interval_minutes": 15,
      "delivery_order": {
        "id": 123,
        "do_number": "DO-2025-001",
        "do_name": "CNG Delivery - PT Qurpol",
        "status": "in_progress"
      },
      "health_status": "healthy",
      "time_since_last_capture": "5 minutes ago",
      "created_at": "2025-01-15T08:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "stats": {
    "total_sessions": 10,
    "active_sessions": 5,
    "healthy_sessions": 4,
    "dead_sessions": 1,
    "total_screenshots_today": 156
  },
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### GET /api/cctv-monitoring/sessions/:id
Get detailed information about a specific session.

**Request:**
```http
GET /api/cctv-monitoring/sessions/1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "delivery_order_id": 123,
    "customer_location_index": 0,
    "customer_name": "PT Qurpol Indonesia",
    "device_id": "BARDI-CAM-001",
    "start_time": "2025-01-15T08:00:00Z",
    "end_time": null,
    "status": "active",
    "total_screenshots_captured": 24,
    "last_screenshot_at": "2025-01-15T10:30:00Z",
    "session_notes": "Panel Location: Row 1, Column 2",
    "created_nota_kecil_id": null,
    "panel_row": 1,
    "panel_column": 2,
    "screenshot_interval_minutes": 10,
    "health_check_interval_minutes": 15,
    "created_by": 5,
    "delivery_order": {
      "id": 123,
      "do_number": "DO-2025-001",
      "do_name": "CNG Delivery - PT Qurpol",
      "customer_name": "PT Qurpol Indonesia",
      "status": "in_progress",
      "created_at": "2025-01-15T06:00:00Z"
    },
    "creator": {
      "id": 5,
      "name": "Admin User",
      "role": "admin"
    },
    "health_status": "healthy",
    "time_since_last_capture": "5 minutes ago",
    "created_at": "2025-01-15T08:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

---

#### POST /api/cctv-monitoring/sessions
Create a new monitoring session.

**Request:**
```http
POST /api/cctv-monitoring/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "delivery_order_id": 123,
  "customer_name": "PT Qurpol Indonesia",
  "customer_location_index": 0,
  "device_id": "BARDI-CAM-001",
  "panel_row": 1,
  "panel_column": 2,
  "screenshot_interval_minutes": 10,
  "health_check_interval_minutes": 15,
  "session_notes": "Initial monitoring setup"
}
```

**Request Body:**
- `delivery_order_id` (required): ID of the delivery order
- `customer_name` (required): Name of the customer location
- `customer_location_index` (required): Index in delivery order locations array
- `device_id` (optional): BARDI device ID (auto-assigned if not provided)
- `panel_row` (optional): Panel row in BARDI interface
- `panel_column` (optional): Panel column in BARDI interface
- `screenshot_interval_minutes` (optional): Screenshot interval (default: 10)
- `health_check_interval_minutes` (optional): Health check interval (default: 15)
- `session_notes` (optional): Additional notes

**Response:**
```json
{
  "success": true,
  "message": "Monitoring session created successfully",
  "data": {
    "id": 15,
    "delivery_order_id": 123,
    "customer_name": "PT Qurpol Indonesia",
    "customer_location_index": 0,
    "device_id": "BARDI-CAM-001",
    "start_time": "2025-01-15T11:00:00Z",
    "status": "active",
    "total_screenshots_captured": 0,
    "panel_row": 1,
    "panel_column": 2,
    "screenshot_interval_minutes": 10,
    "created_at": "2025-01-15T11:00:00Z"
  }
}
```

---

#### POST /api/cctv-monitoring/sessions/:id/stop
Stop a monitoring session.

**Request:**
```http
POST /api/cctv-monitoring/sessions/1/stop
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Delivery completed",
  "create_nota_kecil": true
}
```

**Request Body:**
- `reason` (optional): Reason for stopping
- `create_nota_kecil` (optional): Whether to create nota kecil from session data

**Response:**
```json
{
  "success": true,
  "message": "Session stopped successfully",
  "data": {
    "id": 1,
    "status": "stopped",
    "end_time": "2025-01-15T12:00:00Z",
    "total_screenshots_captured": 28,
    "created_nota_kecil_id": 456
  }
}
```

---

#### POST /api/cctv-monitoring/sessions/:id/restart
Restart a dead or stopped session.

**Request:**
```http
POST /api/cctv-monitoring/sessions/1/restart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session restarted successfully",
  "data": {
    "id": 1,
    "status": "active",
    "end_time": null,
    "session_notes": "Session restarted at 2025-01-15T12:30:00Z"
  }
}
```

---

#### PUT /api/cctv-monitoring/sessions/:id
Update session configuration.

**Request:**
```http
PUT /api/cctv-monitoring/sessions/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "screenshot_interval_minutes": 15,
  "session_notes": "Updated interval to reduce load"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "id": 1,
    "screenshot_interval_minutes": 15,
    "session_notes": "Updated interval to reduce load",
    "updated_at": "2025-01-15T12:45:00Z"
  }
}
```

---

### 2. Screenshot Management

#### GET /api/cctv-monitoring/sessions/:id/screenshots
Get all screenshots for a session.

**Request:**
```http
GET /api/cctv-monitoring/sessions/1/screenshots?limit=20&offset=0&ocr_status=success
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `ocr_status` (optional): Filter by OCR status (pending, processing, success, failed)
- `sort` (optional): Sort order (newest, oldest) (default: newest)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 245,
      "session_id": 1,
      "screenshot_url": "https://res.cloudinary.com/xxx/image/upload/v123/cctv/screenshot_245.jpg",
      "cloudinary_public_id": "cctv/screenshot_245",
      "captured_at": "2025-01-15T10:30:00Z",
      "sequence_number": 24,
      "ocr_status": "success",
      "ocr_result": {
        "meter_reading": 1245.67,
        "pressure": 210.5,
        "temperature": 28.3,
        "flow_rate": 15.2,
        "unit": "m³"
      },
      "ocr_confidence_score": 0.92,
      "ocr_processed_at": "2025-01-15T10:30:15Z",
      "retry_count": 0,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### POST /api/cctv-monitoring/sessions/:id/capture
Manually trigger a screenshot capture.

**Request:**
```http
POST /api/cctv-monitoring/sessions/1/capture
Authorization: Bearer <token>
Content-Type: application/json

{
  "process_ocr": true,
  "notes": "Manual capture for verification"
}
```

**Request Body:**
- `process_ocr` (optional): Whether to immediately process OCR (default: true)
- `notes` (optional): Additional notes for this capture

**Response:**
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "id": 246,
    "session_id": 1,
    "screenshot_url": "https://res.cloudinary.com/xxx/image/upload/v123/cctv/screenshot_246.jpg",
    "captured_at": "2025-01-15T11:00:00Z",
    "sequence_number": 25,
    "ocr_status": "processing"
  }
}
```

---

#### DELETE /api/cctv-monitoring/screenshots/:id
Delete a screenshot (soft delete).

**Request:**
```http
DELETE /api/cctv-monitoring/screenshots/245
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Screenshot deleted successfully"
}
```

---

### 3. OCR Processing

#### POST /api/cctv-monitoring/screenshots/:id/retry-ocr
Retry OCR processing on a failed screenshot.

**Request:**
```http
POST /api/cctv-monitoring/screenshots/245/retry-ocr
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "OCR processing queued",
  "data": {
    "id": 245,
    "ocr_status": "processing",
    "retry_count": 1
  }
}
```

---

#### GET /api/cctv-monitoring/screenshots/:id/ocr-result
Get detailed OCR result for a screenshot.

**Request:**
```http
GET /api/cctv-monitoring/screenshots/245/ocr-result
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 245,
    "screenshot_url": "https://res.cloudinary.com/xxx/image/upload/v123/cctv/screenshot_245.jpg",
    "ocr_status": "success",
    "ocr_result": {
      "meter_reading": 1245.67,
      "pressure": 210.5,
      "temperature": 28.3,
      "flow_rate": 15.2,
      "unit": "m³",
      "timestamp_on_meter": "2025-01-15 10:30"
    },
    "ocr_raw_response": {
      "text_blocks": [...],
      "confidence": 0.92,
      "processing_time_ms": 1250
    },
    "ocr_confidence_score": 0.92,
    "ocr_processed_at": "2025-01-15T10:30:15Z",
    "retry_count": 0
  }
}
```

---

### 4. Health Monitoring

#### GET /api/cctv-monitoring/health
Get overall system health statistics.

**Request:**
```http
GET /api/cctv-monitoring/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sessions": 15,
    "active_sessions": 8,
    "healthy_sessions": 6,
    "warning_sessions": 2,
    "dead_sessions": 2,
    "stopped_sessions": 3,
    "completed_sessions": 2,
    "total_screenshots_today": 240,
    "total_screenshots_this_week": 1680,
    "ocr_success_rate": 0.87,
    "average_ocr_confidence": 0.89,
    "system_status": "healthy",
    "last_updated": "2025-01-15T11:00:00Z"
  }
}
```

---

#### GET /api/cctv-monitoring/sessions/:id/health
Get detailed health information for a session.

**Request:**
```http
GET /api/cctv-monitoring/sessions/1/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 1,
    "health_status": "healthy",
    "status": "active",
    "uptime_minutes": 180,
    "last_screenshot_at": "2025-01-15T10:30:00Z",
    "time_since_last_capture_minutes": 5,
    "expected_screenshots": 18,
    "actual_screenshots": 17,
    "capture_success_rate": 0.94,
    "ocr_success_rate": 0.88,
    "average_ocr_confidence": 0.91,
    "failed_captures": 1,
    "pending_ocr": 2,
    "failed_ocr": 1,
    "issues": [],
    "recommendations": [
      "System operating normally"
    ]
  }
}
```

**Health Status Values:**
- `healthy`: All systems operational, recent screenshots captured
- `warning`: Delayed screenshots or low OCR confidence
- `critical`: No screenshots for extended period (> 2x interval)
- `dead`: Session inactive for > health_check_interval

---

### 5. BARDI Token Management

#### PUT /api/cctv-monitoring/bardi-token
Update BARDI session token.

**Request:**
```http
PUT /api/cctv-monitoring/bardi-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_token": {
    "s-sid": "xxx",
    "s-sid.sig": "xxx",
    "uid": "xxx",
    "clientId": "xxx",
    "deviceId": "xxx"
  },
  "apply_to_session_id": 1
}
```

**Request Body:**
- `session_token` (required): BARDI session token object
- `apply_to_session_id` (optional): Apply to specific session only

**Response:**
```json
{
  "success": true,
  "message": "BARDI token updated successfully",
  "data": {
    "token_updated_at": "2025-01-15T11:00:00Z",
    "sessions_affected": 8
  }
}
```

---

## Data Flow Diagrams

### 1. Session Creation Flow

```
User Action (Frontend)
    ↓
[Create Session Form]
    ↓
POST /api/cctv-monitoring/sessions
    ↓
[cctvMonitoring.controller.js]
    ↓
[cctvMonitoringService.createSession()]
    ↓
┌─────────────────────────────────────┐
│ 1. Validate delivery order exists   │
│ 2. Check BARDI device availability  │
│ 3. Create session record in DB      │
│ 4. Initialize screenshot counter    │
│ 5. Start background capture worker  │
└─────────────────────────────────────┘
    ↓
[Response with session data]
    ↓
Frontend updates session list
```

### 2. Automated Screenshot Capture Flow

```
[Screenshot Capture Worker]
    ↓
Every N minutes (per session config)
    ↓
For each active session:
    ↓
┌─────────────────────────────────────┐
│ 1. Load BARDI session token         │
│ 2. Call BARDI screenshot API        │
│ 3. Download screenshot image        │
│ 4. Upload to Cloudinary             │
│ 5. Save screenshot record to DB     │
│ 6. Update session stats             │
│ 7. Queue OCR processing             │
└─────────────────────────────────────┘
    ↓
[OCR Processing Worker]
    ↓
┌─────────────────────────────────────┐
│ 1. Fetch screenshot from queue      │
│ 2. Call OCR API (meter reading)     │
│ 3. Parse OCR results                │
│ 4. Validate extracted data          │
│ 5. Update screenshot with OCR data  │
│ 6. Calculate confidence score       │
└─────────────────────────────────────┘
    ↓
[Frontend polls or receives WebSocket update]
    ↓
UI updates with new screenshot + OCR result
```

### 3. Health Monitoring Flow

```
[Health Monitor Worker]
    ↓
Every 5 minutes
    ↓
For each active session:
    ↓
┌─────────────────────────────────────┐
│ Check last_screenshot_at:           │
│                                      │
│ IF < interval:                      │
│   → status = 'healthy'              │
│                                      │
│ IF > interval but < 2x interval:    │
│   → status = 'warning'              │
│                                      │
│ IF > 2x interval:                   │
│   → status = 'critical'             │
│   → Try to capture screenshot       │
│                                      │
│ IF > health_check_interval:         │
│   → status = 'dead'                 │
│   → session.status = 'dead'         │
│   → Send notification               │
└─────────────────────────────────────┘
    ↓
Update session health_status
    ↓
Frontend shows health indicators
```

---

## Frontend-Backend Integration Points

### Current Frontend Code Locations

**File**: `frontend/src/pages/operations/CCTVMonitoringPage.tsx`

#### Integration Points to Update:

1. **Session List** (Line ~206-243)
```typescript
// CURRENT: Mockup
const fetchSessions = useCallback(async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  setSessions(MOCKUP_SESSIONS.map(...));
}, []);

// CHANGE TO: Real API
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

2. **Screenshot Gallery** (Line ~262-278)
```typescript
// CURRENT: Mockup
const fetchSessionScreenshots = async (sessionId: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  setScreenshots(MOCKUP_SCREENSHOTS);
};

// CHANGE TO: Real API
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

3. **Create Session** (Line ~304-360)
```typescript
// CURRENT: Mockup simulation
const handleCreateSession = async (e: React.FormEvent) => {
  e.preventDefault();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const newSession = { ... }; // Mock object
  setSessions([...sessions, newSession]);
};

// CHANGE TO: Real API
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
    fetchSessions(); // Refresh list
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to create session');
  } finally {
    setCreatingSession(false);
  }
};
```

4. **Stop Session** (Line ~288-301)
```typescript
// CURRENT: Direct API call (already correct)
const handleStopSession = async (sessionId: number) => {
  if (!window.confirm('Are you sure?')) return;
  try {
    await apiClient.post(`/api/cctv-monitoring/sessions/${sessionId}/stop`);
    toast.success('Session stopped');
    fetchSessions();
  } catch (error: any) {
    toast.error('Failed to stop session');
  }
};
// ✅ No changes needed
```

5. **Retry OCR** (Line ~362-380)
```typescript
// CURRENT: Mockup simulation
const handleRetryOcr = async (screenshotId: number) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  setScreenshots(screenshots.map(...)); // Mock update
};

// CHANGE TO: Real API
const handleRetryOcr = async (screenshotId: number) => {
  try {
    await apiClient.post(
      `/api/cctv-monitoring/screenshots/${screenshotId}/retry-ocr`
    );
    toast.success('OCR processing queued');
    // Re-fetch screenshots after a delay
    setTimeout(() => fetchSessionScreenshots(selectedSession!.id), 3000);
  } catch (error: any) {
    toast.error('Failed to retry OCR');
  }
};
```

---

## Error Handling Standards

### Backend Error Response Format

All API endpoints should return consistent error responses:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Technical details for debugging",
    "field": "field_name" // For validation errors
  },
  "statusCode": 400
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `SESSION_NOT_FOUND`: Session doesn't exist
- `SESSION_ALREADY_ACTIVE`: Cannot create duplicate active session
- `BARDI_TOKEN_INVALID`: BARDI authentication failed
- `BARDI_API_ERROR`: BARDI API request failed
- `OCR_PROCESSING_FAILED`: OCR processing encountered error
- `SCREENSHOT_CAPTURE_FAILED`: Failed to capture screenshot
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Frontend Error Handling

```typescript
try {
  const response = await apiClient.get('/api/cctv-monitoring/sessions');
  // Handle success
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    const errorMessage = error.response.data?.message || 'An error occurred';
    const errorCode = error.response.data?.error?.code;
    
    if (errorCode === 'BARDI_TOKEN_INVALID') {
      // Show token update modal
      setShowTokenModal(true);
      toast.error('BARDI token expired. Please update.');
    } else {
      toast.error(errorMessage);
    }
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Other error
    toast.error('An unexpected error occurred.');
  }
  console.error('CCTV Error:', error);
}
```

---

## Real-time Update Strategy

### Option 1: Polling (Initial Implementation)

```typescript
useEffect(() => {
  if (!autoRefresh) return;
  
  const interval = setInterval(() => {
    fetchSessions();
    if (selectedSession) {
      fetchSessionScreenshots(selectedSession.id);
    }
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(interval);
}, [autoRefresh, selectedSession]);
```

### Option 2: WebSocket (Future Enhancement)

```typescript
// Backend: WebSocket event emitter
io.on('connection', (socket) => {
  socket.on('subscribe-cctv-session', (sessionId) => {
    socket.join(`cctv-session-${sessionId}`);
  });
});

// Emit on screenshot capture
io.to(`cctv-session-${sessionId}`).emit('new-screenshot', screenshot);

// Emit on health status change
io.to(`cctv-session-${sessionId}`).emit('health-status-change', { 
  sessionId, 
  status: 'warning' 
});

// Frontend: WebSocket listener
useEffect(() => {
  if (!selectedSession) return;
  
  socket.emit('subscribe-cctv-session', selectedSession.id);
  
  socket.on('new-screenshot', (screenshot) => {
    setScreenshots(prev => [screenshot, ...prev]);
    toast.success('New screenshot captured');
  });
  
  socket.on('health-status-change', ({ status }) => {
    if (status === 'dead') {
      toast.error('Session has died! Check BARDI connection.');
    }
  });
  
  return () => {
    socket.emit('unsubscribe-cctv-session', selectedSession.id);
  };
}, [selectedSession]);
```

---

## Performance Optimization

### Backend Optimizations

1. **Pagination**: Always paginate large result sets
2. **Caching**: Cache session list for 30 seconds
3. **Lazy Loading**: Load screenshots on-demand
4. **Batch Processing**: Process OCR in batches
5. **Queue System**: Use Bull for background jobs

### Frontend Optimizations

1. **Virtual Scrolling**: For large screenshot galleries
2. **Image Lazy Loading**: Load images as user scrolls
3. **Debouncing**: Debounce search/filter inputs
4. **Memoization**: Use React.memo for expensive components
5. **Code Splitting**: Lazy load CCTV page

---

## Security Checklist

- [ ] All endpoints require authentication (verifyToken)
- [ ] Validate user has access to delivery order
- [ ] Encrypt BARDI tokens in database
- [ ] Sanitize file uploads
- [ ] Rate limit screenshot capture API
- [ ] Use signed URLs for Cloudinary images
- [ ] Implement CORS properly
- [ ] Log security events
- [ ] Hide sensitive data in error messages
- [ ] Implement session timeout

---

## Testing Checklist

### Unit Tests
- [ ] Session CRUD operations
- [ ] Screenshot capture logic
- [ ] OCR processing
- [ ] Health monitoring algorithm

### Integration Tests
- [ ] Session creation to screenshot capture flow
- [ ] OCR processing pipeline
- [ ] BARDI API integration
- [ ] Cloudinary upload

### End-to-End Tests
- [ ] Complete session lifecycle (create → capture → stop)
- [ ] Manual screenshot capture
- [ ] OCR retry flow
- [ ] Health monitoring alerts

---

## Deployment Checklist

### Backend
- [ ] Run database migrations
- [ ] Set environment variables
- [ ] Configure BARDI session token
- [ ] Test BARDI API connectivity
- [ ] Start background workers
- [ ] Verify Cloudinary connection
- [ ] Set up monitoring/logging

### Frontend
- [ ] Remove/comment mockup data
- [ ] Update API base URL
- [ ] Test in staging environment
- [ ] Verify error handling
- [ ] Test on different browsers
- [ ] Check mobile responsiveness

### Infrastructure
- [ ] Set up Redis for job queue
- [ ] Configure background job scheduler
- [ ] Set up log aggregation
- [ ] Configure alerts for dead sessions
- [ ] Set up database backups

---

## Conclusion

This API contract provides a complete specification for integrating the CCTV monitoring frontend with the backend. Follow this document during implementation to ensure consistency and completeness.

**Key Points**:
- Consistent API response format
- Comprehensive error handling
- Real-time update strategy
- Performance optimization
- Security best practices

