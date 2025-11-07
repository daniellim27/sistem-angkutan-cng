# CCTV Monitoring System - Complete Documentation

## 📖 Overview

This documentation package contains everything needed to implement a complete CCTV monitoring system that connects the existing frontend dashboard (currently using mockup data) to a fully functional backend with automated screenshot capture, OCR processing, and real-time health monitoring.

---

## 🎯 What This System Does

The CCTV Monitoring System allows operations staff to:

1. **Monitor CNG Delivery Operations** via BARDI smart camera feeds
2. **Automatically Capture Screenshots** of gas meters at regular intervals
3. **Extract Meter Readings** using OCR (pressure, volume, temperature)
4. **Track Session Health** and get alerts when monitoring fails
5. **Create Nota Kecil** (receipts) from captured meter readings
6. **Manage Multiple Sessions** simultaneously across different delivery locations

### Key Features

✅ **Automated Monitoring**
- Starts when CNG delivery begins
- Captures screenshots every N minutes
- Processes OCR automatically
- Monitors health status

✅ **Real-time Dashboard**
- Live session status updates
- Health indicators (healthy, warning, critical, dead)
- Screenshot gallery with OCR results
- Statistics and metrics

✅ **Manual Controls**
- Manual screenshot capture
- OCR retry for failed processing
- Session stop/restart
- BARDI token management

✅ **Integration**
- Links to Delivery Orders
- Creates Nota Kecil automatically
- Uses existing BARDI camera infrastructure
- Integrates with Cloudinary for image storage

---

## 📚 Documentation Files

### 1. **CCTV_MONITORING_IMPLEMENTATION_PLAN.md** 📋
**Purpose**: Complete implementation roadmap with detailed specifications

**Contents**:
- Current state analysis
- Phase-by-phase implementation plan (6 phases)
- Database schema design (models + migration)
- Backend services architecture
- API routes and controllers
- Background workers design
- Frontend integration steps
- Testing strategy
- Timeline (4 weeks)
- Technology stack
- Security considerations

**Use this for**: Understanding the complete scope and planning development

---

### 2. **CCTV_MONITORING_API_CONTRACT.md** 🔌
**Purpose**: Complete API specification for backend-frontend integration

**Contents**:
- All API endpoint specifications with examples
- Request/response formats
- Error handling standards
- Data flow diagrams
- Frontend integration code snippets
- Real-time update strategies (polling vs WebSockets)
- Performance optimization guidelines
- Security checklist
- Testing checklist

**Use this for**: Implementing API endpoints and frontend integration

---

### 3. **CCTV_MONITORING_ARCHITECTURE.md** 🏗️
**Purpose**: System architecture and visual diagrams

**Contents**:
- System architecture overview (ASCII diagrams)
- Component interaction flows
- Database schema relationships
- Technology stack breakdown
- Deployment architecture (dev, staging, production)
- Monitoring & logging strategy
- Scalability considerations
- File structure summary

**Use this for**: Understanding system design and architecture decisions

---

### 4. **CCTV_MONITORING_QUICK_START.md** 🚀
**Purpose**: Step-by-step implementation guide with checklists

**Contents**:
- Implementation checklist (6 phases)
- Specific file locations and line numbers
- Code snippets ready to copy/paste
- Configuration instructions
- Troubleshooting guide
- Common mistakes to avoid
- Success criteria
- Quick reference commands

**Use this for**: Actually implementing the system step-by-step

---

### 5. **CCTV_MONITORING_README.md** (This File) 📖
**Purpose**: Documentation index and quick reference

**Contents**:
- Overview of the system
- Documentation file descriptions
- Quick start guide
- Current state vs target state
- Key concepts
- FAQ

**Use this for**: Getting started and navigating documentation

---

## 🚦 Current State vs Target State

### Current State ✅ Partially Complete

**Frontend** (frontend/src/pages/operations/CCTVMonitoringPage.tsx)
- ✅ Complete UI with all features
- ✅ Session management dashboard
- ✅ Screenshot gallery
- ✅ Health monitoring display
- ✅ BARDI token modal
- ⚠️ **Uses mockup data** (not connected to backend)

**Backend**
- ✅ BARDI API integration (bardiScrapingService.js)
- ✅ Screenshot capture capability
- ✅ OCR infrastructure (for receipts)
- ✅ Cloudinary image storage
- ❌ **No CCTV-specific endpoints**
- ❌ **No database tables for sessions/screenshots**
- ❌ **No background workers**

### Target State 🎯 After Implementation

**Complete System**
- ✅ Frontend connected to real API
- ✅ Database tables for sessions and screenshots
- ✅ Full CRUD API for CCTV monitoring
- ✅ Automated screenshot capture (background worker)
- ✅ Automated OCR processing (background worker)
- ✅ Health monitoring (background worker)
- ✅ Real-time updates in dashboard
- ✅ Integration with Delivery Orders
- ✅ Nota Kecil creation from sessions

