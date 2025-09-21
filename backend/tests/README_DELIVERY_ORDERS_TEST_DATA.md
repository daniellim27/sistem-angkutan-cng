# Delivery Orders Test Data

This directory contains comprehensive test data for delivery orders functionality, specifically designed for mobile app testing.

## Files

### Core Test Data Scripts
- `insert_delivery_orders_test_data.js` - Creates comprehensive delivery orders test data
- `cleanup_delivery_orders_test_data.js` - Cleans up delivery orders test data
- `run_all_test_data_with_delivery_orders.js` - Runs all test data including delivery orders

## What Gets Created

### Test Drivers (5 drivers)
- **Username Pattern**: `driver001` to `driver005`
- **Full Names**: "Driver driver001" to "Driver driver005"
- **Status**: All set to `available`
- **Profile Data**: Complete driver profiles with phone, address, ID card, SIM info

### Delivery Orders (8 orders)
The test data creates 8 delivery orders with various statuses to test different mobile app scenarios:

#### 1. Completed Orders (2)
- **DO-2025-001**: Gas LPG to Jakarta Pusat - Status: `completed`, Payment: `lunas`
- **DO-2025-002**: Gas CNG to Bandung - Status: `completed`, Payment: `lunas`

#### 2. In Progress Orders (2)
- **DO-2025-003**: Gas LPG to Tangerang - Status: `at_unload_location`, Payment: `awaiting_confirmation`
- **DO-2025-004**: Gas CNG to Depok - Status: `otw_to_unload_location`, Payment: `awaiting_confirmation`

#### 3. Newly Assigned Orders (3)
- **DO-2025-005**: Gas LPG to Bogor - Status: `at_spbu`, Payment: `awaiting_confirmation`
- **DO-2025-006**: Gas CNG to Bekasi - Status: `at_spbu`, Payment: `awaiting_confirmation`
- **DO-2025-007**: Gas LPG Multi-Location Jakarta - Status: `at_spbu`, Payment: `awaiting_confirmation`

#### 4. Cancelled Order (1)
- **DO-2025-008**: Gas LPG to Karawang - Status: `cancelled`, Payment: `awaiting_confirmation`

## Key Features Tested

### Location Data
- **Load Locations**: Depot Gas LPG Cibitung, SPBG Cibitung (Bekasi)
- **Unload Locations**: Various cities (Jakarta, Bandung, Tangerang, Depok, Bogor, Bekasi, Karawang)
- **Coordinates**: Real latitude/longitude coordinates for all locations
- **Multi-Location**: One order with multiple unload locations (DO-2025-007)

### Payment Statuses
- `lunas` (2 orders) - Completed and paid
- `awaiting_confirmation` (6 orders) - Pending payment confirmation

### Delivery Statuses
- `completed` (2 orders) - Fully completed deliveries
- `at_unload_location` (1 order) - Driver at destination
- `otw_to_unload_location` (1 order) - Driver en route to destination
- `at_spbu` (3 orders) - Driver at loading location
- `cancelled` (1 order) - Cancelled delivery

### Timestamp Data
- **Completed Orders**: Full timestamp progression from departure to completion
- **In Progress Orders**: Partial timestamps up to current status
- **New Orders**: Only creation timestamp

### Financial Data
- **Trip Allowance**: Operational costs (fuel, toll, etc.)
- **Driver Salary**: Internal payroll data
- **Ongkosan**: Profit margin (internal only)
- **Unit Prices**: Per-unit pricing for different gas types

## Usage

### Run Individual Script
```bash
# Insert delivery orders test data only
node backend/tests/insert_delivery_orders_test_data.js

# Clean up delivery orders test data
node backend/tests/cleanup_delivery_orders_test_data.js
```

### Run with All Test Data
```bash
# Run all test data including delivery orders
node backend/tests/run_all_test_data_with_delivery_orders.js

# Or use the safe version
node backend/tests/run_all_test_data_safe.js
```

## Mobile App Testing Scenarios

### 1. Driver Assignment
- Test driver selection in create-trip page
- Verify available drivers are loaded correctly

### 2. Vehicle Assignment
- Test vehicle selection in create-trip page
- Verify available vehicles are loaded correctly

### 3. Delivery Order Listing
- Test `/api/delivery-orders` endpoint
- Verify different statuses are displayed correctly
- Test filtering by driver, status, payment status

### 4. Order Details
- Test individual delivery order details
- Verify location data, timestamps, financial data

### 5. Status Updates
- Test status progression (at_spbu → otw_to_unload_location → at_unload_location → completed)
- Verify timestamp updates

### 6. Payment Management
- Test payment status updates
- Verify payment confirmation workflow

## Database Schema

The test data populates the following tables:
- `users` - Test drivers
- `driver_profiles` - Driver profile information
- `delivery_orders` - Main delivery order data
- `vehicles` - Uses existing vehicles (B1234ABC, B5678DEF, etc.)

## Cleanup

The cleanup script removes:
- All delivery orders with DO numbers starting with "DO-2025-"
- All test drivers with usernames starting with "driver00"

This ensures no conflicts with production data while providing comprehensive test coverage for mobile app development.
