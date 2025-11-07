# CCTV Meter OCR - OpenAI Vision Implementation ✅

## Overview
Updated the meter OCR service to use **OpenAI GPT-4 Vision API** for intelligent meter reading extraction.

---

## What Changed

### Before ❌:
- Used OCR.space API (required separate API key)
- Or used mock data in development
- Failed with "OCR API key not configured"

### After ✅:
- Uses **OpenAI GPT-4 Vision API** (already configured)
- Intelligent extraction of meter readings
- Handles non-meter images gracefully
- Returns structured JSON data

---

## Implementation Details

### File: `backend/src/services/meterOcrService.js`

#### New OCR Method: `callOcrApi(imageUrl)`

**Uses OpenAI Vision API:**
```javascript
const response = await this.openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this CNG gas meter...' },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'high' }}
    ]
  }],
  max_tokens: 500,
  temperature: 0.1
});
```

**Prompt Instructs OpenAI to Extract:**
1. Meter Reading (volume in m³)
2. Pressure (in bar or psi)
3. Temperature (in °C or °F)
4. Flow Rate (in m³/h)
5. Timestamp from meter display

**Returns JSON:**
```json
{
  "meter_reading": 1234.56,
  "pressure": 205.3,
  "temperature": 28.5,
  "flow_rate": 15.2,
  "unit": "m³",
  "timestamp_on_meter": "2025-11-01 14:22:39",
  "raw_text": "All text visible on the meter"
}
```

**Handles Non-Meter Images:**
If the image is NOT a meter (e.g., login page, error, camera view without meter):
```json
{
  "meter_reading": null,
  "pressure": null,
  "temperature": null,
  "flow_rate": null,
  "unit": null,
  "timestamp_on_meter": null,
  "raw_text": "NOT A METER - This is a login page"
}
```

---

## How It Works

### 1. Screenshot Captured
```
Panel screenshot → Uploaded to Cloudinary → URL stored
```

### 2. OCR Processing (Automatic)
```javascript
Screenshot record created with ocr_status: 'pending'
  ↓
Background OCR processing triggered
  ↓
Call OpenAI Vision API with image URL
  ↓
OpenAI analyzes the image
  ↓
Returns structured meter data (JSON)
  ↓
Validate and save to database
  ↓
Update ocr_status: 'success' or 'failed'
```

### 3. Database Record
```sql
UPDATE cctv_screenshots SET
  ocr_status = 'success',
  ocr_result = {
    "meter_reading": 1234.56,
    "pressure": 205.3,
    "temperature": 28.5,
    "flow_rate": 15.2,
    ...
  },
  ocr_raw_response = {...},
  ocr_confidence_score = 0.92,
  ocr_processed_at = NOW()
WHERE id = screenshot_id;
```

---

## Configuration

### Required Environment Variable:
```bash
OPENAI_API_KEY=sk-proj-...
```

Already configured in `backend/.env` ✅

---

## OCR Status Flow

```
Screenshot captured
  ↓
ocr_status: 'pending'
  ↓
OCR processing starts
  ↓
  ├─ Success → ocr_status: 'success'
  │            ocr_result: {...meter data}
  │            ocr_confidence_score: 0.92
  │
  └─ Failed  → ocr_status: 'failed'
               ocr_error_message: "Error details"
```

---

## Benefits of OpenAI Vision

### 1. Intelligent Extraction ✅
- Understands context (knows what a meter looks like)
- Can handle various meter layouts
- Extracts structured data directly

### 2. Handles Edge Cases ✅
- Identifies non-meter images
- Returns null for missing data
- Provides descriptive raw_text

### 3. No Additional API Key ✅
- Uses existing OPENAI_API_KEY
- No need for separate OCR service

### 4. High Accuracy ✅
- GPT-4 Vision is highly accurate
- Can read distorted/blurry text
- Understands meter display formats

---

## Example OCR Results

### Successful Meter Reading:
```json
{
  "ocr_status": "success",
  "ocr_result": {
    "meter_reading": 2456.78,
    "pressure": 198.7,
    "temperature": 27.3,
    "flow_rate": 14.8,
    "unit": "m³",
    "timestamp_on_meter": "2025-11-01 14:22:39",
    "raw_text": "METER READING: 2456.78 m³\nPRESSURE: 198.7 bar\nTEMPERATURE: 27.3 °C..."
  },
  "ocr_confidence_score": 0.92,
  "ocr_processed_at": "2025-11-01T04:30:15.123Z"
}
```

### Non-Meter Image (e.g., Camera View Without Meter):
```json
{
  "ocr_status": "success",
  "ocr_result": {
    "meter_reading": null,
    "pressure": null,
    "temperature": null,
    "flow_rate": null,
    "unit": null,
    "timestamp_on_meter": null,
    "raw_text": "NOT A METER - This is a security camera view showing an indoor space"
  },
  "ocr_confidence_score": 0.1,
  "ocr_processed_at": "2025-11-01T04:30:15.123Z"
}
```

