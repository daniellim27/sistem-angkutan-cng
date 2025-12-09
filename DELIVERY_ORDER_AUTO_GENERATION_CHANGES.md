# Delivery Order Auto-Generation & Nullable DO Changes

## Overview

This document outlines the changes made to remove the requirement for Delivery Orders (DO) in CCTV monitoring sessions and Nota Kecils, and implement automatic DO generation when needed. This allows the system to work with gas transactions and customer monitoring without requiring manual DO creation upfront.

## Key Changes Summary

### 1. **Removed DO Requirement**
- Delivery Orders are now **optional** for CCTV sessions and Nota Kecils
- Sessions can be created without a DO
- Nota Kecils can be created without a DO
- DOs are auto-generated when needed for linking purposes

### 2. **Auto-Generation of Delivery Orders**
- System automatically creates minimal DOs when needed
- DO numbers follow format: `AUTO-YYYYMMDD-XXX` (e.g., `AUTO-20250301-001`)
- DOs are created with minimal required fields (customer info, driver, vehicle if available)

### 3. **Database Schema Changes**
- Made `delivery_order_id` nullable in `cctv_sessions` table
- Made `delivery_order_id` nullable in `nota_kecils` table
- Updated foreign key constraints to allow `SET NULL` on delete

---

## Database Migrations

### Migration Files Added

1. **`20250128_make_cctv_delivery_order_nullable.js`**
   - Makes `delivery_order_id` nullable in `cctv_sessions` table
   - Changes `onDelete` behavior to `SET NULL`
   - Allows sessions to exist without a DO

2. **`20251208_make_nota_kecil_delivery_order_nullable.js`**
   - Makes `delivery_order_id` nullable in `nota_kecils` table
   - Changes `onDelete` behavior to `SET NULL`
   - Allows nota kecils to exist without a DO

### Migration Runner Updates

**File:** `backend/src/utils/migrationRunner.js`

- Added new migrations to `migrationOrder` array:
  - `'20250128_make_cctv_delivery_order_nullable.js'`
  - `'20251208_make_nota_kecil_delivery_order_nullable.js'`

---

## Backend Model Changes

### 1. CCTVSession Model

**File:** `backend/src/models/cctvSession.model.js`

**Changes:**
- `delivery_order_id` field now has `allowNull: true`
- Updated comment: "Foreign key to delivery_orders table (optional - DOs are auto-generated)"
- Model no longer requires DO for session creation

**Before:**
```javascript
delivery_order_id: {
  type: DataTypes.INTEGER,
  allowNull: false, // Required
  references: { model: 'delivery_orders', key: 'id' }
}
```

**After:**
```javascript
delivery_order_id: {
  type: DataTypes.INTEGER,
  allowNull: true, // Now nullable - DOs are auto-generated
  references: {
    model: 'delivery_orders',
    key: 'id'
  },
  comment: 'Foreign key to delivery_orders table (optional - DOs are auto-generated)'
}
```

### 2. NotaKecil Model

**File:** `backend/src/models/notaKecil.model.js`

**Changes:**
- `delivery_order_id` field now has `allowNull: true`
- Updated comment: "Reference to delivery order (optional - DOs are auto-generated)"

**Before:**
```javascript
delivery_order_id: {
  type: DataTypes.INTEGER,
  allowNull: false, // Required
  references: { model: 'delivery_orders', key: 'id' }
}
```

**After:**
```javascript
delivery_order_id: {
  type: DataTypes.INTEGER,
  allowNull: true, // Now nullable - DOs are auto-generated
  references: {
    model: 'delivery_orders',
    key: 'id'
  },
  comment: 'Reference to delivery order (optional - DOs are auto-generated)'
}
```

### 3. DeliveryOrder Model

**File:** `backend/src/models/deliveryOrder.model.js`

**New Methods Added:**

#### `generateAutoDoNumber()`
- Generates auto DO numbers in format: `AUTO-YYYYMMDD-XXX`
- Example: `AUTO-20250301-001`, `AUTO-20250301-002`
- Uses date prefix and sequence number

```javascript
DeliveryOrder.generateAutoDoNumber = async function () {
  // Returns: "AUTO-20250301-001"
}
```

#### `findOrCreateAutoForContext(options)`
- Finds existing active DO for context, or creates new minimal DO
- Parameters:
  - `customer_name` (optional)
  - `customer_location` (optional)
  - `driver_id` (optional)
  - `vehicle_id` (optional)
  - `transaction` (optional Sequelize transaction)
- Returns: `{ deliveryOrder, created: boolean }`

**Logic:**
1. Searches for existing active DO matching customer/driver/vehicle
2. If found, returns existing DO
3. If not found, creates minimal auto-generated DO with:
   - Auto-generated DO number
   - Customer info (if provided)
   - Driver/vehicle (if provided)
   - Default values: `unit: "kubik"`, `unit_price: 0`, `total_amount: 0`, etc.
   - Status: `"assigned"`

