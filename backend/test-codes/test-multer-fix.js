// Test script for multer fix
const FormData = require('form-data');
const fs = require('fs');

async function testMulterFix() {
  try {
    console.log('🧪 Testing multer fix for mobile field names...');
    
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    
    const formData = new FormData();
    
    // Add required fields (as mobile app would)
    formData.append('deliveryOrderId', 'JACK-2025-001');
    formData.append('customerName', 'Test Customer Mobile');
    formData.append('locationIndex', '1');
    
    // Add test images with mobile field names
    formData.append('Pressure-Bar', testImageBuffer, {
      filename: 'pressure_bar_test.jpg',
      contentType: 'image/jpeg'
    });
    
    formData.append('Temperature', testImageBuffer, {
      filename: 'temperature_test.jpg', 
      contentType: 'image/jpeg'
    });
    
    console.log('📤 Sending test upload to mobile endpoint...');
    
    const response = await fetch('http://localhost:3000/api/image-upload/nota-kecil', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token', // This will fail auth but should pass multer
        ...formData.getHeaders()
      }
    });
    
    const result = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log('Response:', result);
    
    if (response.status === 401) {
      console.log('✅ Multer fix working! Got 401 (auth error) instead of multer error');
    } else if (result.includes('Unexpected field')) {
      console.log('❌ Multer fix failed - still getting unexpected field error');
    } else {
      console.log('✅ Multer fix working! No unexpected field error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testMulterFix();

