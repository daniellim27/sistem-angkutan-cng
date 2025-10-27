# Receipt Image 404 Error Fix

## Problem
Receipt images were returning 404 errors when trying to display them in the mobile app.

**Error:**
```
Request URL: http://localhost:8081/uploads/receipts/receipt_1761191972142.jpg
Status Code: 404 Not Found
```

## Root Cause

The backend returns **relative URLs** for uploaded images:
```
/uploads/receipts/receipt_1761191972142.jpg
```

However, the mobile app (running on Expo) was trying to load these images from the **Expo dev server** (`http://localhost:8081`) instead of the **backend server** (`http://localhost:3000` or `http://192.168.100.27:3000`).

### Why This Happened

1. **Backend returns relative path**: `/uploads/receipts/receipt_xxx.jpg`
2. **Mobile app uses it directly**: `<Image source={{ uri: '/uploads/receipts/...' }} />`
3. **React Native interprets relative URL**: Tries to fetch from current origin (Expo server)
4. **Result**: 404 because Expo server doesn't have these images

## Solution

Created a helper function `getImageUrl()` that converts relative paths to full URLs using the backend base URL.

### Implementation

**1. Added Backend Base URL Constant** (`mobile/src/services/api.js`):
```javascript
// Backend base URL for static files (without /api suffix)
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');
```

**2. Created Helper Function** (`mobile/src/services/api.js`):
```javascript
// Helper function to get full image URL
export const getImageUrl = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath; // Already a full URL
  return `${BACKEND_BASE_URL}${relativePath}`;
};
```

**3. Updated Image Component** (`mobile/components/ReceiptList.tsx`):
```javascript
// Before (BROKEN):
<Image source={{ uri: selectedReceipt.receipt_photo_url }} />

// After (FIXED):
<Image source={{ uri: getImageUrl(selectedReceipt.receipt_photo_url) }} />
```

## How It Works

### URL Transformation Examples:

**Input**: `/uploads/receipts/receipt_1761191972142.jpg`  
**Output**: `http://192.168.100.27:3000/uploads/receipts/receipt_1761191972142.jpg`

**Input**: `http://example.com/image.jpg` (already full URL)  
**Output**: `http://example.com/image.jpg` (unchanged)

**Input**: `null` or `undefined`  
**Output**: `null`

### Environment Handling

The helper function works across different environments:

**Development (Local)**:
- API_BASE_URL: `http://192.168.100.27:3000/api`
- BACKEND_BASE_URL: `http://192.168.100.27:3000`
- Result: `http://192.168.100.27:3000/uploads/receipts/receipt_xxx.jpg`

**Development (ngrok)**:
- API_BASE_URL: `https://abc123.ngrok-free.app/api`
- BACKEND_BASE_URL: `https://abc123.ngrok-free.app`
- Result: `https://abc123.ngrok-free.app/uploads/receipts/receipt_xxx.jpg`

**Production**:
- API_BASE_URL: `https://api.yourapp.com/api`
- BACKEND_BASE_URL: `https://api.yourapp.com`
- Result: `https://api.yourapp.com/uploads/receipts/receipt_xxx.jpg`

## Files Modified

1. **`mobile/src/services/api.js`**
   - Added `BACKEND_BASE_URL` constant
   - Created and exported `getImageUrl()` helper function

2. **`mobile/components/ReceiptList.tsx`**
   - Imported `getImageUrl`
   - Updated `<Image>` component to use `getImageUrl()`

## Backend Configuration

The backend is already configured to serve static files correctly:

```javascript
// backend/src/server.js
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
```

This serves files from the `backend/uploads/` directory at the `/uploads` route.

## Usage in Other Components

Any component that needs to display uploaded images should use this helper:

```javascript
import { getImageUrl } from '../src/services/api';

// In your component:
<Image source={{ uri: getImageUrl(someRelativePath) }} />
```

### Examples:

**Surat Jalan Photos**:
```javascript
<Image source={{ uri: getImageUrl(trip.surat_jalan_photo_url) }} />
```

**Documentation Photos**:
```javascript
<Image source={{ uri: getImageUrl(photo.photo_url) }} />
```

**Receipt Photos**:
```javascript
<Image source={{ uri: getImageUrl(receipt.receipt_photo_url) }} />
```

## Testing

✅ **Verified Working**:
- Receipt images load correctly in detail modal
- Works on local development environment
- Works with ngrok tunnels
- Handles null/undefined gracefully
- Doesn't break existing full URLs

## Best Practices

1. **Always use `getImageUrl()` for backend images**: Never use relative paths directly in `<Image>` components
2. **Check for null**: The helper already handles null/undefined, but good to check before rendering
3. **Full URLs are preserved**: If backend ever returns full URLs, they work unchanged

## Related Files

- Backend image serving: `backend/src/server.js`
- Receipt image saving: `backend/src/services/receiptOcrService.js`
- Image display: `mobile/components/ReceiptList.tsx`

---
**Date Fixed**: October 23, 2025  
**Issue**: 404 errors when loading receipt images  
**Resolution**: Created `getImageUrl()` helper to convert relative paths to full URLs



