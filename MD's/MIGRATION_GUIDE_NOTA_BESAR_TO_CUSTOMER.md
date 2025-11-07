# 🔄 Migration Guide: Nota Besar from SPBG to Customer

## 📋 Pre-Migration Checklist

Before starting the migration, ensure:

- [ ] **Backup your database** (CRITICAL!)
- [ ] Backend server is stopped
- [ ] No active transactions or users on the system
- [ ] You have database admin access
- [ ] Node.js environment variables are configured

---

## 🚀 Migration Steps

### **Step 1: Backup Database**

```bash
# PostgreSQL backup
pg_dump -h localhost -p 5435 -U postgres -d angkutan_db > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Or use your database backup method
```

---

### **Step 2: Run Schema Migration**

This adds `customer_id`, `applied_to_customer`, and `applied_to_customer_at` columns to `nota_besars` table.

```bash
cd backend

# Run the schema migration
node src/migrations/20250102_migrate_nota_besar_to_customer.js
```

**Expected Output:**
```
🚀 Starting Nota Besar Customer migration...
Adding customer_id column to nota_besars...
Creating index on customer_id...
✅ Schema changes completed
⚠️  SPBG columns will be removed after data migration is complete
✅ Migration completed successfully
```

---

### **Step 3: Run Data Migration**

This populates customers from nota kecils, links nota besars to customers, and calculates balances.

```bash
# Run the data migration
node src/migrations/20250102_populate_customer_nota_data.js
```

**Expected Output:**
```
🚀 Starting Customer Nota Data Population...

📊 Step 1: Extracting unique customers from nota_kecils...
Found 45 unique customers in nota_kecils

👥 Step 2: Creating missing customers...
  ✅ Created: PT Angkasa Jaya
  ✅ Created: CV Berkah Mandiri
  ...
📈 Summary: 30 created, 15 already existed

🔗 Step 3: Linking nota_besars to customers...
Found 120 nota_besars to link
  Linked 10 nota_besars...
  Linked 20 nota_besars...
  ...
📊 Linking summary: 115 linked, 5 skipped

💰 Step 4: Calculating customer balances...
  💵 PT Angkasa Jaya: Rp 7,507,500 (500.50 m³)
  💵 CV Berkah Mandiri: Rp 15,000,000 (1,000.00 m³)
  ...
✅ Updated 45 customer balances

🎉 Data migration completed successfully!
```

---

### **Step 4: Verify Data**

Before proceeding, verify the migration was successful:

```sql
-- Check that all nota_besars have customer_id
SELECT COUNT(*) as unmapped_count 
FROM nota_besars 
WHERE customer_id IS NULL;
-- Should return 0

-- Check customer balances
SELECT 
  customer_name,
  nota_besar,
  nota_kecil
FROM customers
WHERE nota_besar > 0 OR nota_kecil > 0
ORDER BY customer_name;

-- Compare totals (should match)
SELECT 
  SUM(total_price) as total_nota_besar_from_table,
  (SELECT SUM(nota_besar) FROM customers) as total_from_customers
FROM nota_besars
WHERE status = 'confirmed';
```

---

### **Step 5: Cleanup SPBG Columns (IRREVERSIBLE!)**

⚠️ **WARNING: This step is IRREVERSIBLE!** Only proceed if Step 4 verification passed.

```bash
# Remove old SPBG columns
node src/migrations/20250102_cleanup_spbg_from_nota_besar.js
```

**Expected Output:**
```
🚀 Starting SPBG Cleanup...

🧹 Cleaning up SPBG-related columns from nota_besars...
✅ All nota_besars have customer_id assigned
Dropping SPBG-related indexes...
Dropping SPBG-related columns...
✅ SPBG columns removed successfully

✅ Cleanup completed successfully
📝 Nota Besar is now fully migrated to customer-based system
```

---

### **Step 6: Restart Backend**

```bash
# Development
npm run dev

# Production
pm2 restart backend
# or
npm run start
```

---

### **Step 7: Test Core Functionality**

1. **Create a new nota besar:**
   - Select nota kecils
   - Calculate nota besar
   - Verify customer is auto-created if doesn't exist
   - Verify `customer_id` is populated

2. **Confirm a nota besar:**
   - Change status to 'confirmed'
   - Check customer balances updated
   - Verify `applied_to_customer = true`
   - Verify `applied_to_customer_at` timestamp

3. **Cancel a nota besar:**
   - Change status to 'cancelled'
   - Check customer balances reversed
   - Verify `applied_to_customer = false`

4. **View customer nota besars:**
   - Visit `/customers`
   - Check balances display correctly
   - Test `GET /api/customers/:id/nota-besars` endpoint

