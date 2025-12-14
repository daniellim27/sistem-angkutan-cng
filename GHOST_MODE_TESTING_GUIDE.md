# Ghost Mode Testing Guide

## ✅ Implementation Complete

### Backend Endpoints Created:
1. **GET `/api/tracking/proximity/spbg`** - Check proximity to SPBG (200m threshold)
2. **POST `/api/gas-transactions`** - Submit gas transaction (fire-and-forget)

### Mobile UI Created:
1. **Ghost Mode Screen** (`mobile/app/(tabs)/ghost-mode.tsx`) - Full screen map with proximity detection
2. **Gas Filling Form** (`mobile/app/gas-filling-form.tsx`) - 3-step camera form

---

## 🧪 Testing Instructions

### 1. Test Proximity Endpoint

**Endpoint:** `GET /api/tracking/proximity/spbg`

**Required Headers:**
```
Authorization: Bearer <your_token>
```

**Query Parameters:**
- `latitude` (required): Your latitude (e.g., -6.2088)
- `longitude` (required): Your longitude (e.g., 106.8456)

**Example Request (using curl):**
```bash
curl -X GET "http://localhost:3000/api/tracking/proximity/spbg?latitude=-6.2088&longitude=106.8456" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response (when within 200m):**
```json
{
  "success": true,
  "data": {
    "isNear": true,
    "distance": 150,
    "nearestSpbg": {
      "id": 1,
      "spbg_name": "SPBG Rawu",
      "spbg_location": "SPBG Rawu, Jakarta",
      "latitude": -6.2088,
      "longitude": 106.8456
    },
    "threshold": 200
  }
}
```

**Expected Response (when > 200m):**
```json
{
  "success": true,
  "data": {
    "isNear": false,
    "distance": 500,
    "nearestSpbg": {
      "id": 1,
      "spbg_name": "SPBG Rawu",
      "spbg_location": "SPBG Rawu, Jakarta",
      "latitude": -6.2088,
      "longitude": 106.8456
    },
    "threshold": 200
  }
}
```

**Testing Steps:**
1. Get your authentication token (login as driver)
2. Use Postman/Insomnia or curl to test the endpoint
3. Test with coordinates near an SPBG (< 200m) - should return `isNear: true`
4. Test with coordinates far from SPBG (> 200m) - should return `isNear: false`

---

### 2. Test Gas Transactions Endpoint

**Endpoint:** `POST /api/gas-transactions`

**Required Headers:**
```
Authorization: Bearer <your_token>
Content-Type: multipart/form-data
```

**Form Data Fields:**
- `surat_jalan_photo` (file, required): Photo of Surat Jalan
- `nota_photo` (file, required): Photo of Nota
- `biaya_lain_photo` (file, optional): Photo of additional expenses
- `volume_m3` (string, required): Gas volume in m³ (e.g., "100")
- `calculation_method` (string, required): "jisdor" or "fixed"
- `rate_per_m3` (string, required): Rate per m³ (e.g., "16364.42")
- `jisdor_rate` (string, optional): JISDOR rate if method is "jisdor"
- `total_cost` (string, required): Total cost (e.g., "1636442")
- `biaya_lain_amount` (string, optional): Additional expenses amount
- `biaya_lain_description` (string, optional): Additional expenses description

**Example Request (using curl):**
```bash
curl -X POST "http://localhost:3000/api/gas-transactions" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "surat_jalan_photo=@/path/to/surat_jalan.jpg" \
  -F "nota_photo=@/path/to/nota.jpg" \
  -F "volume_m3=100" \
  -F "calculation_method=jisdor" \
  -F "rate_per_m3=16364.42" \
  -F "jisdor_rate=16364.42" \
  -F "total_cost=1636442"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Gas transaction submitted successfully",
  "data": {
    "id": 1,
    "status": "pending"
  }
}
```

**Testing Steps:**
1. Prepare test images (Surat Jalan and Nota photos)
2. Use Postman/Insomnia to test the endpoint
3. Verify the transaction is created in the database (check `gas_transactions` table)
4. Status should be "pending" (will be approved later by admin)

---

### 3. Test Mobile Ghost Mode UI

**Prerequisites:**
- Mobile app running
- Location permissions granted
- Driver account logged in

**Testing Steps:**

1. **Open Ghost Mode Screen:**
   - Should see full-screen map
   - Your current location should be visible
   - Map should center on your location

2. **Test Proximity Detection:**
   - Move to a location within 200m of an SPBG
   - Wait 10 seconds (proximity checks every 10 seconds)
   - "ISI GAS" button should animate in
   - Distance indicator should show distance

3. **Test ISI GAS Button:**
   - Tap "ISI GAS" button when it appears
   - Should navigate to gas filling form

4. **Test Gas Filling Form:**
   - Step 1: Take photo of Surat Jalan
   - Step 2: Take photo of Nota, fill in volume and rate
   - Step 3: Optionally add Biaya Lain
   - Submit form
   - Should show success message and return to map

---

### 4. Verify Nota OCR

**Status:** ✅ Already implemented

**Location:** `backend/src/services/ocrService.js`

**Function:** `processNotaImage(imageBuffer, options)`

**Features:**
- Uses OpenAI GPT-4 Vision (or GPT-5-mini)
- Extracts: stan_awal, current_stan, pressure_inlet, pressure_outlet, temperature
- Returns structured JSON with confidence scores

**Testing:**
- OCR is already integrated in the mobile app via `NotaKecilUploader` component
- Can be tested by uploading a nota photo in the mobile app
- OCR results are displayed in the UI

---

## 🔍 Database Verification

After testing, verify data in database:

```sql
-- Check gas transactions
SELECT * FROM gas_transactions ORDER BY created_at DESC LIMIT 5;

-- Check proximity data (via driver_locations)
SELECT * FROM driver_locations ORDER BY timestamp DESC LIMIT 10;
```

---

## 🐛 Troubleshooting

### Proximity endpoint returns 401:
- Check authentication token is valid
- Ensure token is included in Authorization header

### ISI GAS button doesn't appear:
- Check location permissions are granted
- Verify you're within 200m of an SPBG
- Check browser console for errors
- Verify SPBG has coordinates in database

### Gas transaction submission fails:
- Check all required fields are provided
- Verify images are valid JPEG files
- Check server logs for detailed error messages
- Ensure driver_id is set (from token)

### Map doesn't load:
- Check location permissions
- Verify expo-location is installed
- Check network connectivity

---

## 📝 Notes

- Proximity check runs every 10 seconds automatically
- Gas transactions are fire-and-forget (no balance check)
- Transactions start as "pending" status
- Admin must approve transactions later
- Nota OCR uses OpenAI API (requires API key)

