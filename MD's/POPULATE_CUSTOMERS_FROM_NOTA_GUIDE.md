# 👥 Populate Customers from Nota Management

## 📋 Overview

This script extracts all unique customers from your **Nota Management** (nota_kecils table) and populates them into the **Customers** table. This is useful for:

1. **Initial Setup:** Populate customers page from existing nota data
2. **Syncing:** Ensure all customers from notas are in the customers table
3. **Data Migration:** Prepare customers before nota besar migration

---

## 🚀 How to Run

### **Quick Run:**

```bash
cd backend
node src/scripts/populate_customers_from_nota.js
```

### **With Environment Variables:**

```bash
# Set your database credentials
export DB_HOST=localhost
export DB_PORT=5435
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=angkutan_db

# Run the script
node src/scripts/populate_customers_from_nota.js
```

---

## 📊 What It Does

### **Step 1: Extract Customers**
- Finds all **unique customer names** from `nota_kecils` table
- Uses `customer_name` and `customer_address` fields
- Counts how many nota kecils each customer has

### **Step 2: Create Customers**
- Checks if customer already exists (case-insensitive)
- **Creates new customer** if doesn't exist:
  - `customer_name` → from nota kecil
  - `location` → from customer_address (or "Unknown Location")
  - `nota_besar` → 0 (initially, calculated in step 3)
  - `nota_kecil` → 0 (initially, calculated in step 3)
- **Skips** if customer already exists
- **Skips** invalid/empty customer names

### **Step 3: Calculate Balances** ⭐ NEW
- For customers who have **confirmed nota besars**:
  - Calculates `nota_besar` = SUM(confirmed nota_besars.total_price)
  - Calculates `nota_kecil` = SUM(confirmed nota_besars.total_volume)
  - Updates the customer balances
- Shows detailed balance for each customer

### **Step 4: Summary Report**
- Shows how many customers were created vs existing
- Lists all customers in database
- Shows top 10 customers with their balances

---

## 📝 Expected Output

```
🚀 Starting customer population from Nota Management...

📊 Step 1: Extracting unique customers from nota_kecils...
   Found 45 unique customers in nota_kecils

👥 Step 2: Creating/updating customers...

   ✅ Created: PT Angkasa Jaya (12 nota kecils)
   ✅ Created: CV Berkah Mandiri (8 nota kecils)
   ℹ️  Exists:  PT Global Energy (5 nota kecils)
   ✅ Created: UD Sejahtera (15 nota kecils)
   ...

📈 Summary:
   ✅ Created:  30 new customers
   ℹ️  Existing: 15 customers already in database
   ⚠️  Skipped:  0 invalid entries
   📊 Total:    45 unique customer names found

💰 Step 3: Calculating balances for customers with nota besars...

   💵 PT Angkasa Jaya:
      Nota Besar: Rp 7,507,500
      Nota Kecil: 500.50 m³

   💵 CV Berkah Mandiri:
      Nota Besar: Rp 15,000,000
      Nota Kecil: 1,000.00 m³

   💵 UD Sejahtera:
      Nota Besar: Rp 22,500,000
      Nota Kecil: 1,500.00 m³

   ✅ Updated balances for 12 customers with nota besars

📋 Current Customers in Database:

   Total customers in database: 45

   Top 10 customers:
   1. CV Berkah Mandiri
      Location: Jakarta Selatan
      Nota Besar: Rp 15,000,000
      Nota Kecil: 1,000.00 m³
      Created: 02/01/2025

   2. PT Angkasa Jaya
      Location: Tangerang
      Nota Besar: Rp 7,507,500
      Nota Kecil: 500.50 m³
      Created: 02/01/2025
   
   ... and 35 more customers

✅ Customer population completed successfully!

🎉 Done! All customers from Nota Management have been populated.

📝 Next steps:
   1. Check the customers in your database
   2. Visit /customers page to see all customers
   3. Run nota besar migration if needed
```

---

## ✅ Success Criteria

The script was successful if:

- ✅ All unique customer names from nota_kecils are in customers table
- ✅ No duplicate customers created
- ✅ Customer names match exactly (trimmed, case-preserved)
- ✅ Locations are populated (from customer_address or "Unknown Location")
- ✅ Balances calculated correctly for customers with confirmed nota besars
- ✅ Customers without nota besars have balances = 0

---

## 🔍 Verification

### **Check Customers Created:**

```sql
-- Count customers
SELECT COUNT(*) as total_customers FROM customers;

-- List all customers
SELECT 
  id,
  customer_name,
  location,
  nota_besar,
  nota_kecil,
  created_at
FROM customers
ORDER BY customer_name;

-- Compare with nota_kecils
SELECT 
  COUNT(DISTINCT customer_name) as unique_customers_in_notas
FROM nota_kecils
WHERE customer_name IS NOT NULL AND customer_name != '';

-- Should match the total_customers above

-- Check balances calculated correctly
SELECT 
  c.customer_name,
  c.nota_besar as customer_balance,
  c.nota_kecil as customer_volume,
  COALESCE(SUM(nb.total_price), 0) as calculated_balance,
  COALESCE(SUM(nb.total_volume), 0) as calculated_volume
FROM customers c
LEFT JOIN nota_besars nb ON nb.customer_id = c.id AND nb.status = 'confirmed'
GROUP BY c.id, c.customer_name, c.nota_besar, c.nota_kecil
HAVING c.nota_besar != COALESCE(SUM(nb.total_price), 0) 
    OR c.nota_kecil != COALESCE(SUM(nb.total_volume), 0);

-- Should return 0 rows (all balances match)
```

