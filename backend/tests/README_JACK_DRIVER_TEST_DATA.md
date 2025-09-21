# Jack Driver Test Data

This document describes the specific test data created for Jack Driver (`jack_driver`) to populate the `/api/delivery-orders/me` endpoint for mobile app testing.

## Files

### Core Test Data Scripts
- `insert_jack_driver_test_data.js` - Creates Jack Driver specific delivery orders
- `cleanup_jack_driver_test_data.js` - Cleans up Jack Driver specific test data

## Jack Driver Account

### Login Credentials
- **Username**: `jack_driver`
- **Password**: `jack123`
- **Role**: `driver`
- **Full Name**: Jack Driver
- **Status**: `available`

## Delivery Orders Created

Jack has **6 delivery orders** with various statuses and realistic scenarios:

### 1. **Active Delivery Order** (1 order)
- **JACK-2025-001**: PT Gas Jakarta Selatan
  - **Status**: `at_unload_location`
  - **Payment**: `awaiting_confirmation`
  - **Item**: LPG 12kg (120 kubik)
  - **Location**: Jakarta Selatan
  - **Created**: 2 hours ago
  - **Current**: Driver at destination, awaiting completion

### 2. **Completed Deliveries** (4 orders)
- **JACK-2025-002**: CV Gas Tangerang Express
  - **Status**: `completed`
  - **Payment**: `lunas` (transfer)
  - **Item**: CNG Compressed (46 kubik)
  - **Completed**: 4 hours ago

- **JACK-2025-003**: UD Gas Depok Mandiri
  - **Status**: `completed`
  - **Payment**: `lunas` (cash)
  - **Item**: LPG 50kg (31 kubik)
  - **Completed**: 15 minutes ago (most recent)

- **JACK-2025-004**: PT Gas Bekasi Sukses
  - **Status**: `completed`
  - **Payment**: `lunas` (transfer)
  - **Item**: CNG Compressed (36 kubik)
  - **Completed**: 8 hours ago

- **JACK-2025-005**: CV Gas Bogor Raya
  - **Status**: `completed`
  - **Payment**: `lunas` (cash)
  - **Item**: LPG 12kg (82 kubik)
  - **Completed**: 24 hours ago (long distance)

### 3. **Cancelled Order** (1 order)
- **JACK-2025-006**: PT Gas Karawang (Cancelled)
  - **Status**: `cancelled`
  - **Payment**: `awaiting_confirmation`
  - **Item**: LPG 50kg (25 kubik)
  - **Created**: 48 hours ago

## Key Features for Mobile Testing

### Realistic Timeline
- **Most Recent**: Completed delivery 15 minutes ago
- **Active**: Currently at unload location (2 hours ago)
- **Recent Completions**: Multiple completed deliveries in the last 24 hours
- **Historical**: Cancelled order from 2 days ago

### Financial Data
- **Trip Allowance**: Ranges from 180,000 to 350,000 IDR
- **Driver Salary**: Ranges from 110,000 to 200,000 IDR
- **Unit Prices**: 12,500 - 16,000 IDR per kubik
- **Payment Types**: Both cash and transfer payments

### Location Data
- **Load Locations**: Depot Gas LPG Cibitung, SPBG Cibitung (Bekasi)
- **Destinations**: Jakarta Selatan, Tangerang, Depok, Bekasi, Bogor, Karawang
- **Real Coordinates**: Actual latitude/longitude for all locations

### Status Progression
- **Completed Orders**: Full timestamp progression from departure to completion
- **Active Order**: Currently at unload location with partial timestamps
- **Cancelled Order**: Only creation timestamp

### Gas Volume & SPBG Data
- **Gas Types**: Both LPG and CNG deliveries
- **Volume Range**: 25 - 120 kubik
- **SPBG Locations**: Real SPBG names
- **Calculation Method**: JISDOR pricing

## API Endpoint Testing

### `/api/delivery-orders/me?t=1758425382451`
This endpoint should return Jack's delivery orders with:
- **Authentication**: Requires Jack's JWT token
- **Filtering**: Orders filtered by Jack's driver_id
- **Sorting**: Orders sorted by creation date (most recent first)
- **Status Variety**: Mix of active, completed, and cancelled orders

### Expected Response Structure
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "do_number": "JACK-2025-003",
      "do_name": "Pengiriman Gas LPG ke Depok - Standard",
      "customer_name": "UD Gas Depok Mandiri",
      "status": "completed",
      "payment_status": "lunas",
      "created_at": "2025-09-21T03:19:04.438Z",
      "completed_at": "2025-09-21T08:19:04.438Z",
      // ... other fields
    },
    // ... more orders
  ],
  "pagination": {
    "total": 6,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Usage

### Insert Jack's Test Data
```bash
node backend/tests/insert_jack_driver_test_data.js
```

### Clean Up Jack's Test Data
```bash
node backend/tests/cleanup_jack_driver_test_data.js
```

## Mobile App Testing Scenarios

### 1. **Driver Dashboard**
- Display current active delivery (JACK-2025-001)
- Show recent completed deliveries
- Display earnings summary

### 2. **Delivery History**
- List all 6 delivery orders
- Filter by status (active, completed, cancelled)
- Sort by date (most recent first)

### 3. **Order Details**
- View active order details with location and timing
- Review completed order summaries
- Check payment status and amounts

### 4. **Status Updates**
- Test status progression for active orders
- Verify timestamp updates
- Test completion workflow

### 5. **Payment Tracking**
- View payment status for each order
- Track completed payments (lunas)
- Monitor pending confirmations

## Database Schema Impact

The test data populates the `delivery_orders` table with:
- **Driver Association**: All orders linked to Jack's user_id (7)
- **Vehicle Assignment**: Orders distributed across available vehicles
- **Status Constraints**: Respects unique constraints (one active order per driver)
- **Timeline Data**: Realistic timestamps for testing time-based features

This comprehensive test data provides realistic scenarios for testing Jack Driver's mobile app experience with a mix of active, completed, and cancelled delivery orders spanning multiple days.
