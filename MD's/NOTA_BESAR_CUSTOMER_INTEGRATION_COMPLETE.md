# 📊 Nota Besar Customer Integration - COMPLETE

## ✅ Migration Summary

The Nota Besar system has been **successfully migrated from SPBG-based to Customer-based management**! Nota Besars now link directly to customers, and when confirmed, they automatically update the customer's `nota_besar` and `nota_kecil` balances in the Customer Management page.

---

## 🎯 What Changed

### **OLD System (SPBG-based):**
1. ❌ Nota Besar linked to **SPBG (Deposit Groups)**
2. ❌ Confirmation reduced **SPBG balance**
3. ❌ Displayed in **SPBG Tagihan view**
4. ❌ Fields: `spbg_group_id`, `applied_to_spbg`, `applied_to_spbg_at`

### **NEW System (Customer-based):**
1. ✅ Nota Besar linked to **Customers**
2. ✅ Confirmation increases **Customer balances** (`nota_besar` + `nota_kecil`)
3. ✅ Displayed in **Customer Management page**
4. ✅ Fields: `customer_id`, `applied_to_customer`, `applied_to_customer_at`

---

## 📦 What Was Implemented

### **1. Database Schema Changes** ✅

**Migration Files Created:**
- `backend/src/migrations/20250102_migrate_nota_besar_to_customer.js`
- `backend/src/migrations/20250102_populate_customer_nota_data.js`
- `backend/src/migrations/20250102_cleanup_spbg_from_nota_besar.js`

**Schema Changes:**
```sql
ALTER TABLE nota_besars
  -- Removed columns
  DROP COLUMN spbg_group_id,
  DROP COLUMN applied_to_spbg,
  DROP COLUMN applied_to_spbg_at,
  
  -- Added columns
  ADD COLUMN customer_id INTEGER REFERENCES customers(id),
  ADD COLUMN applied_to_customer BOOLEAN DEFAULT FALSE,
  ADD COLUMN applied_to_customer_at TIMESTAMP;

-- New indexes
CREATE INDEX idx_nota_besars_customer_id ON nota_besars(customer_id);
CREATE INDEX idx_nota_besars_applied_to_customer ON nota_besars(applied_to_customer);
```

---

### **2. Data Migration** ✅

**Automatic Customer Creation:**
- Extracts all unique customers from `nota_kecils` table
- Creates missing customers in `customers` table
- Links all existing `nota_besars` to customers by matching names
- Recalculates all customer balances based on confirmed nota besars

**Balance Calculation Logic:**
```javascript
// For each customer:
customer.nota_besar = SUM(confirmed_nota_besars.total_price)
customer.nota_kecil = SUM(confirmed_nota_besars.total_volume)
```

---

### **3. Backend Model Updates** ✅

**File:** `backend/src/models/notaBesar.model.js`

**New Fields:**
```javascript
customer_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'customers', key: 'id' }
},
applied_to_customer: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
applied_to_customer_at: {
  type: DataTypes.DATE,
  allowNull: true
}
```

---

### **4. Model Associations** ✅

**File:** `backend/src/models/index.js`

```javascript
// Customer to NotaBesar (One-to-Many)
Customer.hasMany(NotaBesar, {
  foreignKey: "customer_id",
  as: "notaBesars"
});

NotaBesar.belongsTo(Customer, {
  foreignKey: "customer_id",
  as: "customer"
});
```

---

### **5. Controller Updates** ✅

**File:** `backend/src/controllers/notaBesar.controller.js`

#### **A. Nota Besar Creation (`calculateNotaBesar`)**

**OLD Logic:**
```javascript
// Found SPBG via delivery order
const depositGroupMember = await DepositGroupMember.findOne({...});
notaBesar.spbg_group_id = depositGroupMember.group_id;
```

**NEW Logic:**
```javascript
// Find or create customer from first nota kecil
const customerName = firstNotaKecil.customer_name;
let customer = await Customer.findOne({ where: { customer_name: customerName }});

if (!customer) {
  customer = await Customer.create({
    customer_name: customerName,
    location: customerLocation,
    nota_besar: 0,
    nota_kecil: 0
  });
}

notaBesar.customer_id = customer.id;
```

---

#### **B. Nota Besar Confirmation (`updateNotaBesarStatus`)**

