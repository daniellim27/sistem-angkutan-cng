# CCTV Monitoring System - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + TypeScript)                   │
│                     frontend/src/pages/operations/CCTVMonitoringPage.tsx    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Session    │  │  Screenshot  │  │    Health    │  │    Token     │   │
│  │  Dashboard   │  │   Gallery    │  │  Monitoring  │  │  Management  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                   │                                         │
│                          apiClient (axios)                                  │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                        HTTP REST API Calls
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                          BACKEND API (Node.js + Express)                     │
│                           backend/src/server.js                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              API Routes: /api/cctv-monitoring/*                     │    │
│  │         backend/src/routes/cctvMonitoring.routes.js                │    │
│  └──────────────────────────────┬─────────────────────────────────────┘    │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                    CCTV Monitoring Controller                        │   │
│  │           backend/src/controllers/cctvMonitoring.controller.js      │   │
│  │                                                                      │   │
│  │  • getSessions()           • createSession()                        │   │
│  │  • getSessionById()        • stopSession()                          │   │
│  │  • getSessionScreenshots() • manualCapture()                        │   │
│  │  • retryOcr()              • updateBardiToken()                     │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                    CCTV Monitoring Service                           │   │
│  │           backend/src/services/cctvMonitoringService.js             │   │
│  │                                                                      │   │
│  │  • Session Management         • Health Monitoring                   │   │
│  │  • Screenshot Orchestration   • Statistics Calculation              │   │
│  │  • OCR Coordination           • Nota Kecil Integration              │   │
│  └──────┬────────────────────────┬────────────────────────┬───────────┘   │
│         │                        │                        │                │
│         │                        │                        │                │
│  ┌──────▼────────┐   ┌──────────▼─────────┐   ┌─────────▼────────────┐   │
│  │    BARDI      │   │   Meter OCR        │   │   Image Storage      │   │
│  │   Service     │   │   Service          │   │   (Cloudinary)       │   │
│  │               │   │                    │   │                      │   │
│  │ • Session     │   │ • Meter Reading    │   │ • Upload             │   │
│  │   Auth        │   │ • Pressure OCR     │   │ • Retrieve           │   │
│  │ • Device      │   │ • Temperature OCR  │   │ • Delete             │   │
│  │   Management  │   │ • Validation       │   │                      │   │
│  │ • Screenshot  │   │                    │   │                      │   │
│  │   API         │   │                    │   │                      │   │
│  └───────────────┘   └────────────────────┘   └──────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
┌───────────────────▼──┐  ┌─────────▼────────┐  ┌──▼──────────────────┐
│   DATABASE           │  │  BACKGROUND      │  │  EXTERNAL SERVICES  │
│   (PostgreSQL)       │  │  WORKERS         │  │                     │
├──────────────────────┤  ├──────────────────┤  ├─────────────────────┤
│                      │  │                  │  │                     │
│  ┌────────────────┐  │  │  Screenshot      │  │  BARDI API          │
│  │ cctv_sessions  │  │  │  Capture Worker  │  │  ipc.bardi.co.id    │
│  │                │  │  │                  │  │                     │
│  │ • id           │  │  │  Every N mins:   │  │  • Authentication   │
│  │ • delivery_    │  │  │  1. Check active │  │  • Device List      │
│  │   order_id     │  │  │     sessions     │  │  • Screenshot API   │
│  │ • customer     │  │  │  2. Capture      │  │                     │
│  │ • device_id    │  │  │     screenshot   │  ├─────────────────────┤
│  │ • status       │  │  │  3. Upload       │  │                     │
│  │ • bardi_token  │  │  │  4. Queue OCR    │  │  Cloudinary API     │
│  │ • start_time   │  │  │                  │  │                     │
│  │ • end_time     │  │  └──────────────────┘  │  • Image Upload     │
│  │ • stats        │  │                        │  • Image Storage    │
│  └────────────────┘  │  ┌──────────────────┐  │  • CDN Delivery     │
│                      │  │  OCR Processing  │  │                     │
│  ┌────────────────┐  │  │  Worker          │  ├─────────────────────┤
│  │ cctv_          │  │  │                  │  │                     │
│  │ screenshots    │  │  │  Queue-based:    │  │  OCR API            │
│  │                │  │  │  1. Fetch image  │  │  (Google Vision/    │
│  │ • id           │  │  │  2. Call OCR API │  │   Tesseract)        │
│  │ • session_id   │  │  │  3. Parse result │  │                     │
│  │ • screenshot_  │  │  │  4. Validate     │  │  • Text Detection   │
│  │   url          │  │  │  5. Update DB    │  │  • Number Extract   │
│  │ • captured_at  │  │  │  6. Retry if     │  │  • Confidence       │
│  │ • sequence_#   │  │  │     needed       │  │   Score             │
│  │ • ocr_status   │  │  │                  │  │                     │
│  │ • ocr_result   │  │  └──────────────────┘  └─────────────────────┘
│  │ • confidence   │  │                        
│  └────────────────┘  │  ┌──────────────────┐  
│                      │  │  Health Monitor  │  
│  ┌────────────────┐  │  │  Worker          │  
│  │ delivery_      │  │  │                  │  
│  │ orders         │  │  │  Every 5 mins:   │  
│  │ (existing)     │  │  │  1. Check last   │  
│  └────────────────┘  │  │     screenshot   │  
│                      │  │  2. Calculate    │  
│  ┌────────────────┐  │  │     health       │  
│  │ nota_kecils    │  │  │  3. Update       │  
│  │ (existing)     │  │  │     status       │  
│  └────────────────┘  │  │  4. Send alerts  │  
│                      │  │                  │  
└──────────────────────┘  └──────────────────┘  
```

---

## Component Interaction Flow

### 1. Session Creation Flow

```
┌─────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────┐
│ Frontend│         │ API Route│         │  Controller │         │  Service │
└────┬────┘         └────┬─────┘         └──────┬──────┘         └────┬─────┘
     │                   │                      │                      │
     │ POST /sessions    │                      │                      │
     ├──────────────────>│                      │                      │
     │                   │ createSession()      │                      │
     │                   ├─────────────────────>│                      │
     │                   │                      │ validateDeliveryOrder│
     │                   │                      ├─────────────────────>│
     │                   │                      │                      │
     │                   │                      │ createSessionRecord  │
     │                   │                      │<─────────────────────│
     │                   │                      │                      │
     │                   │                      │ startCaptureWorker   │
     │                   │                      ├─────────────────────>│
     │                   │                      │                      │
     │                   │ Session Data         │                      │
     │                   │<─────────────────────┤                      │
     │ 201 Created       │                      │                      │
     │<──────────────────┤                      │                      │
     │                   │                      │                      │
```

### 2. Automated Screenshot Capture Flow

```
┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│ Capture      │    │ BARDI    │    │Cloudinary│    │ Database│    │   OCR    │
│ Worker       │    │ Service  │    │          │    │         │    │  Queue   │
└──────┬───────┘    └────┬─────┘    └────┬─────┘    └────┬────┘    └────┬─────┘
       │                 │               │               │              │
       │ Timer Trigger   │               │               │              │
       ├─(every N mins)  │               │               │              │
       │                 │               │               │              │
       │ captureScreenshot()            │               │              │
       ├────────────────>│               │               │              │
       │                 │               │               │              │
       │                 │ Call BARDI API│               │              │
       │                 │ /screenshot   │               │              │
       │                 ├──────────────>│               │              │
       │                 │               │               │              │
       │                 │ Image Binary  │               │              │
       │                 │<──────────────┤               │              │
       │                 │               │               │              │
       │ uploadImage()   │               │               │              │
       ├─────────────────┼──────────────>│               │              │
       │                 │               │               │              │
       │                 │               │ Image URL     │              │
       │                 │               │<──────────────┤              │
       │                 │               │               │              │
       │ saveScreenshot()│               │               │              │
       ├─────────────────┼───────────────┼──────────────>│              │
       │                 │               │               │              │
       │                 │               │               │ Screenshot   │
       │                 │               │               │ Record Saved │
       │                 │               │               │<─────────────┤
       │                 │               │               │              │
       │ queueOCR()      │               │               │              │
       ├─────────────────┼───────────────┼───────────────┼─────────────>│
       │                 │               │               │              │
       │                 │               │               │              │ Process
       │                 │               │               │              │ OCR
       │                 │               │               │              │
       │                 │               │               │  Update OCR  │
       │                 │               │               │  Result      │
       │                 │               │               │<─────────────┤
       │                 │               │               │              │
```

### 3. Health Monitoring Flow

```
┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Health      │    │ Database │    │  Alert   │    │ Frontend │
│  Worker      │    │          │    │  Service │    │          │
└──────┬───────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
       │                 │               │              │
       │ Every 5 mins    │               │              │
       ├─Timer           │               │              │
       │                 │               │              │
       │ getActiveSessions()            │              │
       ├────────────────>│               │              │
       │                 │               │              │
       │ Session List    │               │              │
       │<────────────────┤               │              │
       │                 │               │              │
       │ For each:       │               │              │
       │ checkHealth()   │               │              │
       │                 │               │              │
       │ IF: last_screenshot_at          │              │
       │     > threshold │               │              │
       │                 │               │              │
       │ updateStatus()  │               │              │
       │ status='dead'   │               │              │
       ├────────────────>│               │              │
       │                 │               │              │
       │                 │ Updated       │              │
       │                 │<──────────────┤              │
       │                 │               │              │
       │ sendAlert()     │               │              │
       ├─────────────────┼──────────────>│              │
       │                 │               │              │
       │                 │               │ Notification │
       │                 │               ├─────────────>│
       │                 │               │              │
       │                 │               │              │ Toast:
       │                 │               │              │ "Session
       │                 │               │              │  Dead!"
```

---

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         delivery_orders                          │
│  • id (PK)                                                       │
│  • do_number                                                     │
│  • do_name                                                       │
│  • customer_name                                                 │
│  • status                                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 1:N
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                         cctv_sessions                            │
│  • id (PK)                                                       │
│  • delivery_order_id (FK) ──────────┐                           │
│  • customer_location_index           │                           │
│  • customer_name                     │                           │
│  • device_id                         │                           │
│  • bardi_session_token               │                           │
│  • start_time                        │                           │
│  • end_time                          │                           │
│  • status                            │                           │
│  • total_screenshots_captured        │                           │
│  • last_screenshot_at                │                           │
│  • created_nota_kecil_id (FK) ───────┼───────────┐              │
│  • created_by (FK) ──────────────────┼───────┐   │              │
└──────────────────────────┬────────────┘       │   │              │
                           │                    │   │              │
                           │ 1:N                │   │              │
                           │                    │   │              │
┌──────────────────────────▼──────────────────────────────────────┐
│                      cctv_screenshots                            │
│  • id (PK)                                                       │
│  • session_id (FK)                                               │
│  • screenshot_url                                                │
│  • cloudinary_public_id                                          │
│  • captured_at                                                   │
│  • sequence_number                                               │
│  • ocr_status                                                    │
│  • ocr_result (JSONB)                                            │
│  • ocr_confidence_score                                          │
│  • retry_count                                                   │
└──────────────────────────────────────────────────────────────────┘

                                                    │
                           ┌────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                           users                                  │
│  • id (PK)                                                       │
│  • name                                                          │
│  • role                                                          │
└──────────────────────────────────────────────────────────────────┘

                                    │
                ┌───────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│                         nota_kecils                              │
│  • id (PK)                                                       │
│  • delivery_order_id (FK)                                        │
│  • meter_reading                                                 │
│  • created_at                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
```
┌────────────────────────────────────────┐
│ React 18 + TypeScript                  │
│ • Component-based architecture         │
│ • React Hooks for state management     │
│ • Axios for HTTP requests              │
│ • React Hot Toast for notifications    │
│ • Lucide React for icons               │
│ • Tailwind CSS for styling             │
└────────────────────────────────────────┘
```

### Backend
```
┌────────────────────────────────────────┐
│ Node.js + Express                      │
│ • RESTful API architecture             │
│ • JWT authentication                   │
│ • Sequelize ORM                        │
│ • PostgreSQL database                  │
│ • Node-cron for scheduling             │
│ • Bull/BullMQ for job queues           │
└────────────────────────────────────────┘
```

### External Services
```
┌────────────────────────────────────────┐
│ BARDI IPC API                          │
│ • Camera device management             │
│ • Screenshot capture                   │
│ • Session authentication               │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Cloudinary                             │
│ • Image upload & storage               │
│ • CDN delivery                         │
│ • Image transformations                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ OCR Service (Google Vision/Tesseract)  │
│ • Text detection                       │
│ • Number extraction                    │
│ • Confidence scoring                   │
└────────────────────────────────────────┘
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                        │
│  • JWT Token Verification (verifyToken middleware)              │
│  • Role-based Access Control (isAdmin middleware)               │
│  • Session validation                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      AUTHORIZATION LAYER                         │
│  • User must own/have access to delivery order                  │
│  • Admin-only operations (delete, bulk actions)                 │
│  • Rate limiting per user/IP                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      DATA PROTECTION LAYER                       │
│  • Encrypted BARDI tokens in database                           │
│  • Signed URLs for image access                                 │
│  • Input validation & sanitization                              │
│  • SQL injection prevention (Sequelize ORM)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      NETWORK SECURITY LAYER                      │
│  • HTTPS enforcement                                            │
│  • CORS configuration                                           │
│  • Request size limits                                          │
│  • Helmet.js security headers                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Development Environment
```
┌──────────────────────────────────────────────────────────────┐
│                    Local Development                          │
├──────────────────────────────────────────────────────────────┤
│  Frontend: http://localhost:5173 (Vite dev server)          │
│  Backend:  http://localhost:3001 (Express + nodemon)        │
│  Database: localhost:5432 (PostgreSQL)                       │
│  Redis:    localhost:6379 (Job queue)                        │
└──────────────────────────────────────────────────────────────┘
```

### Production Environment (Docker)
```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Compose                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Frontend   │  │   Backend   │  │  PostgreSQL │         │
│  │  Container  │  │  Container  │  │  Container  │         │
│  │             │  │             │  │             │         │
│  │ Nginx:80    │  │ Node:3001   │  │ Port:5432   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   Redis     │  │  Workers    │                           │
│  │  Container  │  │  Container  │                           │
│  │             │  │             │                           │
│  │ Port:6379   │  │ (Background)│                           │
│  └─────────────┘  └─────────────┘                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Production Environment (Render/Cloud)
```
┌──────────────────────────────────────────────────────────────┐
│                      Cloud Deployment                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │ Frontend (Static Site)                          │         │
│  │ • Render Static Site / Vercel / Netlify        │         │
│  │ • CDN delivery                                  │         │
│  │ • Environment: Production                       │         │
│  └────────────────────────────────────────────────┘         │
│                          │                                    │
│                          │ HTTPS                              │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────┐         │
│  │ Backend (Web Service)                           │         │
│  │ • Render Web Service / Railway / Heroku        │         │
│  │ • Auto-scaling enabled                          │         │
│  │ • Health checks configured                      │         │
│  │ • Background workers running                    │         │
│  └────────────────────────────────────────────────┘         │
│                          │                                    │
│                          │ Private Network                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────┐         │
│  │ Database (Managed PostgreSQL)                   │         │
│  │ • Render PostgreSQL / AWS RDS / Supabase       │         │
│  │ • Automated backups                             │         │
│  │ • Connection pooling                            │         │
│  └────────────────────────────────────────────────┘         │
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │ Redis (Managed Cache)                           │         │
│  │ • Redis Cloud / Upstash                         │         │
│  │ • Job queue management                          │         │
│  └────────────────────────────────────────────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Logging

```
┌────────────────────────────────────────────────────────────┐
│                    Application Logs                         │
├────────────────────────────────────────────────────────────┤
│  • Winston Logger                                          │
│  • Log Levels: error, warn, info, debug                   │
│  • Structured JSON logging                                │
│  • Timestamp, user ID, request ID                         │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    Log Aggregation                          │
├────────────────────────────────────────────────────────────┤
│  • CloudWatch / Datadog / Sentry                           │
│  • Real-time log streaming                                 │
│  • Error tracking and alerting                             │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    Metrics & Alerts                         │
├────────────────────────────────────────────────────────────┤
│  • Session creation rate                                   │
│  • Screenshot capture success rate                         │
│  • OCR processing time                                     │
│  • Dead session alerts                                     │
│  • API response times                                      │
│  • Error rates                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Horizontal Scaling
```
┌───────────────────────────────────────────────────────────┐
│              Load Balancer (Nginx/ALB)                     │
└─────┬────────────────┬────────────────┬──────────────────┘
      │                │                │
      ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Backend  │    │ Backend  │    │ Backend  │
│ Instance │    │ Instance │    │ Instance │
│    1     │    │    2     │    │    3     │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │   Shared Redis   │
          │   (Job Queue)    │
          └──────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │   PostgreSQL     │
          │   (Read Replica) │
          └──────────────────┘
```

### Background Worker Scaling
```
┌──────────────────────────────────────────────────────────┐
│                    Bull Queue (Redis)                     │
│  • Screenshot Capture Queue                              │
│  • OCR Processing Queue                                  │
│  • Health Monitoring Queue                               │
└───────┬────────────────┬────────────────┬───────────────┘
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │ Worker  │     │ Worker  │     │ Worker  │
   │  Pod 1  │     │  Pod 2  │     │  Pod 3  │
   │         │     │         │     │         │
   │ Capture │     │   OCR   │     │ Health  │
   │  Jobs   │     │  Jobs   │     │  Jobs   │
   └─────────┘     └─────────┘     └─────────┘
```

---

## File Structure Summary

```
project-root/
├── frontend/
│   └── src/
│       └── pages/
│           └── operations/
│               └── CCTVMonitoringPage.tsx [EXISTING - NEEDS UPDATE]
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── cctvSession.model.js [NEW]
│   │   │   ├── cctvScreenshot.model.js [NEW]
│   │   │   └── index.js [UPDATE]
│   │   │
│   │   ├── services/
│   │   │   ├── cctvMonitoringService.js [NEW]
│   │   │   ├── meterOcrService.js [NEW]
│   │   │   └── bardiScrapingService.js [EXISTING - ENHANCE]
│   │   │
│   │   ├── controllers/
│   │   │   └── cctvMonitoring.controller.js [NEW]
│   │   │
│   │   ├── routes/
│   │   │   └── cctvMonitoring.routes.js [NEW]
│   │   │
│   │   ├── workers/
│   │   │   ├── screenshotCaptureWorker.js [NEW]
│   │   │   ├── ocrProcessingWorker.js [NEW]
│   │   │   └── healthMonitorWorker.js [NEW]
│   │   │
│   │   ├── migrations/
│   │   │   └── 20250101_create_cctv_monitoring.js [NEW]
│   │   │
│   │   └── server.js [UPDATE - Add routes]
│   │
│   └── session.json [EXISTING - BARDI token]
│
└── Documentation/
    ├── CCTV_MONITORING_IMPLEMENTATION_PLAN.md [THIS FILE]
    ├── CCTV_MONITORING_API_CONTRACT.md
    └── CCTV_MONITORING_ARCHITECTURE.md [CURRENT FILE]
```

---

## Summary

This architecture provides:

✅ **Scalability**: Horizontal scaling for both API and workers  
✅ **Reliability**: Health monitoring, retry logic, error handling  
✅ **Performance**: Queue-based processing, caching, CDN delivery  
✅ **Security**: Multi-layer authentication and authorization  
✅ **Maintainability**: Clear separation of concerns, modular design  
✅ **Observability**: Comprehensive logging and monitoring  

The system is designed to handle multiple simultaneous monitoring sessions, process screenshots efficiently, and provide real-time updates to the frontend dashboard.

