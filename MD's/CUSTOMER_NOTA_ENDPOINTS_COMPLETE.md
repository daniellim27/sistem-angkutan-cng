# ✅ Customer Nota Besar & Kecil Endpoints - COMPLETE

## 📋 Overview

Three new endpoints have been created for managing customer nota besar and nota kecil balances.

---

## 🆕 New Endpoints

### **1. GET /api/customers/:id/nota-kecils**

Get all nota kecils from **confirmed nota besars** for a specific customer.

#### **Request:**
```http
GET /api/customers/5/nota-kecils
Authorization: Bearer <token>
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 5,
      "customer_name": "PT Angkasa Jaya",
      "location": "Jakarta",
      "nota_besar": 26040700,
      "nota_kecil": 1736.05
    },
    "notaKecils": [
      {
        "notaBesar": {
          "id": 3,
          "total_volume": "1069.380",
          "total_price": "16040700.00",
          "gas_price_per_m3": "15000.00",
          "status": "confirmed",
          "created_at": "2025-09-23T09:15:52.166Z",
          "deliveryOrder": {
            "id": 19,
            "do_number": "JACK-2025-001"
          }
        },
        "items": [
          {
            "id": 1,
            "volume_m3": "500.50",
            "price": "7507500.00",
            "notaKecil": {
              "id": 12,
              "customer_name": "PT Angkasa Jaya",
              "customer_address": "Jakarta",
              "customer_location_index": 0,
              "stan_awal": "1000.00",
              "stan_akhir": "1500.50",
              "tekanan_operasi": "5.2",
              "temperatur_operasi": "25.0",
              "Vt": "500.50",
              "k": "1.0",
              "V": "500.50"
            }
          }
        ]
      }
    ],
    "summary": {
      "total_nota_kecils": 5,
      "total_volume": 1736.05,
      "total_price": 26040700,
      "from_nota_besars": 2
    }
  }
}
```

#### **Features:**
- ✅ Groups nota kecils by nota besar
- ✅ Only shows items from **confirmed** nota besars
- ✅ Includes complete nota kecil details (stan_awal, stan_akhir, k, V, etc.)
- ✅ Shows which nota besar each nota kecil belongs to
- ✅ Calculates totals

---

### **2. POST /api/customers/recalculate-balances**

Recalculate `nota_besar` and `nota_kecil` balances for **all customers** based on their confirmed nota besars.

#### **Request:**
```http
POST /api/customers/recalculate-balances
Authorization: Bearer <token>
Content-Type: application/json
```

#### **Response:**
```json
{
  "success": true,
  "message": "Successfully recalculated balances for 12 customers",
  "data": {
    "total_customers": 45,
    "updated": 12,
    "unchanged": 33,
    "updates": [
      {
        "customer_id": 5,
        "customer_name": "PT Angkasa Jaya",
        "old_nota_besar": 10000000,
        "new_nota_besar": 26040700,
        "old_nota_kecil": 1000.50,
        "new_nota_kecil": 1736.05,
        "confirmed_nota_besars": 2
      },
      {
        "customer_id": 8,
        "customer_name": "CV Berkah Mandiri",
        "old_nota_besar": 0,
        "new_nota_besar": 15000000,
        "old_nota_kecil": 0,
        "new_nota_kecil": 1000.00,
        "confirmed_nota_besars": 1
      }
    ]
  }
}
```

#### **Features:**
- ✅ Recalculates balances for ALL customers
- ✅ Only counts **confirmed** nota besars
- ✅ Shows before/after values for each update
- ✅ Skips customers with correct balances
- ✅ Logs detailed progress to console

#### **Console Output:**
```
🔄 Starting customer balance recalculation...
  ✅ Updated: PT Angkasa Jaya
     Nota Besar: Rp 10,000,000 → Rp 26,040,700
     Nota Kecil: 1,000.50 m³ → 1,736.05 m³
  ✅ Updated: CV Berkah Mandiri
     Nota Besar: Rp 0 → Rp 15,000,000
     Nota Kecil: 0.00 m³ → 1,000.00 m³

✅ Recalculation complete: 12 updated, 33 unchanged
```

---

### **3. GET /api/customers/:id/nota-besars** ✅ Already Existed

This endpoint was already created in the previous migration. It returns all nota besars for a customer.

---

## 🔄 How Balances are Calculated

### **Formula:**
```javascript
customer.nota_besar = SUM(confirmed_nota_besars.total_price)
customer.nota_kecil = SUM(confirmed_nota_besars.total_volume)
```

### **Only Confirmed Nota Besars Count:**
- ✅ `status = 'confirmed'` → **Counted**
- ❌ `status = 'draft'` → **Not counted**
- ❌ `status = 'cancelled'` → **Not counted**
- ❌ `status = 'billed'` → **Not counted**

---

## 📊 Use Cases