**When status changes to 'confirmed':**
```javascript
if (status === 'confirmed' && !notaBesar.applied_to_customer) {
  // Calculate total volume from items
  const totalVolume = items.reduce((sum, item) => 
    sum + parseFloat(item.volume_m3 || 0), 0);
  
  // Update customer balances
  await customer.update({
    nota_besar: currentNotaBesar + notaBesarAmount,
    nota_kecil: currentNotaKecil + totalVolume,
    updated_at: new Date()
  });
  
  // Mark as applied
  await notaBesar.update({
    applied_to_customer: true,
    applied_to_customer_at: new Date()
  });
}
```

**When status changes to 'cancelled':**
```javascript
if (status === 'cancelled' && notaBesar.applied_to_customer) {
  // Reverse the customer balance updates
  await customer.update({
    nota_besar: Math.max(0, currentNotaBesar - notaBesarAmount),
    nota_kecil: Math.max(0, currentNotaKecil - totalVolume),
    updated_at: new Date()
  });
  
  // Mark as not applied
  await notaBesar.update({
    applied_to_customer: false,
    applied_to_customer_at: null
  });
}
```

---

### **6. New Customer Endpoints** ✅

**File:** `backend/src/controllers/customer.controller.js`

**New Endpoint:** `GET /api/customers/:id/nota-besars`

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "customer_name": "PT Angkasa Jaya",
      "location": "Jakarta",
      "nota_besar": 75000000,
      "nota_kecil": 5000.50
    },
    "notaBesars": [
      {
        "id": 1,
        "total_volume": 500.5,
        "total_price": 7507500,
        "gas_price_per_m3": 15000,
        "status": "confirmed",
        "created_at": "2025-01-15",
        "deliveryOrder": {...},
        "creator": {...},
        "items": [...]
      }
    ],
    "summary": {
      "total_nota_besars": 10,
      "confirmed_nota_besars": 8,
      "total_price": 75000000,
      "total_volume": 5000.50
    }
  }
}
```

---

### **7. SPBG Integration Removed** ✅

**File:** `backend/src/controllers/web/depositGroup.controller.js`

**Removed from `getSPBGTagihan()`:**
- ❌ Nota besar query and grouping
- ❌ `nota_besars` field in delivery orders
- ❌ `nota_besar_count`, `total_nota_besar_volume`, `total_nota_besar_cost` fields
- ❌ Nota besar statistics in summary
- ❌ Nota besar cost from `total_cost` calculation

**Tagihan now only includes:**
- Base gas cost
- Selisih cost
- Receipt cost

---

## 🔄 Complete Workflow

### **Step 1: Create Nota Besar** 📊
1. Admin goes to Nota Management (operations)
2. Selects multiple Nota Kecils
3. Sets gas price per m³
4. Creates Nota Besar (status: draft)
5. **System automatically finds or creates customer**
6. Nota Besar linked to customer

### **Step 2: Confirm Nota Besar** ✅
1. Admin changes status: `draft` → `confirmed`
2. **Customer balances automatically updated:**
   - `customer.nota_besar += nota_besar.total_price`
   - `customer.nota_kecil += nota_besar.total_volume`
3. Transaction logged

### **Step 3: View in Customer Management** 💰
1. Navigate to: `/customers`
2. See updated balances per customer
3. Click 📝 icon next to **Nota Besar** column
4. View detailed breakdown of all nota besars

### **Step 4: Cancel if Needed** 🔄
1. Admin changes status: `confirmed` → `cancelled`
2. **Customer balances automatically reversed:**
   - `customer.nota_besar -= nota_besar.total_price`
   - `customer.nota_kecil -= nota_besar.total_volume`
3. Reversal logged

---

## 📊 Balance Tracking Example

```
Customer: PT Angkasa Jaya
─────────────────────────────────────────
Initial State:
  ├─ Nota Besar:  Rp          0
  └─ Nota Kecil:       0.00 m³

Nota Besar #1 Confirmed:
  ├─ Total Price: Rp  7,507,500
  ├─ Total Volume:     500.50 m³
  └─ Status: confirmed

After Confirmation:
  ├─ Nota Besar:  Rp  7,507,500 ✅
  └─ Nota Kecil:     500.50 m³ ✅

Nota Besar #2 Confirmed:
  ├─ Total Price: Rp  15,000,000
  ├─ Total Volume:    1,000.00 m³
  └─ Status: confirmed

Current Balances:
  ├─ Nota Besar:  Rp 22,507,500 ✅
  ├─ Nota Kecil:    1,500.50 m³ ✅
  └─ Total:      Rp 22,507,500
