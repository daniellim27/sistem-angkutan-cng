// Load environment variables
require('dotenv').config();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSimpleEndpoint() {
  console.log('🧪 Testing /api/image-upload/nota-kecil-simple endpoint...\n');

  try {
    // Create form data
    const form = new FormData();
    
    // Add test image
    const testImagePath = path.join(__dirname, '..', 'uploads', 'nota_kecil', 'testOCR1.png');
    form.append('images', fs.createReadStream(testImagePath));
    
    // Add required fields
    form.append('deliveryOrderId', 'TEST-DO-SIMPLE-001');
    form.append('customerName', 'TestCustomerSimple');
    form.append('locationIndex', '1');

    console.log('📸 Sending request to /api/image-upload/nota-kecil-simple...');
    console.log('📊 Request data:', {
      deliveryOrderId: 'TEST-DO-SIMPLE-001',
      customerName: 'TestCustomerSimple',
      locationIndex: '1',
      imageFile: 'testOCR1.png'
    });

    // Make the request (you'll need to add authentication token if required)
    const response = await axios.post('http://localhost:3000/api/image-upload/nota-kecil-simple', form, {
      headers: {
        ...form.getHeaders(),
        // Add your auth token here if needed
        // 'Authorization': 'Bearer your-token-here'
      },
      timeout: 30000
    });

    console.log('✅ Response received!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 Simple endpoint test successful!');
      console.log('✅ Cloudinary integration is working correctly');
    } else {
      console.log('\n❌ Simple endpoint test failed');
      console.log('Error:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📊 Error response status:', error.response.status);
      console.error('📊 Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running:');
      console.log('   cd backend && npm start');
    }
  }
}

// Run the test
testSimpleEndpoint();
