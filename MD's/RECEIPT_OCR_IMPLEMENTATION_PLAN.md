# Receipt OCR Implementation Plan

## Overview
This document outlines the implementation plan for replacing the current scaler photo system with a new receipt OCR system for CNG filling receipts. The new system will capture and process CNG filling receipts (like the PGN GAGAS example) and link them to Delivery Orders (DO) instead of nota kecil.

## Current State Analysis
- **Current Flow**: Drivers take photos of scalers → OCR extraction → linked to nota kecil
- **New Flow**: Drivers take photos of CNG filling receipts → OCR extraction → linked to Delivery Orders
- **Business Impact**: More accurate tracking of actual fuel consumption through official receipts

## Backend Implementation Plan

### 1. Database Schema Changes

#### New Table: `receipt_ocr`
```sql
CREATE TABLE receipt_ocr (
    id SERIAL PRIMARY KEY,
    do_id INTEGER REFERENCES delivery_orders(id),
    filling_station_name VARCHAR(255),
    customer_name VARCHAR(255),
    filling_date DATE,
    filling_time_start TIME,
    filling_time_end TIME,
    initial_pressure DECIMAL(10,2),
    final_pressure DECIMAL(10,2),
    total_volume DECIMAL(10,3),
    customer_signatory VARCHAR(255),
    provider_signatory VARCHAR(255),
    receipt_photo_url TEXT,
    ocr_confidence_score DECIMAL(5,2),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Migration Tasks
- Create `receipt_ocr` table
- Remove scaler photo related columns from existing tables
- Remove nota kecil photo connections
- Update foreign key relationships

### 2. New OCR Service Implementation

#### File: `src/services/receiptOcrService.js`
**Purpose**: Process CNG receipt images and extract structured data

**Key Functions**:
- `processReceiptImage(imageFile)` - Main OCR processing function
- `extractReceiptFields(ocrText)` - Parse OCR text into structured fields
- `validateExtractedData(data)` - Validate OCR extracted data
- `calculateConfidenceScore(data)` - Calculate OCR confidence score

**OCR Fields to Extract**:
- Filling Station Name (e.g., "SPBG Rawu")
- Customer Name (e.g., "PT Qurpol")
- Filling Date (e.g., "Selasa 23-09-2025")
- Filling Time Start/End (e.g., "19:01 - 19:42")
- Initial Pressure (e.g., "105" bar)
- Final Pressure (e.g., "200" bar)
- Total Volume (e.g., "93.423" M³)
- Customer Signatory
- Provider Signatory

### 3. API Endpoints

#### New Routes: `src/routes/receiptOcr.js`

**Endpoints**:
- `POST /api/receipt-ocr/upload`
  - Upload receipt photo and trigger OCR
  - Request: `{ doId, imageFile }`
  - Response: `{ receiptId, extractedData, confidenceScore }`

- `GET /api/receipt-ocr/:doId`
  - Get all receipts for a specific DO
  - Response: `{ receipts: [...] }`

- `GET /api/receipt-ocr/receipt/:id`
  - Get specific receipt details
  - Response: `{ receipt: {...} }`

- `PUT /api/receipt-ocr/:id/verify`
  - Admin verification of OCR data
  - Request: `{ isVerified, notes }`
  - Response: `{ success: true }`

- `PUT /api/receipt-ocr/:id/edit`
  - Edit OCR extracted data
  - Request: `{ fieldUpdates }`
  - Response: `{ updatedReceipt }`

- `DELETE /api/receipt-ocr/:id`
  - Delete receipt and associated data
  - Response: `{ success: true }`

### 4. Controller Implementation

#### File: `src/controllers/receiptOcrController.js`
**Functions**:
- `uploadReceipt()` - Handle receipt upload and OCR processing
- `getReceiptsByDo()` - Retrieve receipts for delivery order
- `getReceiptById()` - Get specific receipt details
- `verifyReceipt()` - Admin verification functionality
- `editReceipt()` - Edit extracted OCR data
- `deleteReceipt()` - Remove receipt

### 5. Remove Legacy Functionality

#### Files to Modify/Remove:
- Remove scaler photo endpoints and services
- Remove nota kecil photo connections
- Clean up unused OCR services for scalers
- Update database migrations to remove old columns

#### Files Affected:
- `src/routes/scalerPhotos.js` (remove)
- `src/controllers/scalerPhotoController.js` (remove)
- `src/services/scalerOcrService.js` (remove)
- Update nota kecil related models to remove photo connections

## Frontend Implementation Plan

### 1. Mobile App Changes

#### Receipt Capture Flow
**New Screens**:
- Receipt Photo Capture Screen
- OCR Data Review/Edit Screen
- Receipt History per DO Screen

#### File Modifications:
- Replace scaler photo components with receipt photo components
- Update navigation to use DO instead of nota kecil
- Add OCR data editing capabilities
- Implement receipt verification status display

#### Key Features:
- Camera integration for receipt capture
- OCR data preview with editing capabilities
- Offline support for receipt capture
- Receipt history and status tracking

### 2. Web Admin Dashboard Changes

#### New Admin Features:
- Receipt OCR Management Dashboard
- Receipt Verification Interface
- OCR Data Editing Capabilities
- Receipt Reports and Analytics
- Bulk Receipt Processing

#### File Modifications:
- Remove scaler photo management components
- Add receipt OCR management components
- Update admin dashboard navigation
- Add receipt verification workflows

#### Key Features:
- Receipt verification queue
- OCR confidence score monitoring
- Receipt data export functionality
- Receipt analytics and reporting

## Implementation Timeline

### Phase 1: Backend Foundation (Week 1)
- [ ] Create database schema and migrations
- [ ] Implement receipt OCR service
- [ ] Create API endpoints
- [ ] Implement controller functions

### Phase 2: Mobile App Integration (Week 2)
- [ ] Replace scaler photo with receipt capture
- [ ] Implement OCR data review screens
- [ ] Update navigation and data flow
- [ ] Connect to DO instead of nota kecil

### Phase 3: Web Admin Dashboard (Week 3)
- [ ] Create receipt management interface
- [ ] Implement verification workflows
- [ ] Add reporting and analytics
- [ ] Remove legacy scaler photo features

### Phase 4: Testing & Deployment (Week 4)
- [ ] End-to-end testing
- [ ] OCR accuracy testing
- [ ] Performance optimization
- [ ] Production deployment

## Technical Considerations

### OCR Accuracy
- Implement confidence scoring for OCR results
- Provide manual correction capabilities
- Log OCR processing for accuracy monitoring

### Data Validation
- Validate extracted data against business rules
- Implement data type validation
- Handle edge cases in OCR processing

### Performance
- Optimize image processing for mobile devices
- Implement efficient image storage and retrieval
- Consider batch processing for multiple receipts

### Security
- Secure image upload and storage
- Implement proper access controls
- Audit trail for receipt modifications

## Migration Strategy

### Data Migration
- Export existing nota kecil data if needed
- Clean up old scaler photo references
- Update user training materials

### Rollback Plan
- Maintain backup of current system
- Implement feature flags for gradual rollout
- Prepare rollback procedures

## Testing Strategy

### Unit Testing
- Test OCR service functions
- Test API endpoints
- Test data validation logic

### Integration Testing
- Test mobile app to backend integration
- Test admin dashboard functionality
- Test OCR processing pipeline

### User Acceptance Testing
- Test with actual receipt images
- Validate OCR accuracy with real data
- Test user workflows end-to-end

## Success Metrics

### Technical Metrics
- OCR accuracy rate (target: >95% for key fields)
- Processing time per receipt (target: <30 seconds)
- System uptime and reliability

### Business Metrics
- Receipt processing volume
- Verification completion rate
- User adoption and satisfaction

## Dependencies

### External Services
- OCR processing service (existing infrastructure)
- Image storage service (Cloudinary/Google Drive)
- Database (PostgreSQL)

### Internal Dependencies
- Delivery Order (DO) system
- User authentication and authorization
- Mobile app infrastructure
- Web admin dashboard

## Risk Mitigation

### Technical Risks
- OCR accuracy issues → Implement manual correction
- Performance bottlenecks → Optimize image processing
- Data loss → Implement backup and recovery

### Business Risks
- User adoption → Provide training and support
- Data accuracy → Implement verification workflows
- System downtime → Implement monitoring and alerts

---

**Document Version**: 1.0  
**Created**: [Current Date]  
**Last Updated**: [Current Date]  
**Status**: Draft - Pending Review