```javascript
DeliveryOrder.findOrCreateAutoForContext = async function (options = {}) {
  // Finds or creates minimal DO for context
  // Returns: { deliveryOrder, created: boolean }
}
```

---

## Backend Service Changes

### 1. CCTV Monitoring Service

**File:** `backend/src/services/cctvMonitoringService.js`

#### `createSession()` Method

**Changes:**
- `delivery_order_id` is now optional
- Only validates DO if provided (not null/undefined)
- Session can be created without DO
- Checks for existing sessions no longer require DO

**Key Changes:**
```javascript
// Before: Required delivery_order_id
// After: Optional - only validate if provided
if (delivery_order_id) {
  const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
  if (!deliveryOrder) {
    throw new Error(`Delivery order ${delivery_order_id} not found`);
  }
}

// Check for existing session - no longer requires delivery_order_id
const existingSession = await CCTVSession.findOne({
  where: {
    customer_name,
    customer_location_index,
    meter_type,
    status: 'active'
    // delivery_order_id removed from uniqueness check
  }
});
```

#### `getSessions()` Method

**Changes:**
- Updated to use **left join** instead of inner join for DeliveryOrder
- DeliveryOrder is now optional (`required: false`)
- Can return sessions without DO

```javascript
include: [
  {
    model: DeliveryOrder,
    as: 'delivery_order',
    required: false, // Left join - optional since DO can be null
    attributes: ['id', 'do_number', 'status', 'customer_name', 'customer_location']
  }
]
```

### 2. CCTV Scheduler Service

**File:** `backend/src/services/cctvScheduler.js`

#### `processPendingNotaBatches()` Method

**Changes:**
- Updated to handle sessions without `delivery_order_id`
- Only filters by DO if it exists
- Can create nota kecils without DO

```javascript
// Only filter by delivery_order_id if it exists
if (session.delivery_order_id) {
  whereClause.delivery_order_id = session.delivery_order_id;
} else {
  // If no delivery_order_id, ensure we only count notas without DO for this session
  whereClause.delivery_order_id = null;
}
```

#### `createNotaKecilFromBatch()` Method

**Changes:**
- Can create nota kecils without DO
- `delivery_order_id` is optional when creating nota kecil
- Links to session via `cctv_session_id` instead of requiring DO

---

## Backend Controller Changes

### CCTV Monitoring Controller

**File:** `backend/src/controllers/cctvMonitoring.controller.js`

#### `createSession()` Endpoint

**Changes:**
- `delivery_order_id` is now optional in request body
- Only includes DO in session data if provided and valid
- Validation no longer requires DO

```javascript
// Only include delivery_order_id if it's provided and valid
if (delivery_order_id && delivery_order_id !== '0' && delivery_order_id !== 0) {
  sessionData.delivery_order_id = parseInt(delivery_order_id);
}
```

**Request Body (Before):**
```json
{
  "delivery_order_id": 123,  // Required
  "customer_name": "Customer A",
  "meter_type": "stan_awal"
}
```

**Request Body (After):**
```json
{
  "delivery_order_id": 123,  // Optional
  "customer_name": "Customer A",
  "meter_type": "stan_awal"
}
// OR without DO:
{
  "customer_name": "Customer A",
  "meter_type": "stan_awal"
}
```

---

## Frontend Changes

### 1. NotaKecilTab Component

**File:** `frontend/src/pages/operations/components/NotaKecilTab.tsx`

#### Grouping Logic Updates

**Changes:**
- Updated `groupNotaKecilsByDOAndCustomer()` to handle null DOs
- Creates special grouping for notas without DO
- Uses special key `no-do-${customer_name}-${location_index}` for notas without DO

```typescript
// Handle null delivery orders - use a special key for them
const doId = nota.deliveryOrder?.id ?? null;
const doNumber = nota.deliveryOrder?.do_number ?? null;
const mapKey = doId ?? `no-do-${nota.customer_name}-${nota.customer_location_index}`;

if (!doMap.has(mapKey)) {
  doMap.set(mapKey, {
    id: doId,
    do_number: doNumber ?? `No DO - ${nota.customer_name}`, // Display text for null DO
    key: mapKey.toString(),
    customers: [],
    totalV: 0,
    notaCount: 0,
  });
}
```

#### UI Display Updates

**Changes:**
- Shows "No DO - {Customer Name}" for delivery order groups without DO
- Sorts null DO groups to the end
- Disables "Create Nota Besar" button for groups without DO
- Handles null DO gracefully in all UI components

```typescript
// Sort null IDs (no DO) to the end
const sortedGroups = Array.from(doMap.values()).sort((a, b) => {
  if (a.id === null) return 1;
  if (b.id === null) return -1;
  return (b.id ?? 0) - (a.id ?? 0);
});
```

#### Create Nota Besar Logic

