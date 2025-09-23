const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testImageUpload() {
  console.log('🧪 Testing image upload API with testOCR1.png...');
  
  try {
    const filePath = './uploads/nota_kecil/testOCR1.png';
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    
    // Add form fields
    form.append('deliveryOrderId', '24');
    form.append('customerName', 'Test Customer');
    form.append('locationIndex', '1');
    form.append('notaKecilId', '1');
    
    // Add the same image for all 4 fields
    const imageStream = fs.createReadStream(filePath);
    form.append('Pressure-Bar', imageStream, {
      filename: 'testOCR1.png',
      contentType: 'image/png'
    });
    
    const imageStream2 = fs.createReadStream(filePath);
    form.append('Temperature', imageStream2, {
      filename: 'testOCR1.png',
      contentType: 'image/png'
    });
    
    const imageStream3 = fs.createReadStream(filePath);
    form.append('Stan-Awal', imageStream3, {
      filename: 'testOCR1.png',
      contentType: 'image/png'
    });
    
    const imageStream4 = fs.createReadStream(filePath);
    form.append('Stan-Akhir', imageStream4, {
      filename: 'testOCR1.png',
      contentType: 'image/png'
    });

    console.log('📤 Sending request to API...');
    
    const response = await fetch('http://127.0.0.1:3000/api/image-upload/nota-kecil-simple', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6ImRyaXZlciIsImlhdCI6MTc1ODYzMTE0OSwiZXhwIjoxNzU4NzE3NTQ5fQ.example_token'
      }
    });

    const responseText = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Upload successful!');
      console.log('📊 Files processed:', result.data.filesProcessed);
      console.log('📊 Uploaded images:', Object.keys(result.data.uploadedImages).length);
      
      // Check if any images were actually uploaded to Google Drive
      const hasUploadedImages = Object.values(result.data.uploadedImages).some(arr => arr.length > 0);
      if (hasUploadedImages) {
        console.log('🎉 Google Drive uploads working!');
      } else {
        console.log('⚠️ Files processed but no Google Drive uploads');
      }
    } else {
      console.log('❌ Upload failed:', responseText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUpload();
