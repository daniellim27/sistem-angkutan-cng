const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000/api';

async function testReceiptOcrEndpoints() {
  console.log('🧪 Testing Receipt OCR Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);

    // Test 2: Get receipts for a delivery order (should return empty array)
    console.log('\n2️⃣ Testing get receipts endpoint...');
    try {
      const receiptsResponse = await axios.get(`${API_BASE_URL}/receipt-ocr/1`);
      console.log('✅ Get receipts passed:', receiptsResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Get receipts returned 404 (expected for non-existent DO)');
      } else {
        console.log('❌ Get receipts failed:', error.response?.data || error.message);
      }
    }

    // Test 3: Create a test image file for upload testing
    console.log('\n3️⃣ Testing receipt upload endpoint...');
    
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    formData.append('receipt_photo', testImageBuffer, {
      filename: 'test-receipt.png',
      contentType: 'image/png'
    });
    formData.append('do_id', '1');

    try {
      const uploadResponse = await axios.post(`${API_BASE_URL}/receipt-ocr/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 10000
      });
      console.log('✅ Receipt upload passed:', uploadResponse.data.message);
      
      // Test 4: Get receipts again (should now have data)
      console.log('\n4️⃣ Testing get receipts after upload...');
      const receiptsResponse2 = await axios.get(`${API_BASE_URL}/receipt-ocr/1`);
      console.log('✅ Get receipts after upload:', receiptsResponse2.data.data.length, 'receipts found');
      
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('❌ Receipt upload failed (validation error):', error.response.data.message);
      } else {
        console.log('❌ Receipt upload failed:', error.response?.data || error.message);
      }
    }

    // Test 5: Test confirm receipt endpoint
    console.log('\n5️⃣ Testing confirm receipt endpoint...');
    try {
      const confirmData = {
        delivery_order_id: 1,
        filling_station_name: 'SPBG Test',
        customer_name: 'Test Customer',
        filling_date: '2025-01-01',
        filling_time_start: '10:00',
        filling_time_end: '10:30',
        initial_pressure: 100,
        final_pressure: 200,
        total_volume: 50.5,
        customer_signatory: 'Test Customer',
        provider_signatory: 'Test Provider',
        driver_notes: 'Test receipt'
      };

      const confirmResponse = await axios.post(`${API_BASE_URL}/receipt-ocr/confirm`, confirmData);
      console.log('✅ Confirm receipt passed:', confirmResponse.data.message);
      
    } catch (error) {
      console.log('❌ Confirm receipt failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Receipt OCR endpoint testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testReceiptOcrEndpoints();
}

module.exports = testReceiptOcrEndpoints;



