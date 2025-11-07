# Receipt OCR Route Fix - 404 Error Resolution

## Problem
The receipt OCR endpoints were returning 404 errors even though:
- Routes were properly registered in `server.js`
- Authentication middleware was working (token was being decoded)
- User was successfully authenticated

## Root Cause
**Route Conflict**: The parameterized route `GET /:doId` was potentially conflicting with other routes like `/upload`.

In Express.js, route order matters. When you have:
```javascript
router.get('/:doId', handler);  // This catches ANY GET request
router.post('/upload', handler); // This is fine (different HTTP method)
```

The issue was that the generic `/:doId` pattern could interfere with route resolution.

## Solution Applied

### 1. Changed Route Path
**Before:**
```javascript
router.get('/:doId', verifyToken, receiptOcrController.getReceiptsByDo);
```

**After:**
```javascript
router.get('/do/:doId', verifyToken, receiptOcrController.getReceiptsByDo);
```

### 2. Reordered Routes
Routes are now ordered from most specific to least specific:
1. `/upload` (POST) - specific path
2. `/confirm` (POST) - specific path
3. `/receipt/:id` (GET) - more specific with prefix
4. `/:id/edit` (PUT) - specific pattern
5. `/:id/verify` (PUT) - specific pattern
6. `/:id` (DELETE) - specific pattern
7. `/do/:doId` (GET) - moved to end with prefix

### 3. Updated Mobile API
Changed the mobile API call to match the new route:

**Before:**
```javascript
return await apiClient.get(`/receipt-ocr/${deliveryOrderId}`);
```

**After:**
```javascript
return await apiClient.get(`/receipt-ocr/do/${deliveryOrderId}`);
```

## Current Route Structure

All receipt OCR routes now properly authenticated with `verifyToken`:

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/receipt-ocr/upload` | Upload receipt photo | Driver |
| POST | `/api/receipt-ocr/confirm` | Confirm receipt data | Driver |
| GET | `/api/receipt-ocr/receipt/:id` | Get specific receipt | Driver/Admin |
| PUT | `/api/receipt-ocr/:id/edit` | Edit receipt data | Driver |
| PUT | `/api/receipt-ocr/:id/verify` | Verify receipt | Admin only |
| DELETE | `/api/receipt-ocr/:id` | Delete receipt | Driver/Admin |
| GET | `/api/receipt-ocr/do/:doId` | Get receipts by DO | Driver/Admin |

## Files Modified

1. **`backend/src/routes/receiptOcr.js`**
   - Changed route path from `/:doId` to `/do/:doId`
   - Reordered routes for better specificity

2. **`mobile/src/services/api.js`**
   - Updated `getReceiptsForDO` to use `/receipt-ocr/do/${deliveryOrderId}`

## Testing
To test the endpoints with authentication:
```bash
# Get auth token first
POST http://localhost:3000/api/auth/login
{
  "username": "jack_driver",
  "password": "password"
}

# Then use the token in subsequent requests
POST http://localhost:3000/api/receipt-ocr/upload
Headers: { "Authorization": "Bearer <token>" }
Body: FormData with receipt_photo
```

## Best Practices Applied
1. ✅ More specific routes before generic parameterized routes
2. ✅ Consistent authentication middleware on all protected routes
3. ✅ Role-based access control for admin-only endpoints
4. ✅ Clear route naming with prefixes to avoid conflicts
5. ✅ Proper error handling with multer middleware

---
**Date Fixed**: October 23, 2025
**Issue**: 404 errors on receipt OCR endpoints
**Resolution**: Route conflict resolved by adding prefix to parameterized route