---

## 🚀 Quick Start

### For Project Managers / Decision Makers

1. **Read this file** to understand what the system does
2. **Review CCTV_MONITORING_IMPLEMENTATION_PLAN.md** for timeline and scope
3. **Check Phase 6** (Testing) to understand acceptance criteria

### For Backend Developers

1. **Start with CCTV_MONITORING_QUICK_START.md** - follow the checklist
2. **Reference CCTV_MONITORING_API_CONTRACT.md** for endpoint specs
3. **Review CCTV_MONITORING_ARCHITECTURE.md** for design understanding

**Implementation Order**:
```
Day 1: Database (Phase 1) ✓
Day 2-3: Services (Phase 2) ✓
Day 3-4: Routes & Controllers (Phase 3) ✓
Day 5: Background Workers (Phase 4) ✓
Day 6-7: Testing (Phase 6) ✓
```

### For Frontend Developers

1. **Review CCTV_MONITORING_API_CONTRACT.md** - Section "Frontend-Backend Integration Points"
2. **Follow Phase 5** in CCTV_MONITORING_QUICK_START.md
3. **Update frontend/src/pages/operations/CCTVMonitoringPage.tsx**

**Key Changes**:
- Replace mockup data fetching with real API calls
- Connect session creation form to POST endpoint
- Implement real OCR retry functionality
- Load delivery orders from API

### For Full Stack Developers

Follow **CCTV_MONITORING_QUICK_START.md** from start to finish.
Complete all 6 phases in order.

Estimated time: **5-7 days**

---

## 🔑 Key Concepts

### Session
A monitoring session represents one active camera feed watching a gas meter during a CNG delivery. Each session:
- Links to a Delivery Order
- Captures screenshots automatically
- Tracks health status
- Can create a Nota Kecil when completed

**Lifecycle**: `active` → `completed` (normal) or `dead` (failed) or `stopped` (manual)

### Screenshot
Each captured image from the BARDI camera. Screenshots:
- Belong to a session
- Have a sequence number
- Go through OCR processing
- Store extracted meter readings

**OCR Status**: `pending` → `processing` → `success` or `failed`

### Health Status
Real-time assessment of session vitality:
- **Healthy**: Recent screenshots captured, OCR working
- **Warning**: Delayed screenshots or low OCR confidence
- **Critical**: No screenshots for 2x the interval
- **Dead**: Session inactive for > health_check_interval

### BARDI Integration
The system uses BARDI smart cameras to capture meter images:
- Requires BARDI session token (stored in session.json)
- Token expires periodically (needs refresh)
- Supports multiple devices/cameras
- API-based screenshot capture

### Background Workers
Automated processes that run continuously:
1. **Screenshot Capture Worker**: Captures screenshots at intervals
2. **OCR Processing Worker**: Processes screenshots through OCR
3. **Health Monitor Worker**: Checks session health and marks dead sessions

---

## 🎨 System Flow (User Perspective)

```
1. User starts CNG delivery
   ↓
2. Opens CCTV Monitoring Dashboard
   ↓
3. Creates new monitoring session
   - Selects Delivery Order
   - Selects Customer Location
   - Specifies BARDI camera panel location
   ↓
4. System starts automated monitoring
   - Captures screenshot every 10 minutes
   - Processes OCR automatically
   - Extracts: meter reading, pressure, temperature
   ↓
5. User monitors in dashboard
   - Views screenshots as they arrive
   - Checks OCR results
   - Monitors health status
   ↓
6. User can:
   - Manually capture additional screenshots
   - Retry failed OCR
   - Stop/restart session if needed
   ↓
7. When delivery completes:
   - User stops session
   - System creates Nota Kecil from last reading
   - Session marked as "completed"
```

---

## 📊 Database Schema (Simplified)

```
delivery_orders (existing)
  ↓ 1:N
cctv_sessions (new)
  ├─ id
  ├─ delivery_order_id (FK)
  ├─ customer_name
  ├─ device_id
  ├─ status (active/completed/dead/stopped)
  ├─ start_time
  ├─ end_time
  ├─ total_screenshots_captured
  ├─ last_screenshot_at
  └─ created_nota_kecil_id (FK)
      ↓ 1:N
cctv_screenshots (new)
  ├─ id
  ├─ session_id (FK)
  ├─ screenshot_url
  ├─ captured_at
  ├─ sequence_number
  ├─ ocr_status (pending/processing/success/failed)
  ├─ ocr_result (JSONB: meter_reading, pressure, temp)
  └─ ocr_confidence_score
```

---

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL with Sequelize ORM
- **Job Queue**: Bull (Redis-based)
- **Scheduler**: node-cron
- **Image Storage**: Cloudinary
- **OCR**: Google Vision API / Tesseract

