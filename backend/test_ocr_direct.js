// Direct OCR test script
require('dotenv').config();

const { DeliveryOrder } = require('./src/models');
const ocrService = require('./src/services/ocrService');
const fs = require('fs');
const path = require('path');

async function testOCRDirect() {
  try {
    console.log('🔍 Testing OCR functionality directly...');
    
    // Check OCR configuration
    console.log('\n1. Checking OCR configuration...');
    const config = ocrService.checkConfiguration();
    console.log('OCR Config:', {
      isConfigured: config.isConfigured,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
    });
    
    if (!config.isConfigured) {
      throw new Error('OCR service is not configured properly');
    }
    
    // Find a delivery order with surat jalan photos but no OCR data
    console.log('\n2. Finding delivery order with surat jalan photos...');
    const deliveryOrder = await DeliveryOrder.findOne({
      where: {
        surat_jalan_photo_url: {
          [require('sequelize').Op.ne]: null
        },
        surat_jalan_ocr_data: null
      },
      order: [['created_at', 'DESC']]
    });
    
    if (!deliveryOrder) {
      console.log('❌ No delivery orders found with surat jalan photos but no OCR data');
      return;
    }
    
    console.log('✅ Found delivery order:', {
      id: deliveryOrder.id,
      do_number: deliveryOrder.do_number,
      photos: deliveryOrder.surat_jalan_photo_url
    });
    
    // Test OCR processing on the first photo
    console.log('\n3. Testing OCR processing...');
    const firstPhotoPath = deliveryOrder.surat_jalan_photo_url[0];
    console.log('Photo path from DB:', firstPhotoPath);
    
    // Try different path resolutions
    const possiblePaths = [
      firstPhotoPath, // Original path
      path.join(__dirname, firstPhotoPath), // Relative to backend
      path.join(__dirname, '..', firstPhotoPath), // Relative to project root
      path.join(__dirname, 'uploads', path.basename(firstPhotoPath)), // Direct in backend/uploads
    ];
    
    let fullPath = null;
    for (const testPath of possiblePaths) {
      console.log(`Testing path: ${testPath} - exists: ${fs.existsSync(testPath)}`);
      if (fs.existsSync(testPath)) {
        fullPath = testPath;
        break;
      }
    }
    
    if (!fullPath) {
      console.log('❌ Could not find surat jalan photo file at any expected location');
      console.log('Available files in uploads/surat_jalan_photos:');
      const uploadsDir = path.join(__dirname, 'uploads', 'surat_jalan_photos');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log('  Directory does not exist');
      }
      return;
    }
    
    console.log('✅ Found photo file at:', fullPath);
    
    // Read and process image
    const imageBuffer = fs.readFileSync(fullPath);
    console.log(`Image buffer size: ${imageBuffer.length} bytes`);
    
    console.log('\n4. Processing with OCR...');
    const ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
    console.log('✅ OCR processing completed!');
    console.log('OCR Result:', JSON.stringify(ocrResult, null, 2));
    
    // Update delivery order with OCR results
    console.log('\n5. Updating delivery order with OCR results...');
    const updateData = {
      surat_jalan_ocr_data: ocrResult,
      surat_jalan_ocr_confidence: ocrResult.overall_confidence || 0,
      surat_jalan_volume_extracted: ocrResult.total_volume_pengisian || null,
      surat_jalan_ocr_processed_at: new Date()
    };
    
    await deliveryOrder.update(updateData);
    console.log('✅ Delivery order updated successfully!');
    
    // Verify the update
    const updatedDO = await DeliveryOrder.findByPk(deliveryOrder.id);
    console.log('\n6. Verification:');
    console.log('Updated DO OCR data:', {
      has_ocr_data: !!updatedDO.surat_jalan_ocr_data,
      confidence: updatedDO.surat_jalan_ocr_confidence,
      volume_extracted: updatedDO.surat_jalan_volume_extracted,
      processed_at: updatedDO.surat_jalan_ocr_processed_at
    });
    
    console.log('\n🎉 OCR test completed successfully!');
    
  } catch (error) {
    console.error('❌ OCR test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testOCRDirect();