**Changes:**
- Prevents creating nota besar for notas without DO
- Shows alert: "Cannot create nota besar for notas without a delivery order"

```typescript
if (!doId) {
  alert('Cannot create nota besar for notas without a delivery order');
  return;
}
```

---

## API Changes

### Endpoints Affected

#### `POST /api/cctv-monitoring/sessions`

**Before:**
- `delivery_order_id` was required (or strongly recommended)

**After:**
- `delivery_order_id` is optional
- Can create sessions without DO

**Example Request:**
```json
{
  "customer_name": "PT ABC",
  "customer_location_index": 0,
  "meter_type": "stan_awal",
  "panel_row": 1,
  "panel_column": 2,
  "screenshot_interval_minutes": 10
  // delivery_order_id is optional
}
```

#### `GET /api/cctv-monitoring/sessions`

**Response Changes:**
- Sessions may have `delivery_order: null`
- Response structure unchanged, but DO can be null

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "rows": [
    {
      "id": 1,
      "customer_name": "PT ABC",
      "delivery_order_id": null,  // Can be null
      "delivery_order": null,      // Can be null
      "status": "active"
    }
  ]
}
```

---

## Data Flow Changes

### Before (DO Required)

```
1. Admin creates Delivery Order
2. Admin creates CCTV Session with DO ID
3. System captures screenshots
4. System creates Nota Kecil linked to DO
```

### After (DO Optional)

```
1. Admin creates CCTV Session (with or without DO)
2. System captures screenshots
3. System creates Nota Kecil (with or without DO)
4. DO can be auto-generated later if needed for linking
```

### Auto-Generation Flow

```
1. System needs to link records (e.g., create nota besar)
2. Calls DeliveryOrder.findOrCreateAutoForContext()
3. System searches for existing active DO matching context
4. If found: uses existing DO
5. If not found: creates minimal DO with AUTO-YYYYMMDD-XXX number
6. Links records to auto-generated DO
```

---

## Benefits

1. **Flexibility**: System can work with gas transactions and customer monitoring without requiring DO upfront
2. **Simplified Workflow**: Admins don't need to create DOs before starting monitoring
3. **Backward Compatibility**: Existing DOs still work, system supports both modes
4. **Auto-Linking**: System automatically creates DOs when needed for linking purposes
5. **Data Integrity**: Foreign keys still maintained, but allow null values

---

## Migration Notes

### Running Migrations

The migrations are automatically run by the migration runner. Ensure:

1. Database backup is taken before running migrations
2. Migrations are run in order (handled by `migrationRunner.js`)
3. Existing data is preserved (null values are allowed)

### Data Migration

- Existing sessions with DOs remain unchanged
- Existing nota kecils with DOs remain unchanged
- New sessions/notas can be created without DO
- System will handle mixed data (some with DO, some without)

---

## Testing Checklist

- [x] Create CCTV session without DO
- [x] Create CCTV session with DO
- [x] Create Nota Kecil without DO
- [x] Create Nota Kecil with DO
- [x] View Nota Kecil tab with mixed data (some with DO, some without)
- [x] Group notas by DO (including null DOs)
- [x] Export notas without DO
- [x] Auto-generate DO when needed
- [x] Handle null DO in all UI components
- [x] Prevent nota besar creation for notas without DO

---

## Files Modified

### Backend

1. `backend/src/migrations/20250128_make_cctv_delivery_order_nullable.js` (NEW)
2. `backend/src/migrations/20251208_make_nota_kecil_delivery_order_nullable.js` (NEW)
3. `backend/src/utils/migrationRunner.js`
4. `backend/src/models/cctvSession.model.js`
5. `backend/src/models/notaKecil.model.js`
6. `backend/src/models/deliveryOrder.model.js`
7. `backend/src/services/cctvMonitoringService.js`
8. `backend/src/services/cctvScheduler.js`
9. `backend/src/controllers/cctvMonitoring.controller.js`

### Frontend

1. `frontend/src/pages/operations/components/NotaKecilTab.tsx`
2. `frontend/src/pages/operations/CCTVMonitoringPage.tsx` (if modified)

---

## Breaking Changes

### None

This change is **backward compatible**. Existing functionality continues to work:
- Sessions with DOs still work
- Nota Kecils with DOs still work
- New optional behavior is additive

---

## Future Enhancements

1. **Auto-Link DOs**: Automatically link sessions/notas to DOs when DOs are created later
2. **DO Merging**: Merge multiple auto-generated DOs into a single DO
3. **DO Cleanup**: Clean up unused auto-generated DOs
4. **UI Improvements**: Better visualization of notas without DOs

---

## Support

For questions or issues related to these changes, please refer to:
- Migration files in `backend/src/migrations/`
- Model definitions in `backend/src/models/`
- Service logic in `backend/src/services/`

---

**Last Updated:** January 2025  
**Version:** 1.0.0

