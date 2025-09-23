// Load environment variables
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

async function testEndpointDirect() {
  console.log('🧪 Testing endpoint directly...\n');

  try {
    const testImagePath = path.join(__dirname, '..', 'uploads', 'nota_kecil', 'testOCR1.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      return;
    }

    console.log('📸 Test image found:', testImagePath);

    // Read the image file
    const imageBuffer = fs.readFileSync(testImagePath);
    
    // Create multipart form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16);
    
    let formData = '';
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="deliveryOrderId"\r\n\r\n`;
    formData += `TEST-DIRECT-001\r\n`;
    
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="customerName"\r\n\r\n`;
    formData += `TestCustomerDirect\r\n`;
    
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="locationIndex"\r\n\r\n`;
    formData += `1\r\n`;
    
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="photoType"\r\n\r\n`;
    formData += `pressure_bar\r\n`;
    
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="image"; filename="testOCR1.png"\r\n`;
    formData += `Content-Type: image/png\r\n\r\n`;
    
    const formDataBuffer = Buffer.concat([
      Buffer.from(formData, 'utf8'),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/simple-upload/nota-image-test',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length
      }
    };

    console.log('🚀 Making request to:', `http://localhost:3000${options.path}`);
    
    const req = http.request(options, (res) => {
      console.log('📊 Response status:', res.statusCode);
      console.log('📊 Response headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ Response received!');
        console.log('📊 Response data:', data);
        
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.success) {
            console.log('\n🎉 Direct endpoint test successful!');
            console.log('✅ Google Drive integration is working correctly');
            console.log('🔗 Image URL:', jsonData.data.imageData.url);
          } else {
            console.log('\n❌ Direct endpoint test failed');
            console.log('Error:', jsonData.message);
          }
        } catch (e) {
          console.log('❌ Failed to parse response as JSON');
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });

    req.write(formDataBuffer);
    req.end();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEndpointDirect();
