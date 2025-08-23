// test_iot.js - Test script for IoT API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1/iot`;

// Test data
const testDeliveryOrderId = 1; // Make sure this DO exists in your database
const testSensorData = {
  delivery_order_id: testDeliveryOrderId,
  pressure_in: 2.5,
  pressure_out: 2.3,
  temperature: 25.6,
  meter_pulse: 150
};

async function testIoTEndpoints() {
  console.log('🧪 Testing IoT API Endpoints...\n');

  try {
    // Test 1: POST IoT data
    console.log('1️⃣ Testing POST /api/v1/iot/data...');
    const postResponse = await axios.post(`${API_URL}/data`, testSensorData);
    console.log('✅ POST successful:', postResponse.data);
    console.log('');

    // Test 2: GET latest IoT data
    console.log('2️⃣ Testing GET /api/v1/iot/data/:id/latest...');
    const latestResponse = await axios.get(`${API_URL}/data/${testDeliveryOrderId}/latest`);
    console.log('✅ GET latest successful:', latestResponse.data);
    console.log('');

    // Test 3: GET IoT data history
    console.log('3️⃣ Testing GET /api/v1/iot/data/:id/history...');
    const historyResponse = await axios.get(`${API_URL}/data/${testDeliveryOrderId}/history?limit=5`);
    console.log('✅ GET history successful:', historyResponse.data);
    console.log('');

    // Test 4: GET sensor data from web endpoint
    console.log('4️⃣ Testing GET /api/web/delivery-orders/:id/sensordata...');
    const webResponse = await axios.get(`${BASE_URL}/api/web/delivery-orders/${testDeliveryOrderId}/sensordata`);
    console.log('✅ Web endpoint successful:', webResponse.data);
    console.log('');

    console.log('🎉 All IoT tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure:');
      console.log('   - The delivery order with ID', testDeliveryOrderId, 'exists in your database');
      console.log('   - The server is running on port 3000');
      console.log('   - The database migration has been run');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testIoTEndpoints();
}

module.exports = { testIoTEndpoints };
