# Nota Kecil System with OCR Integration - Implementation Plan

## 🎯 Overview
Complete nota kecil system that integrates OCR processing with gas calculation variables (V, Vt, p, t, k) and displays results in table format for admin review.

## 📋 Implementation Checklist

### Phase 1: Database Schema & Models
- [ ] Create `nota_kecils` table with gas calculation fields
  - [ ] Raw OCR fields: `stan_awal`, `stan_akhir`, `tekanan_operasi`, `temperatur_operasi`
  - [ ] Calculated fields: `Vt` (selisih), `k` (faktor koreksi), `V` (pemakaian)
  - [ ] Photo storage: `pressure_bar_photos`, `temperature_photos`, `stan_awal_photos`, `stan_akhir_photos`
  - [ ] OCR metadata: `ocr_confidence_scores`, `ocr_processing_status`
  - [ ] Driver confirmation: `driver_confirmed`, `driver_confirmed_at`, `driver_notes`
  - [ ] Manual override fields for driver corrections
- [ ] Create Sequelize model for `NotaKecil`
- [ ] Add database migration for `nota_kecils` table
- [ ] Create indexes for performance optimization

### Phase 2: Backend Services & Calculations
- [ ] Create `GasCalculationService` class
  - [ ] Implement `calculateSuperCompressibilityFactor(p)` method
    - [ ] If p < 4 bar: `k = 1 + (0.0002 * p)`
    - [ ] If p >= 4 bar: `k = [FPV]²` (A.G.A Report NX-19)
  - [ ] Implement `calculateVolumeGas()` method
    - [ ] Calculate `Vt = stan_akhir - stan_awal`
    - [ ] Calculate `k` based on pressure
    - [ ] Calculate `V = Vt * k`
- [ ] Enhance OCR service for gas meter readings
  - [ ] `extractPressureValue()` for pressure bar photos
  - [ ] `extractTemperatureValue()` for temperature photos
  - [ ] `extractMeterReading()` for stan awal/akhir photos
  - [ ] Add confidence scoring for each extraction

### Phase 3: Backend API Endpoints ✅ MOSTLY COMPLETED
- [x] Create OCR processing endpoint
  - [x] `POST /api/delivery-orders/:id/process-nota-kecil/:photoType` (individual photo OCR)
  - [x] `POST /api/delivery-orders/:id/process-nota-kecil` (bulk OCR processing)
  - [x] Process all 4 photo types with real OpenAI GPT-4 Vision OCR
  - [x] Calculate gas variables automatically (Vt, k, V)
  - [x] Smart field detection and mismatch handling
- [ ] Create confirmation endpoint
  - [ ] `PUT /api/delivery-orders/:id/nota-kecil/:notaId/confirm` ← **REMAINING TASK**
  - [ ] Allow driver to confirm/override OCR values
  - [ ] Recalculate gas variables if values changed
  - [ ] Save nota kecil record to database
- [x] Create retrieval endpoints
  - [x] `GET /api/delivery-orders/:id/nota-kecils` (all nota kecils for DO)
  - [x] `GET /api/delivery-orders/:id/customers/:customerIndex/nota-kecils` (per customer)
- [x] Add error handling and validation
- [x] Add photo upload handling with Multer (nota_kecil directory)

### Phase 4: Mobile App UI Enhancement ✅ COMPLETED
- [x] Create `NotaKecilUploader` component
  - [x] Photo capture interface for 4 types (pressure, temperature, stan awal, stan akhir)
  - [x] Upload progress indicator
  - [x] OCR processing status display
- [x] Create OCR results review interface
  - [x] Display extracted values with edit capability
  - [x] Show calculated values (Vt, k, V) as read-only
  - [x] Input validation for numeric values
  - [x] Real-time recalculation when values change
- [x] Create confirmation workflow
  - [x] Review modal with all values
  - [x] Driver notes input field
  - [x] Confirm & Save button
  - [x] Success/error feedback
- [x] Update trip detail page integration
  - [x] Add nota kecil section per customer location
  - [x] Show existing nota kecils if any
  - [x] Navigation to upload new nota kecil