5. **Check SPBG tagihan:**
   - Open SPBG tagihan modal
   - Verify nota besar data is removed
   - Verify totals recalculated correctly

---

## 🔙 Rollback Plan

If something goes wrong, use your database backup:

```bash
# Stop backend
pm2 stop backend

# Restore database
psql -h localhost -p 5435 -U postgres -d angkutan_db < backup_before_migration_YYYYMMDD_HHMMSS.sql

# Restart backend (on old code)
git checkout <previous-commit>
pm2 restart backend
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Customer not found" during linking

**Cause:** Nota kecil has no `customer_name` or mismatched name

**Solution:**
```sql
-- Find nota kecils without customer_name
SELECT id, delivery_order_id 
FROM nota_kecils 
WHERE customer_name IS NULL OR customer_name = '';

-- Update them manually or skip
```

---

### Issue 2: Balance mismatch

**Cause:** Nota besars with status other than 'confirmed' affecting calculation

**Solution:** Re-run balance calculation manually:
```sql
UPDATE customers SET 
  nota_besar = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM nota_besars
    WHERE customer_id = customers.id AND status = 'confirmed'
  ),
  nota_kecil = (
    SELECT COALESCE(SUM(nbi.volume_m3), 0)
    FROM nota_besar_items nbi
    JOIN nota_besars nb ON nbi.nota_besar_id = nb.id
    WHERE nb.customer_id = customers.id AND nb.status = 'confirmed'
  );
```

---

### Issue 3: Duplicate customers created

**Cause:** Case-sensitive or whitespace differences in customer names

**Solution:** Merge duplicates manually:
```sql
-- Find potential duplicates
SELECT customer_name, COUNT(*) 
FROM customers 
GROUP BY LOWER(TRIM(customer_name)) 
HAVING COUNT(*) > 1;

-- Merge (example)
UPDATE nota_besars 
SET customer_id = 1 
WHERE customer_id = 2;

DELETE FROM customers WHERE id = 2;
```

---

## 📊 Post-Migration Verification

Run these queries to ensure migration success:

```sql
-- 1. All nota_besars should have customer_id
SELECT 
  COUNT(*) FILTER (WHERE customer_id IS NULL) as without_customer,
  COUNT(*) FILTER (WHERE customer_id IS NOT NULL) as with_customer,
  COUNT(*) as total
FROM nota_besars;

-- 2. Customer balance totals should match
SELECT 
  (SELECT SUM(nota_besar) FROM customers) as customer_total,
  (SELECT SUM(total_price) FROM nota_besars WHERE status = 'confirmed') as nota_besar_total;

-- 3. Applied flags should match status
SELECT status, applied_to_customer, COUNT(*) 
FROM nota_besars 
GROUP BY status, applied_to_customer;
-- confirmed = TRUE, draft = FALSE, cancelled = FALSE

-- 4. No orphaned records
SELECT COUNT(*) as orphaned_count
FROM nota_besars nb
LEFT JOIN customers c ON nb.customer_id = c.id
WHERE nb.customer_id IS NOT NULL AND c.id IS NULL;
-- Should return 0
```

---

## ✅ Success Criteria

Migration is successful when:

- [ ] All nota_besars have `customer_id` (no NULL values)
- [ ] Customer balances match confirmed nota besar totals
- [ ] Applied flags match status correctly
- [ ] No orphaned records
- [ ] SPBG tagihan no longer shows nota besar data
- [ ] Customer management page shows correct balances
- [ ] New nota besars create/link to customers correctly
- [ ] Confirmation/cancellation updates customer balances

---

## 🆘 Support

If you encounter issues during migration:

1. **DO NOT** proceed to Step 5 (cleanup) if Steps 1-4 have issues
2. Keep database backup safe
3. Document any errors or unexpected behavior
4. Check application logs: `pm2 logs backend`
5. Verify database connection settings

---

## 📝 Migration Log Template

Keep track of your migration:

```
Migration Date: _______________
Database Backup Location: _______________
Performed By: _______________

Step 1 - Schema Migration: ⬜ Success  ⬜ Failed
Step 2 - Data Migration: ⬜ Success  ⬜ Failed
  - Customers Created: _____
  - Nota Besars Linked: _____
  - Balances Updated: _____
Step 3 - Verification: ⬜ Success  ⬜ Failed
Step 4 - Cleanup: ⬜ Success  ⬜ Failed  ⬜ Skipped
Step 5 - Testing: ⬜ Success  ⬜ Failed

Notes:
_____________________________________________
_____________________________________________
```

---

**Migration Duration:** ~10-30 minutes (depending on data volume)  
**Downtime Required:** Yes  
**Reversible:** Yes (before Step 5)  
**Risk Level:** Medium (with proper backup: Low)