### **Check for Duplicates:**

```sql
-- Find potential duplicate customers (case-insensitive)
SELECT 
  LOWER(TRIM(customer_name)) as normalized_name,
  COUNT(*) as count,
  STRING_AGG(customer_name, ', ') as variations
FROM customers
GROUP BY LOWER(TRIM(customer_name))
HAVING COUNT(*) > 1;

-- Should return 0 rows
```

---

## 🔄 Re-running the Script

It's **safe to re-run** this script multiple times:

- ✅ Won't create duplicates (checks if customer exists first)
- ✅ Won't overwrite existing customer data
- ✅ Only adds new customers that don't exist yet
- ✅ Case-insensitive matching prevents duplicates

**When to re-run:**
- After adding new nota kecils with new customers
- After cleaning up customer names in nota_kecils
- To verify all customers are synced

---

## ⚙️ Configuration

### **Database Connection:**

The script uses these environment variables:

```bash
DB_HOST=localhost       # Default: localhost
DB_PORT=5435           # Default: 5435
DB_NAME=angkutan_db    # Default: angkutan_db
DB_USER=postgres       # Default: postgres
DB_PASSWORD=getsuga39  # Default: getsuga39
```

Override them as needed:

```bash
DB_PORT=5432 node src/scripts/populate_customers_from_nota.js
```

---

## ⚠️ Important Notes

### **1. Customer Names**
- Uses `customer_name` field from nota_kecils
- Trims whitespace
- Case-sensitive when creating, case-insensitive when checking duplicates
- Skips empty or null names

### **2. Locations**
- Uses `customer_address` from nota_kecils
- Falls back to "Unknown Location" if empty
- Can be updated later in customer management page

### **3. Balances Calculated Automatically**
- **For customers with confirmed nota besars:**
  - `nota_besar` = Sum of all confirmed nota besar prices
  - `nota_kecil` = Sum of all confirmed nota besar volumes
- **For customers without nota besars:**
  - `nota_besar` = 0
  - `nota_kecil` = 0
- **Only confirmed nota besars** are counted (status = 'confirmed')
- Draft, cancelled, or billed nota besars are excluded

---

## 🔗 Related Scripts

### **Full Migration (includes customer population):**

If you're doing the full nota besar migration:

```bash
# Step 1: Schema changes
node src/migrations/20250102_migrate_nota_besar_to_customer.js

# Step 2: Populate customers + link nota besars
node src/migrations/20250102_populate_customer_nota_data.js

# Step 3: Cleanup
node src/migrations/20250102_cleanup_spbg_from_nota_besar.js
```

The full migration already includes customer population, so you don't need to run this script separately if you're doing the full migration.

---

## 🐛 Troubleshooting

### **Issue: No customers found**

**Cause:** No customer_name in nota_kecils

**Solution:**
```sql
-- Check if nota_kecils have customer names
SELECT COUNT(*) FROM nota_kecils WHERE customer_name IS NOT NULL;
```

### **Issue: Duplicate customers created**

**Cause:** Different casing or whitespace in customer names

**Solution:**
```sql
-- Find and merge duplicates manually
SELECT customer_name, COUNT(*) 
FROM customers 
GROUP BY LOWER(TRIM(customer_name)) 
HAVING COUNT(*) > 1;
```

### **Issue: Wrong location**

**Cause:** customer_address in nota_kecils is incorrect or empty

**Solution:**
- Update locations in customer management page
- Or update customer_address in nota_kecils and re-run

---

## 📊 Example Use Cases

### **1. Initial Setup**
```bash
# Populate customers for the first time
node src/scripts/populate_customers_from_nota.js
```

### **2. After Adding New Notas**
```bash
# Sync new customers from recently added nota kecils
node src/scripts/populate_customers_from_nota.js
```

### **3. Before Nota Besar Migration**
```bash
# Ensure all customers exist before linking nota besars
node src/scripts/populate_customers_from_nota.js

# Then run full migration
node src/migrations/20250102_populate_customer_nota_data.js
```

---

## ✅ Next Steps After Running

1. **Verify customers:**
   ```sql
   SELECT * FROM customers ORDER BY customer_name;
   ```

2. **Visit customer page:**
   - Open your app → `/customers`
   - Check if all customers are listed
   - Verify names and locations

3. **Update locations (if needed):**
   - Edit customers in customer management page
   - Update incorrect or missing locations

4. **Run nota besar migration (optional):**
   - Link nota besars to customers
   - Calculate customer balances
   - See migration guide for details

---

**Script Location:** `backend/src/scripts/populate_customers_from_nota.js`  
**Run Time:** ~5-30 seconds (depending on data volume)  
**Database Impact:** INSERT only (no updates or deletes)  
**Reversibility:** Yes (just delete newly created customers)

