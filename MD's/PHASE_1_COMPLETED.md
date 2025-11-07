# Phase 1: Database Setup - COMPLETED ✅

## What We've Built

Phase 1 is now complete! We've created the database foundation for the CCTV monitoring system.

### Files Created

1. **`backend/src/models/cctvSession.model.js`** ✅
   - Defines the CCTV session model
   - Tracks monitoring sessions linked to delivery orders
   - Includes health status calculation methods
   - Fields: delivery_order_id, customer_name, device_id, status, timestamps, etc.

2. **`backend/src/models/cctvScreenshot.model.js`** ✅
   - Defines the screenshot model
   - Stores captured images with OCR results
   - Includes OCR status and confidence scores
   - Supports soft delete

3. **`backend/src/migrations/20250101_create_cctv_monitoring.js`** ✅
   - Migration script to create database tables
   - Creates `cctv_sessions` table
   - Creates `cctv_screenshots` table
   - Adds all necessary indexes
   - Includes rollback capability

4. **`backend/run_cctv_migration.js`** ✅
   - Helper script to run the migration easily
   - Supports both "up" and "down" commands

### Files Modified

1. **`backend/src/models/index.js`** ✅
   - Added CCTV model imports
   - Registered models in the db object
   - Defined relationships:
     - DeliveryOrder ↔ CCTVSession (1:N)
     - CCTVSession ↔ CCTVScreenshot (1:N)
     - NotaKecil ↔ CCTVSession (1:1)
     - User ↔ CCTVSession (1:N)

---

## Database Schema Created

### Table: `cctv_sessions`

Stores monitoring session information:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| delivery_order_id | INTEGER | FK to delivery_orders |
| customer_location_index | INTEGER | Location index in DO |
| customer_name | STRING | Customer name |
| device_id | STRING | BARDI device ID |
| bardi_session_token | TEXT | BARDI auth token |
| start_time | DATE | Session start time |
| end_time | DATE | Session end time |
| status | ENUM | active/completed/dead/stopped |
| total_screenshots_captured | INTEGER | Screenshot count |
| last_screenshot_at | DATE | Last capture time |
| session_notes | TEXT | Additional notes |
| created_nota_kecil_id | INTEGER | FK to nota_kecils |
| panel_row | INTEGER | BARDI panel row |
| panel_column | INTEGER | BARDI panel column |
| screenshot_interval_minutes | INTEGER | Capture interval (default: 10) |
| health_check_interval_minutes | INTEGER | Health check interval (default: 15) |
| created_by | INTEGER | FK to users |
| created_at | DATE | Record creation time |
| updated_at | DATE | Record update time |

**Indexes:**
- `idx_cctv_sessions_delivery_order`
- `idx_cctv_sessions_status`
- `idx_cctv_sessions_start_time`
- `idx_cctv_sessions_created_by`

---

### Table: `cctv_screenshots`

Stores captured screenshots and OCR results:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| session_id | INTEGER | FK to cctv_sessions |
| screenshot_url | STRING(500) | Image URL (Cloudinary) |
| cloudinary_public_id | STRING | Cloudinary ID |
| captured_at | DATE | Capture timestamp |
| sequence_number | INTEGER | Sequential number in session |
| ocr_status | ENUM | pending/processing/success/failed |
| ocr_result | JSONB | Extracted meter data |
| ocr_raw_response | JSONB | Full OCR response |
| ocr_confidence_score | FLOAT | Confidence (0-1) |
| ocr_processed_at | DATE | OCR processing time |
| ocr_error_message | TEXT | Error details |
| retry_count | INTEGER | Number of retries |
| is_deleted | BOOLEAN | Soft delete flag |
| notes | TEXT | Additional notes |
| created_at | DATE | Record creation time |
| updated_at | DATE | Record update time |

**Indexes:**
- `idx_cctv_screenshots_session_sequence`
- `idx_cctv_screenshots_captured_at`
- `idx_cctv_screenshots_ocr_status`
- `idx_cctv_screenshots_session_id`

---

## Relationships

