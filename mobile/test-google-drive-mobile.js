// Test script for mobile Google Drive integration
// This simulates the mobile app's image upload flow

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMobileGoogleDriveUpload() {
  try {
    console.log('🧪 Testing Mobile Google Drive Integration...');
    
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Create a test image file (1x1 pixel PNG)
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
    
    formData.append('Stan-Awal', testImageBuffer, {
      filename: 'stan_awal_test.jpg',
      contentType: 'image/jpeg'
    });
    
    formData.append('Stan-Akhir', testImageBuffer, {
      filename: 'stan_akhir_test.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('📤 Sending test upload to mobile endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/image-upload/nota-kecil`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer YOUR_TEST_TOKEN_HERE', // Replace with actual token
        ...formData.getHeaders()
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Mobile upload test successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Mobile upload test failed:', error.message);
    console.log('💡 Make sure:');
    console.log('   1. Backend server is running');
    console.log('   2. Google Drive credentials are set up');
    console.log('   3. You have a valid auth token');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMobileGoogleDriveUpload();
}

module.exports = testMobileGoogleDriveUpload;

