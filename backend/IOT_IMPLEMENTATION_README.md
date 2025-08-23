# IoT Data Implementation - Phase 1 Complete

## Overview
This document describes the implementation of **Priority 3: Tampilan Sederhana Data IoT** - Phase 1 (Backend) for the System Angkutan Ewaldo project.

## 🎯 What's Implemented

### ✅ Database Layer
- **IoT Table**: `iot_raw_data` table with proper schema and indexes
- **Migration**: `20241224_create_iot_table.js` for database setup
- **Model**: `iotRawData.model.js` with Sequelize ORM integration
- **Associations**: Proper foreign key relationships with delivery orders

### ✅ Backend API
- **IoT Controller**: `iotController.js` with data reception and retrieval functions
- **IoT Routes**: `iot.routes.js` with RESTful endpoints
- **Sensor Data Endpoint**: Added to web delivery order controller
- **Server Integration**: IoT routes registered in main server

### ✅ API Endpoints

#### IoT Data Reception (Arduino → Backend)
```
POST /api/v1/iot/data
Content-Type: application/json

{
  "delivery_order_id": 123,
  "pressure_in": 2.5,
  "pressure_out": 2.3,
  "temperature": 25.6,
  "meter_pulse": 150
}
```

#### IoT Data Retrieval (Backend → Frontend)
```
GET /api/v1/iot/data/:delivery_order_id/latest
GET /api/v1/iot/data/:delivery_order_id/history?limit=10&offset=0
GET /api/web/delivery-orders/:id/sensordata
```

## 🗄️ Database Schema

### Table: `iot_raw_data`
```sql
CREATE TABLE iot_raw_data (
  id SERIAL PRIMARY KEY,
  delivery_order_id INTEGER NOT NULL REFERENCES delivery_orders(id),
  pressure_in NUMERIC(10, 2),
  pressure_out NUMERIC(10, 2),
  temperature NUMERIC(10, 2),
  meter_pulse INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes
- `idx_iot_raw_data_delivery_order_id` on `delivery_order_id`
- `idx_iot_raw_data_created_at` on `created_at`

### Foreign Key Constraints
- `fk_iot_raw_data_delivery_order_id` → `delivery_orders(id)` with CASCADE

## 🔧 Technical Implementation

### Models
- **IotRawData**: Sequelize model with proper validation and associations
- **Associations**: One-to-many relationship with DeliveryOrder

### Controllers
- **receiveData**: Handles POST requests from Arduino sensors
- **getLatestData**: Retrieves most recent sensor reading
- **getDataHistory**: Gets paginated sensor data history
- **getSensorData**: Web endpoint for frontend integration

### Validation
- **Required Fields**: `delivery_order_id` must exist
- **Data Types**: Numeric validation for pressure, temperature, and meter pulse
- **Range Validation**: Temperature must be above absolute zero
- **Existence Check**: Delivery order must exist in database

## 🚀 Usage Examples

### 1. Arduino Sensor Data Submission
```javascript
// Arduino/ESP32 code example
const sensorData = {
  delivery_order_id: 123,
  pressure_in: analogRead(pressureInPin) * 0.01,
  pressure_out: analogRead(pressureOutPin) * 0.01,
  temperature: dht.readTemperature(),
  meter_pulse: pulseCount
};

fetch('http://your-server:3000/api/v1/iot/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(sensorData)
});
```

### 2. Frontend Data Retrieval
```javascript
// Get latest sensor data
const response = await fetch('/api/web/delivery-orders/123/sensordata');
const sensorData = await response.json();

if (sensorData.success && sensorData.data) {
  const { latest, history } = sensorData.data;
  console.log('Latest reading:', latest);
  console.log('Recent history:', history);
}
```

## 🧪 Testing

### Test Script
Run the included test script to verify all endpoints:
```bash
cd backend
node test_iot.js
```

### Manual Testing
1. **Start the server**: `npm start` or `node server.js`
2. **Run migration**: Ensure the IoT table is created
3. **Test endpoints**: Use Postman or curl to test API endpoints
4. **Verify data**: Check database for stored IoT records

## 📁 Files Created/Modified

### New Files
- `src/migrations/20241224_create_iot_table.js`
- `src/models/iotRawData.model.js`
- `src/controllers/iotController.js`
- `src/routes/iot.routes.js`
- `test_iot.js`
- `IOT_IMPLEMENTATION_README.md`

### Modified Files
- `src/server.js` - Added IoT routes and API documentation
- `src/models/index.js` - Added IoT model and associations
- `src/controllers/web/deliveryOrderController.js` - Added sensor data endpoint
- `src/routes/web/deliveryOrder.routes.js` - Added sensor data route

## 🔄 Data Flow

```
Arduino/Sensor → POST /api/v1/iot/data → iotController.js → Database
                                                                    ↓
Frontend ← GET /api/web/do/:id/sensordata ← deliveryOrderController.js ← Database
```

## 🎯 Next Steps (Phase 2)

### Frontend Implementation
- Add IoT data display section to `DeliveryOrderDetail.tsx`
- Implement real-time polling every 5 seconds
- Create sensor data visualization components
- Add error handling for IoT connection issues

### Enhanced Features
- Real-time WebSocket updates
- Data visualization charts
- Historical data analysis
- Alert system for abnormal readings

## 🚨 Important Notes

1. **Database Migration**: Must run the IoT table migration before using the API
2. **Authentication**: IoT endpoints are currently public (no auth required)
3. **Rate Limiting**: Consider implementing rate limiting for production use
4. **Data Validation**: All sensor data is validated before storage
5. **Error Handling**: Comprehensive error handling with proper HTTP status codes

## 🔍 Troubleshooting

### Common Issues
1. **Table not found**: Run the migration script
2. **Foreign key error**: Ensure delivery order exists
3. **Validation error**: Check data types and ranges
4. **Server not responding**: Verify server is running on correct port

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=iot:* npm start
```

## 📊 Performance Considerations

- **Indexes**: Proper indexing on frequently queried fields
- **Pagination**: History endpoint supports pagination for large datasets
- **Caching**: Consider Redis caching for frequently accessed sensor data
- **Batch Operations**: Future enhancement for bulk sensor data insertion

---

**Status**: ✅ **Phase 1 Complete** - Backend IoT infrastructure fully implemented and ready for frontend integration.
