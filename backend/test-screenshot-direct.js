/**
 * Direct Screenshot Test
 * Test the /api/screenshot endpoint directly
 */

const axios = require('axios');

async function testScreenshot() {
  try {
    console.log('🔐 Getting authentication token...');
    
    // Authenticate
    const authResponse = await axios.post('http://localhost:3000/api/auth/web/login', {
      username: 'admin',
      password: 'awak1234'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');
    
    console.log('\n📸 Testing /api/screenshot endpoint...');
    
    // Test the screenshot endpoint
    const response = await axios.post('http://localhost:3000/api/bardi/custom-request', {
      endpoint: '/api/screenshot',
      method: 'POST'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log(`Status: ${response.status}`);
    console.log(`Response success: ${response.data.success}`);
    
    if (response.data.data) {
      const data = response.data.data;
      console.log(`Response data type: ${typeof data}`);
      console.log(`Response data length: ${typeof data === 'string' ? data.length : 'N/A'}`);
      
      if (typeof data === 'string') {
        if (data.includes('<!DOCTYPE html>')) {
          console.log('📄 Response is HTML (camera interface)');
          console.log(`HTML preview: ${data.substring(0, 200)}...`);
        } else if (data.includes('data:image/')) {
          console.log('🖼️ Response appears to be base64 image data!');
          console.log(`Image data preview: ${data.substring(0, 100)}...`);
        } else {
          console.log('📊 Response content preview:');
          console.log(data.substring(0, 500));
        }
      } else {
        console.log('📊 Response data:', JSON.stringify(data, null, 2));
      }
    }
    
    if (response.data.endpoint) {
      console.log(`🎯 Working endpoint: ${response.data.endpoint}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testScreenshot();