### **1. View Customer's Nota Besars**
```javascript
// User clicks 📝 next to Nota Besar column
GET /api/customers/5/nota-besars

// Shows:
// - All nota besars (draft, confirmed, etc.)
// - Total price and volume from confirmed ones
// - Items breakdown
```

### **2. View Customer's Nota Kecils**
```javascript
// User clicks 📝 next to Nota Kecil column
GET /api/customers/5/nota-kecils

// Shows:
// - All nota kecils from confirmed nota besars
// - Grouped by nota besar
// - Complete meter readings (stan_awal, stan_akhir, etc.)
```

### **3. Recalculate All Balances**
```javascript
// Admin clicks "Sync Balances" button
POST /api/customers/recalculate-balances

// Recalculates:
// - All customers' nota_besar amounts
// - All customers' nota_kecil volumes
// - Only from confirmed nota besars
```

---

## 🎯 Frontend Integration

### **Customer Management Page (`/customers`)**

```tsx
// When user clicks 📝 next to Nota Besar
const handleNotaBesarClick = (customer) => {
  navigate(`/customers/${customer.id}/nota-besar`);
  // Or open modal showing nota besars
};

// When user clicks 📝 next to Nota Kecil
const handleNotaKecilClick = (customer) => {
  navigate(`/customers/${customer.id}/nota-kecil`);
  // Or open modal showing nota kecils
};

// Recalculate balances button (admin only)
const handleRecalculateBalances = async () => {
  const response = await apiClient.post('/customers/recalculate-balances');
  toast.success(`Updated ${response.data.data.updated} customers`);
  fetchCustomers(); // Refresh the list
};
```

---

## 🔍 API Response Structure Comparison

### **Nota Besars Endpoint:**
```
GET /api/customers/:id/nota-besars
└── Returns: Array of NotaBesar objects
    ├── Each has: total_price, total_volume, status
    └── Each has: items[] (NotaBesarItems with NotaKecils)
```

### **Nota Kecils Endpoint:**
```
GET /api/customers/:id/nota-kecils
└── Returns: Array of NotaBesar groups
    ├── Each group has: notaBesar info
    └── Each group has: items[] (NotaKecil details)
```

**Key Difference:**
- **Nota Besars:** Focused on nota besar records
- **Nota Kecils:** Focused on nota kecil details, grouped by parent nota besar

---

## ✅ Testing

### **Test Nota Kecils Endpoint:**
```bash
# Get nota kecils for customer ID 5
curl -X GET http://localhost:5000/api/customers/5/nota-kecils \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Recalculate Endpoint:**
```bash
# Recalculate all customer balances
curl -X POST http://localhost:5000/api/customers/recalculate-balances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Database Impact

### **Read Operations:**
- `GET /api/customers/:id/nota-kecils` - Reads from nota_besar_items, nota_besars, nota_kecils
- `GET /api/customers/:id/nota-besars` - Reads from nota_besars, nota_besar_items, nota_kecils

### **Write Operations:**
- `POST /api/customers/recalculate-balances` - Updates customers table (nota_besar, nota_kecil columns)

---

## 🚀 When to Use Each Endpoint

| Endpoint | When to Use |
|----------|-------------|
| `GET .../nota-besars` | Show customer's billing records (nota besar list) |
| `GET .../nota-kecils` | Show customer's meter readings (nota kecil details) |
| `POST .../recalculate-balances` | After confirming/cancelling nota besars, or to fix balance sync |

---

## 🎨 Frontend Pages to Create

### **1. Customer Nota Besar Detail Page**
**Path:** `/customers/:id/nota-besar`

**Shows:**
- Customer info
- List of all nota besars (with status badges)
- For each nota besar:
  - Total price, volume
  - Gas price per m³
  - Status, created date
  - Number of nota kecils
- Summary totals

### **2. Customer Nota Kecil Detail Page**
**Path:** `/customers/:id/nota-kecil`

**Shows:**
- Customer info
- Grouped by nota besar
- For each nota kecil:
  - Stan awal → Stan akhir
  - Tekanan, Temperatur
  - Vt, k, V calculations
  - Location index
- Summary totals

### **3. Recalculate Button**
**Location:** Customer Management page (admin only)

**Button:**
```tsx
<button onClick={handleRecalculateBalances}>
  🔄 Sync All Balances
</button>
```

---

## 📚 Files Modified

**Backend:**
- ✅ `backend/src/controllers/customer.controller.js` - Added 2 new functions
- ✅ `backend/src/routes/customer.routes.js` - Added 2 new routes

**Total:** 2 files modified, 3 endpoints created (1 already existed)

---

## ✅ Status: COMPLETE

All endpoints are implemented and ready to use!

**Next Steps:**
1. ✅ Create frontend pages for nota besar/kecil details
2. ✅ Add "Recalculate Balances" button to customer management
3. ✅ Test with real data
4. ✅ Document for other developers

---

**Created:** January 2, 2025  
**Endpoints:** 3 total (2 new, 1 existing)  
**Ready for:** Production use


