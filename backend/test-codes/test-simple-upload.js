// Load environment variables
require('dotenv').config();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSimpleUpload() {
  console.log('🧪 Testing simple upload endpoint...\n');

  try {
    // Test uploading one image at a time
    const testImagePath = path.join(__dirname, '..', 'uploads', 'nota_kecil', 'testOCR1.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      return;
    }

    console.log('📸 Testing single image upload to Google Drive...');
    console.log('📸 Image path:', testImagePath);

    // Create form data for single image upload
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath));
    form.append('deliveryOrderId', 'TEST-SIMPLE-001');
    form.append('customerName', 'TestCustomerSimple');
    form.append('locationIndex', '1');
    form.append('photoType', 'pressure_bar');
    form.append('notaKecilId', '1'); // Optional

    console.log('📊 Request data:', {
      deliveryOrderId: 'TEST-SIMPLE-001',
      customerName: 'TestCustomerSimple',
      locationIndex: '1',
      photoType: 'pressure_bar',
      imageFile: 'testOCR1.png'
    });

    // Make the request to test endpoint (no auth required)
    const response = await axios.post('http://localhost:3000/api/simple-upload/nota-image-test', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Response received!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 Simple upload test successful!');
      console.log('✅ Google Drive integration is working correctly');
      console.log('🔗 Image URL:', response.data.data.imageData.url);
    } else {
      console.log('\n❌ Simple upload test failed');
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
testSimpleUpload();
