# OCR Test - Command Line Testing

## Using cURL to Test OCR Processing

You can test the OCR functionality using cURL commands. Here are examples:

### 1. Test OCR Processing (No Delivery Order Required)

```bash
curl -X POST \
  http://localhost:3000/api/ocr/test-process \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "image=@/path/to/your/nota-image.jpg"
```

### 2. Test with Different Image Formats

```bash
# JPG Image
curl -X POST \
  http://localhost:3000/api/ocr/test-process \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "image=@nota.jpg"

# PNG Image  
curl -X POST \
  http://localhost:3000/api/ocr/test-process \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "image=@nota.png"
```

### 3. Expected Response Format

```json
{
  "success": true,
  "message": "OCR test processing completed successfully",
  "data": {
    "extracted_data": {
      "tanggal_mulai": "2025-01-17 10:00:00",
      "tanggal_selesai": "2025-01-17 11:00:00",
      "stan_awal": 1250.5,
      "stan_akhir": 1280.3,
      "tekanan_operasi": 2.5,
      "temperatur_operasi": 25,
      "harga_satuan": 15000,
      "total_harga": 450000,
      "confidence": 85,
      "overall_confidence": 87,
      "extracted_at": "2025-01-17T12:00:00.000Z",
      "raw_data": { ... }
    },
    "billing_calculation": {
      "success": true,
      "volume_calculation": {
        "result": {
          "calculated_volume_m3": 104.071,
          "meter_difference": 29.8,
          "pressure_bar": 2.5,
          "temperature_celsius": 25,
          "compressibility_factor": 1.0005,
          "calculation_method": "ocr_formula",
          "calculated_at": "2025-01-17T12:00:00.000Z"
        }
      },
      "summary": {
        "final_volume_m3": 104.071,
        "unit_price": 15000,
        "total_amount": 1561065,
        "calculation_method": "ocr_automated",
        "processed_at": "2025-01-17T12:00:00.000Z"
      }
    },
    "image_url": "/uploads/ocr/nota-1737123456789-123456789.jpg",
    "test_mode": true
  }
}
```

### 4. Data Mapping (MTR|PRSSR|TEMPT Format)

The OCR extracts data in the format you requested:

- **MTR (Meter Reading)**: 
  - `stan_awal`: Starting meter reading
  - `stan_akhir`: Ending meter reading  
  - Difference: `stan_akhir - stan_awal`

- **PRSSR (Pressure)**: 
  - `tekanan_operasi`: Operational pressure in Bar

- **TEMPT (Temperature)**: 
  - `temperatur_operasi`: Operational temperature in Celsius

### 5. Error Handling

If OCR fails, you'll get an error response:

```json
{
  "success": false,
  "message": "OCR test processing failed",
  "error": "OCR processing failed: OpenAI API key not configured"
}
```

### 6. Getting Auth Token

You can get an auth token by logging in through your frontend or API:

```bash
# Login to get token
curl -X POST \
  http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'
```

## Testing Steps

1. **Start your backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Prepare a gas station receipt image** (JPG/PNG format)

3. **Test with cURL**:
   ```bash
   curl -X POST \
     http://localhost:3000/api/ocr/test-process \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -F "image=@your-nota-image.jpg"
   ```

4. **Check the response** for extracted MTR|PRSSR|TEMPT data

## Notes

- The test endpoint doesn't require a delivery order ID
- Images are stored in `backend/uploads/ocr/` directory
- OCR processing uses OpenAI GPT-4 Vision API
- Billing calculation is performed automatically if all required data is extracted
- The system extracts exactly the MTR|PRSSR|TEMPT data you need for billing