```
delivery_orders (existing)
    ↓ 1:N
cctv_sessions (new)
    ↓ 1:N
cctv_screenshots (new)

nota_kecils (existing)
    ↓ 1:1
cctv_sessions (new)

users (existing)
    ↓ 1:N
cctv_sessions (new)
```

---

## Next Steps: Run the Migration

### Step 1: Verify Database Connection

Make sure your `backend/.env` file has correct database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=angkutan_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
```

### Step 2: Run the Migration

Navigate to the backend directory and run:

```bash
cd backend
node run_cctv_migration.js up
```

**Expected Output:**
```
==========================================
CCTV Monitoring Migration
==========================================

Testing database connection...
✓ Database connection established

Running migration UP (creating tables)...

Creating CCTV monitoring tables...
✓ cctv_sessions table created
✓ cctv_screenshots table created
✓ cctv_sessions indexes created
✓ cctv_screenshots indexes created
✅ CCTV monitoring migration completed successfully!

✅ Migration completed successfully!

You can now use the CCTV monitoring tables:
  - cctv_sessions
  - cctv_screenshots
```

### Step 3: Verify Tables in Database

Connect to your database and verify the tables:

```sql
-- List tables
\dt cctv_*

-- Check cctv_sessions structure
\d cctv_sessions

-- Check cctv_screenshots structure
\d cctv_screenshots

-- Verify they're empty (should return 0)
SELECT COUNT(*) FROM cctv_sessions;
SELECT COUNT(*) FROM cctv_screenshots;
```

---

## Testing the Models

You can test the models in Node.js REPL:

```javascript
// backend/test_models.js
require('dotenv').config();
const db = require('./src/models');

async function testModels() {
  try {
    // Test connection
    await db.sequelize.authenticate();
    console.log('✓ Database connected');
    
    // Test creating a session (will fail if no delivery order exists)
    const session = await db.CCTVSession.create({
      delivery_order_id: 1, // Must exist in your DB
      customer_location_index: 0,
      customer_name: 'Test Customer',
      device_id: 'TEST-DEVICE-001',
      status: 'active'
    });
    console.log('✓ Session created:', session.id);
    
    // Test health status method
    const healthStatus = session.getHealthStatus();
    console.log('✓ Health status:', healthStatus);
    
    // Clean up
    await session.destroy();
    console.log('✓ Test cleanup complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

testModels();
```

Run it:
```bash
node backend/test_models.js
```

---

## Rollback (If Needed)

If you need to undo the migration:

```bash
cd backend
node run_cctv_migration.js down
```

This will drop both tables and all their data.

---

## What's Next?

Now that the database is ready, we can move to **Phase 2**:

### Phase 2: Backend Services (Next)

1. **cctvMonitoringService.js** - Core business logic
   - Create/stop/restart sessions
   - Capture screenshots
   - Calculate health status
   - Session statistics

2. **meterOcrService.js** - OCR for meter readings
   - Extract meter readings
   - Parse pressure/temperature
   - Validate results
   - Calculate confidence

---

## Troubleshooting

### Error: "relation 'delivery_orders' does not exist"

The migration expects existing tables. Make sure your database has:
- `delivery_orders`
- `nota_kecils`
- `users`

### Error: "permission denied for table..."

Your database user needs permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Error: "type 'cctv_session_status' already exists"

The ENUM types already exist. Run the down migration first:
```bash
node run_cctv_migration.js down
node run_cctv_migration.js up
```

---

## Success Criteria ✅

Phase 1 is complete when:

- ✅ Models created (`cctvSession.model.js`, `cctvScreenshot.model.js`)
- ✅ Models registered in `index.js`
- ✅ Relationships defined
- ✅ Migration file created
- ⏳ Migration run successfully (YOUR NEXT STEP)
- ⏳ Tables verified in database

---

## Quick Commands Reference

```bash
# Run migration
cd backend
node run_cctv_migration.js up

# Verify in PostgreSQL
psql -U postgres -d angkutan_db
\dt cctv_*

# Rollback migration
node run_cctv_migration.js down

# Test models
node test_models.js
```

---

**Status**: Phase 1 code complete ✅ | Migration pending ⏳

**Next Step**: Run the migration and verify tables are created!

Then we'll move to Phase 2: Backend Services 🚀

