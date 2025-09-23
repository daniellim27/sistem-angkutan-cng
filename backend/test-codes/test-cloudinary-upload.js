// Load environment variables
require('dotenv').config();

const cloudinaryService = require('./src/services/cloudinaryService');
const fs = require('fs');
const path = require('path');

async function testCloudinaryUpload() {
  console.log('🧪 Testing Cloudinary integration...\n');

  try {
    // Check if Cloudinary is configured
    if (cloudinaryService.isMockMode()) {
      console.log('⚠️  Cloudinary is in mock mode - credentials not configured');
      console.log('   This is expected if you haven\'t set up your Cloudinary account yet.\n');
    } else {
      console.log('✅ Cloudinary credentials are configured\n');
    }

    // Test with a sample image file
    const testImagePath = path.join(__dirname, '..', 'uploads', 'nota_kecil', 'testOCR1.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      console.log('   Please make sure you have a test image in the uploads/nota_kecil/ directory');
      return;
    }

    console.log('📸 Testing upload with:', testImagePath);

    // Create a mock file object
    const mockFile = {
      path: testImagePath,
      originalname: 'testOCR1.png',
      mimetype: 'image/png'
    };

    // Test upload
    const uploadResult = await cloudinaryService.uploadNotaKecilImage(
      mockFile,
      'TEST-DO-001',
      'TestCustomer',
      '1',
      'Pressure-Bar'
    );

    console.log('✅ Upload successful!');
    console.log('📊 Upload result:', {
      publicId: uploadResult.publicId,
      filename: uploadResult.filename,
      secureUrl: uploadResult.secureUrl,
      folderPath: uploadResult.folderPath,
      uploadedAt: uploadResult.uploadedAt
    });

    // Test getting optimized URL
    const optimizedUrl = cloudinaryService.getOptimizedUrl(uploadResult.publicId, {
      width: 800,
      height: 600
    });
    console.log('🔗 Optimized URL:', optimizedUrl);

    // Test getting thumbnail
    const thumbnailUrl = cloudinaryService.getThumbnailUrl(uploadResult.publicId, 200);
    console.log('🖼️  Thumbnail URL:', thumbnailUrl);

    // Test deletion (only if not in mock mode)
    if (!cloudinaryService.isMockMode()) {
      console.log('\n🗑️  Testing deletion...');
      const deleteResult = await cloudinaryService.deleteImage(uploadResult.publicId);
      console.log('✅ Deletion result:', deleteResult);
    } else {
      console.log('\n🔧 Mock mode - skipping deletion test');
    }

    console.log('\n🎉 Cloudinary integration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCloudinaryUpload();