- [x] **Real OCR Integration**
  - [x] Individual photo OCR processing with OpenAI GPT-4 Vision
  - [x] Smart field detection and mismatch handling
  - [x] Real-time confidence scoring
  - [x] Individual photo editing modals
  - [x] Automatic gas calculation (Vt, k, V) based on real OCR data

### Phase 5: Admin Web Interface
- [ ] Create `NotaKecilsTable` component
  - [ ] Table with columns: JAM, TANGGAL, Stand Meter Awal, Stand Meter Akhir, Selisih, Tekanan, Suhu, Faktor Koreksi, Pemakaian, Driver, Status, Actions
  - [ ] Indonesian number formatting (comma decimal separator)
  - [ ] Footer with totals for Selisih and Pemakaian
  - [ ] Photo viewer modal
  - [ ] Detail view modal
- [ ] Update Delivery Order detail page
  - [ ] Customer hierarchy navigation: DO → Customer → Nota Kecils
  - [ ] Separate tables for primary and additional customers
  - [ ] Customer location information display
- [ ] Add admin actions
  - [ ] View all photos for a nota kecil
  - [ ] Download nota kecil as PDF
  - [ ] Export customer nota kecils to Excel
  - [ ] Audit trail view

### Phase 6: Testing & Data
- [ ] Create test data scripts
  - [ ] Various gas calculation scenarios (different pressures, temperatures)
  - [ ] Edge cases (p < 4 bar vs p >= 4 bar)
  - [ ] Multiple nota kecils per customer
  - [ ] Different customer locations
- [ ] Create test photos for OCR
  - [ ] Pressure bar meter photos
  - [ ] Temperature gauge photos
  - [ ] Gas meter reading photos (stan awal/akhir)
- [ ] Integration testing
  - [ ] Mobile app → Backend → Database flow
  - [ ] OCR accuracy testing
  - [ ] Gas calculation validation
  - [ ] Admin interface functionality

### Phase 7: Documentation & Deployment
- [ ] API documentation
  - [ ] Endpoint specifications
  - [ ] Request/response examples
  - [ ] Error codes and handling
- [ ] User documentation
  - [ ] Driver mobile app guide
  - [ ] Admin interface guide
  - [ ] Gas calculation explanation
- [ ] Database documentation
  - [ ] Schema explanation
  - [ ] Migration procedures
  - [ ] Backup procedures

## 🔄 Data Flow
```
Mobile App → Photo Upload → OCR Processing → Gas Calculation → 
Driver Review → Confirmation → Database Storage → Admin Table View
```

## 📊 Gas Calculation Variables
| Variable | Description | Formula |
|----------|-------------|---------|
| **V** | Volume Gas (m³) | Final calculated volume for billing |
| **Vt** | Volume from Meter (m³) | `stan_akhir - stan_awal` |
| **p** | Gas Pressure (Bar) | `tekanan_operasi` from OCR |
| **t** | Gas Temperature (°C) | `temperatur_operasi` from OCR |
| **k** | Super Compressibility Factor | `p < 4: 1 + (0.0002 * p)`<br>`p >= 4: [FPV]²` |

## 🎯 Success Criteria
- [ ] Drivers can upload 4 photos and get automatic OCR extraction
- [ ] Gas calculations are accurate and match manual calculations
- [ ] Admin can view all nota kecils in table format per customer
- [ ] Complete audit trail from photo upload to final billing
- [ ] Mobile app provides smooth user experience
- [ ] System handles edge cases and errors gracefully

---
**Status**: Driver Flow 95% Complete ✅  
**Next Step**: Complete confirmation API endpoint to save nota kecil data to database

## 🎯 Current Status Summary

### ✅ COMPLETED
- **Database Schema**: `nota_kecils` table with all gas calculation fields
- **Backend Services**: Gas calculation service with real formulas
- **OCR Integration**: Real OpenAI GPT-4 Vision API processing
- **Mobile App**: Complete driver interface with photo capture, OCR processing, and gas calculations
- **API Endpoints**: Individual photo OCR processing working perfectly

### 🔄 IN PROGRESS
- **Confirmation API**: Need to implement the save/confirm endpoint to store nota kecil data

### ⏳ REMAINING
- **Admin Web Interface**: Table view for displaying nota kecils per customer
- **Testing & Documentation**: Comprehensive testing and user guides