### OCR Failed:
```json
{
  "ocr_status": "failed",
  "ocr_result": null,
  "ocr_error_message": "OpenAI Vision OCR error: Invalid image URL",
  "ocr_processed_at": "2025-11-01T04:30:15.123Z"
}
```

---

## Testing

### 1. Capture Screenshot
```bash
POST /api/web/cctv-monitoring/sessions/1/capture
```

### 2. Check Docker Logs
```bash
docker logs angkutan_backend -f
```

**Expected Output:**
```
📸 Capturing screenshot...
✅ Screenshot uploaded successfully
🔍 Processing OCR for screenshot 6...
🔍 Processing meter OCR for image: https://res.cloudinary.com/...
🤖 Using OpenAI Vision API for meter OCR...
✅ OpenAI Vision API OCR completed
   Raw text: METER READING: 1234.56 m³...
✓ OCR processing completed successfully
```

### 3. Check Screenshot Record
```sql
SELECT 
  id,
  screenshot_url,
  ocr_status,
  ocr_result,
  ocr_confidence_score,
  ocr_error_message
FROM cctv_screenshots
WHERE id = 6;
```

---

## Error Handling

### Error 1: OpenAI API Key Missing
```json
{
  "ocr_status": "failed",
  "ocr_error_message": "OpenAI API key not configured. Skipping OCR processing."
}
```
**Solution:** Ensure `OPENAI_API_KEY` is set in `.env`

### Error 2: Invalid Image URL
```json
{
  "ocr_status": "failed",
  "ocr_error_message": "OpenAI Vision OCR error: Invalid URL"
}
```
**Solution:** Ensure screenshot was uploaded to Cloudinary successfully

### Error 3: OpenAI API Rate Limit
```json
{
  "ocr_status": "failed",
  "ocr_error_message": "OpenAI Vision OCR error: Rate limit exceeded"
}
```
**Solution:** Reduce screenshot frequency or upgrade OpenAI plan

---

## Cost Considerations

### OpenAI GPT-4 Vision Pricing:
- **Input**: $0.01 per 1K tokens (varies by detail level)
- **High detail images**: ~765 tokens per image
- **Estimated cost**: ~$0.008 per screenshot OCR

### For 100 Screenshots:
- Cost: ~$0.80
- Very reasonable for automated meter reading

---

## When OCR is Useful

### ✅ Use OCR When:
- Camera shows actual gas meter with digital display
- Need to extract volume, pressure, temperature readings
- Want automated billing/tracking

### ❌ Skip OCR When:
- Camera shows general area (no meter visible)
- Just monitoring presence/activity
- Meter readings not needed

**To disable OCR for specific sessions:**
```javascript
// In frontend or API call
POST /sessions/{id}/capture
{
  "processOcr": false  // Skip OCR for this capture
}
```

---

## Advantages Over Previous Implementation

| Feature | Old (OCR.space) | New (OpenAI Vision) |
|---------|-----------------|---------------------|
| API Key | Separate OCR_API_KEY | Uses OPENAI_API_KEY |
| Accuracy | Text-only OCR | Intelligent vision |
| Structure | Parse text manually | Returns structured JSON |
| Non-meter handling | Parse errors | Graceful detection |
| Cost | ~$5/1000 requests | ~$8/1000 requests |
| Setup | Additional API signup | Already configured ✅ |

---

## Future Enhancements

### 1. OCR Retry on Low Confidence
```javascript
if (confidence_score < 0.7) {
  // Retry with different parameters
  await retryWithEnhancements(imageUrl);
}
```

### 2. Historical Trend Analysis
```javascript
// Check if new reading makes sense compared to previous
const prevReading = previousScreenshot.ocr_result.meter_reading;
const newReading = currentScreenshot.ocr_result.meter_reading;

if (newReading < prevReading) {
  console.warn('⚠️ Meter reading decreased - possible OCR error');
}
```

### 3. Selective OCR (Cost Optimization)
```javascript
// Only process OCR every Nth screenshot
if (sequenceNumber % 5 === 0) {
  processOcr = true;  // Every 5th screenshot
}
```

---

## Summary

✅ **Implemented:**
- OpenAI GPT-4 Vision API integration
- Intelligent meter data extraction
- Structured JSON responses
- Graceful handling of non-meter images
- Automatic OCR processing enabled

✅ **Benefits:**
- No additional API keys needed
- Higher accuracy than text-only OCR
- Better error handling
- Detects when image is not a meter

⚠️ **Note:**
- OCR now processes automatically on screenshot capture
- Uses OpenAI tokens (check usage in OpenAI dashboard)
- Returns null values if no meter visible (expected for current setup)

---

**Status**: ✅ **OCR WITH OPENAI - READY**  
**Last Updated**: November 1, 2025