### Frontend
- **Framework**: React 18 + TypeScript
- **HTTP Client**: Axios
- **UI Components**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### External Services
- **BARDI IPC API**: Camera control and screenshot capture
- **Cloudinary**: Image upload and CDN
- **OCR API**: Text extraction from meter images

---

## ❓ FAQ

### Q: Do we need to change the existing BARDI integration?
**A**: No. The existing BARDI service (`bardiScrapingService.js`) already has screenshot capability. We're adding CCTV-specific logic on top of it.

### Q: Will this affect existing functionality?
**A**: No. This is a completely new feature. Existing routes and functionality remain unchanged.

### Q: Can we implement this in phases?
**A**: Yes. Follow the 6 phases in order:
1. Database (can use immediately)
2. Services (adds business logic)
3. API Routes (enables frontend connection)
4. Workers (adds automation)
5. Frontend (connects UI)
6. Testing (ensures quality)

You can deploy after Phase 3 (manual mode) and add workers later.

### Q: What happens if BARDI token expires?
**A**: Sessions will be marked as "dead" by the health monitor. The frontend has a token update modal where admins can paste new BARDI session tokens. After update, sessions can be restarted.

### Q: How do we handle multiple simultaneous sessions?
**A**: The system is designed for concurrent sessions. The database supports multiple active sessions, and workers process them all in parallel. Each session is independent.

### Q: What if OCR fails repeatedly?
**A**: 
- Automatic retry up to N times (configurable, default: 3)
- Manual retry available in UI
- Screenshots saved regardless (can be viewed manually)
- Low confidence OCR results flagged for review

### Q: How does this integrate with Nota Kecil?
**A**: When a session is completed, the system can automatically create a Nota Kecil using:
- Customer information from Delivery Order
- Final meter reading from last screenshot
- Timestamps from session
- Links back to the CCTV session for audit trail

### Q: Can we use this for non-delivery monitoring?
**A**: The current design is tied to Delivery Orders, but the architecture could be adapted for standalone monitoring by making `delivery_order_id` optional and adding a `monitoring_type` field.

### Q: What about mobile app integration?
**A**: Phase 2 feature. The API is designed to work with both web and mobile. Mobile app would use the same endpoints with mobile-specific authentication.

---

## 🔐 Security Notes

1. **Authentication Required**: All endpoints require valid JWT token
2. **BARDI Token Security**: Tokens should be encrypted in database
3. **Image Access**: Use signed URLs for temporary access
4. **Rate Limiting**: Prevent abuse of screenshot capture
5. **Access Control**: Users can only access sessions for their delivery orders

---

## 📞 Support & Contribution

### Reporting Issues
1. Check logs: `backend/logs/app.log`
2. Check database state
3. Verify BARDI token validity
4. Review error messages in frontend console

### Common Issues & Solutions
See **CCTV_MONITORING_QUICK_START.md** → Troubleshooting section

---

## 🎯 Success Metrics

After implementation, you should be able to:

✅ **Create a session** in under 30 seconds  
✅ **Capture screenshots** automatically every 10 minutes  
✅ **Process OCR** within 5 seconds per screenshot  
✅ **Detect dead sessions** within 15 minutes  
✅ **View real-time updates** in the dashboard  
✅ **Generate Nota Kecil** from session data  
✅ **Monitor multiple sessions** simultaneously  
✅ **Handle 50+ screenshots** per session without performance issues  

---

## 📦 Deliverables Checklist

- [x] **CCTV_MONITORING_IMPLEMENTATION_PLAN.md** - Complete roadmap
- [x] **CCTV_MONITORING_API_CONTRACT.md** - API specification
- [x] **CCTV_MONITORING_ARCHITECTURE.md** - Architecture diagrams
- [x] **CCTV_MONITORING_QUICK_START.md** - Implementation guide
- [x] **CCTV_MONITORING_README.md** - Documentation index (this file)

**Status**: ✅ Documentation Complete - Ready for Implementation

---

## 🚀 Next Steps

1. **Review this README** to understand the system
2. **Choose your role** (Backend/Frontend/Full Stack)
3. **Open CCTV_MONITORING_QUICK_START.md**
4. **Follow the checklist** step by step
5. **Test thoroughly** at each phase
6. **Deploy** to staging first

**Estimated Time to Production**: 2-3 weeks (including testing)

---

## 📄 License & Credits

Part of the **Sistema Angkutan Ewaldo** - CNG Delivery Management System

**CCTV Monitoring Module**
- Integrates with BARDI Smart Camera System
- Uses Cloudinary for image storage
- Implements OCR for automated meter reading

---

## 📝 Version History

- **v1.0** (2025-01-31): Initial documentation package created
  - Complete implementation plan
  - API contract specification
  - Architecture diagrams
  - Quick start guide

---

**Ready to implement?** Start with `CCTV_MONITORING_QUICK_START.md`! 🚀

