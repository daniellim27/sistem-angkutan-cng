// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const googleDriveService = require('./src/services/googleDriveService');

async function testGoogleDriveDirect() {
  console.log('🧪 Testing Google Drive service directly...\n');

  try {
    // Check if service is in mock mode
    if (googleDriveService.isMockMode()) {
      console.log('🔧 Google Drive service is in MOCK mode');
      console.log('📋 To enable real Google Drive uploads, make sure:');
      console.log('   1. GOOGLE_DRIVE_KEY_FILE is set in .env');
      console.log('   2. google-credentials.json file exists');
      console.log('   3. Google Drive API is enabled in Google Cloud Console');
    } else {
      console.log('✅ Google Drive service is initialized with real credentials');
    }

    // Test with a sample file
    const testImagePath = path.join(__dirname, '..', 'uploads', 'nota_kecil', 'testOCR1.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      return;
    }

    console.log('📸 Test image found:', testImagePath);

    // Create a mock file object (like what Multer would provide)
    const fileBuffer = fs.readFileSync(testImagePath);
    const mockFile = {
      buffer: fileBuffer,
      mimetype: 'image/png',
      originalname: 'testOCR1.png',
      size: fileBuffer.length
    };

    console.log('📊 Mock file object:', {
      hasBuffer: !!mockFile.buffer,
      bufferSize: mockFile.buffer.length,
      mimetype: mockFile.mimetype,
      originalname: mockFile.originalname
    });

    // Test the upload function
    console.log('\n🚀 Testing uploadNotaKecilImage...');
    const result = await googleDriveService.uploadNotaKecilImage(
      mockFile,
      'TEST-DIRECT-001',
      'TestCustomerDirect',
      '1',
      'pressure_bar'
    );

    console.log('✅ Upload result:', {
      success: !!result,
      fileId: result.fileId,
      filename: result.filename,
      publicUrl: result.publicUrl,
      folderPath: result.folderPath
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📊 Error details:', error);
  }
}

// Run the test
testGoogleDriveDirect();