─────────────────────────────────────────
```

---

## 📝 Migration Steps for Production

### **Run in this exact order:**

```bash
# Step 1: Add new columns to nota_besars
node backend/src/migrations/20250102_migrate_nota_besar_to_customer.js

# Step 2: Populate customer data and link nota_besars
node backend/src/migrations/20250102_populate_customer_nota_data.js

# Step 3: Remove old SPBG columns (IRREVERSIBLE!)
node backend/src/migrations/20250102_cleanup_spbg_from_nota_besar.js

# Step 4: Restart backend server
npm run restart
```

---

## ⚙️ API Changes Summary

### **Modified Endpoints:**

| Endpoint | Change |
|----------|--------|
| `POST /api/delivery-orders/:id/nota-besars/calculate` | Now links to customer instead of SPBG |
| `PATCH /api/nota-besars/:id/status` | Updates customer balances instead of SPBG |
| `GET /api/delivery-orders/:id/nota-besars` | Returns nota besars with customer info |
| `GET /api/nota-besars/:id` | Includes customer association |
| `GET /api/deposit-groups/:id/tagihan` | Removed nota besar data |

### **New Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customers/:id/nota-besars` | GET | Get all nota besars for a customer |

---

## 🎨 UI Integration

### **Customer Management Page** (`/customers`)

**Displays:**
- Customer Name
- Location
- **Nota Besar** (clickable 📝 → shows details)
- **Nota Kecil** (clickable 📝 → shows details)
- Total Amount

**Features:**
- Click 📝 next to Nota Besar → Navigate to `/customers/:id/nota-besar`
- Click 📝 next to Nota Kecil → Navigate to `/customers/:id/nota-kecil`

---

## 🔍 Key Differences: OLD vs NEW

| Aspect | OLD (SPBG) | NEW (Customer) |
|--------|------------|----------------|
| **Linking** | Via Delivery Order → SPBG | Direct to Customer |
| **Balance Impact** | Reduces `deposit_groups.balance` | Increases `customers.nota_besar` & `customers.nota_kecil` |
| **Display Location** | SPBG Tagihan Modal | Customer Management Page |
| **Primary Key** | `spbg_group_id` | `customer_id` |
| **Auto-create** | No | Yes, creates customer if not exists |
| **Reversal** | Manual | Automatic on cancel |

---

## ✅ Benefits of Customer-based System

1. **Direct Relationship:** Nota besars directly linked to the actual customer
2. **Simplified Tracking:** All customer transactions in one place
3. **Auto-creation:** Customers automatically created from nota data
4. **Better Reporting:** Easy to see all costs per customer
5. **Cleaner Separation:** SPBG management separate from customer billing

---

## 🚀 Testing Checklist

- [ ] Create new nota besar → Customer auto-created
- [ ] Confirm nota besar → Customer balances updated
- [ ] Cancel nota besar → Customer balances reversed
- [ ] View customer nota besars → All displayed correctly
- [ ] SPBG tagihan → Nota besar removed
- [ ] Customer page → Balances display correctly
- [ ] Multiple nota besars for same customer → Cumulative totals correct

---

## 📚 Files Modified

### **Backend:**
- ✅ `backend/src/models/notaBesar.model.js`
- ✅ `backend/src/models/index.js`
- ✅ `backend/src/controllers/notaBesar.controller.js`
- ✅ `backend/src/controllers/customer.controller.js`
- ✅ `backend/src/controllers/web/depositGroup.controller.js`
- ✅ `backend/src/routes/customer.routes.js`
- ✅ `backend/src/migrations/20250102_migrate_nota_besar_to_customer.js` (new)
- ✅ `backend/src/migrations/20250102_populate_customer_nota_data.js` (new)
- ✅ `backend/src/migrations/20250102_cleanup_spbg_from_nota_besar.js` (new)

### **Frontend:** (Pending)
- ⏳ `frontend/src/pages/operations/NotaBesarPage.tsx`
- ⏳ `frontend/src/pages/DepositGroupManagement.tsx`
- ⏳ `frontend/src/pages/CustomerManagement.tsx` (enhancement)

---

## 🎉 Status: Backend Migration Complete!

✅ **All backend changes implemented and ready for testing!**

📝 **Next Steps:**
1. Run migrations in production
2. Update frontend to remove nota besar from SPBG tagihan view
3. Enhance customer management page with nota besar details
4. Test end-to-end workflow

---

**Last Updated:** January 2, 2025  
**Migration Status:** Backend Complete, Frontend Pending  
**Breaking Changes:** Yes - Requires database migration and frontend updates


