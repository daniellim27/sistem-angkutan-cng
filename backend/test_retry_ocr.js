// Test retry OCR functionality
require('dotenv').config();

const { DeliveryOrder } = require('./src/models');
const ocrService = require('./src/services/ocrService');
const fs = require('fs');
const path = require('path');

async function testRetryOCR() {
  try {
    console.log('🔄 Testing retry OCR functionality...');
    
    // Find a delivery order with photos but no OCR data
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
      console.log('❌ No delivery orders found with photos but no OCR data');
      return;
    }
    
    console.log('✅ Testing with delivery order:', {
      id: deliveryOrder.id,
      do_number: deliveryOrder.do_number,
      photos: deliveryOrder.surat_jalan_photo_url
    });
    
    const firstPhotoPath = deliveryOrder.surat_jalan_photo_url[0];
    console.log('📷 Photo path from DB:', firstPhotoPath);
    
    // Try different path resolutions (same logic as in the controller)
    let fullPath = firstPhotoPath;
    if (!path.isAbsolute(firstPhotoPath)) {
      if (firstPhotoPath.startsWith('uploads/')) {
        // Path like "uploads/surat_jalan_photos/file.jpg" - relative to backend directory
        fullPath = path.join(__dirname, '../../..', firstPhotoPath);
      } else {
        // Path like "surat_jalan_photos/file.jpg" - relative to uploads directory
        fullPath = path.join(__dirname, '../../../uploads', firstPhotoPath);
      }
    }
    
    console.log('🔍 Resolving file path:', {
      original: firstPhotoPath,
      resolved: fullPath,
      exists: fs.existsSync(fullPath)
    });
    
    if (!fs.existsSync(fullPath)) {
      // Try alternative path resolution
      const altPath = path.join(__dirname, firstPhotoPath);
      console.log('🔍 Trying alternative path:', {
        alternative: altPath,
        exists: fs.existsSync(altPath)
      });
      
      if (fs.existsSync(altPath)) {
        fullPath = altPath;
      } else {
        throw new Error(`Surat jalan photo file not found at: ${fullPath} or ${altPath}`);
      }
    }
    
    console.log('✅ Found photo file at:', fullPath);
    
    // Check OCR service configuration
    console.log('🔧 Checking OCR configuration...');
    const config = ocrService.checkConfiguration();
    if (!config.isConfigured) {
      throw new Error('OCR service is not properly configured. Please check OPENAI_API_KEY.');
    }
    console.log('✅ OCR service is configured');
    
    // Read and process image
    const imageBuffer = fs.readFileSync(fullPath);
    console.log(`📊 Image buffer size: ${imageBuffer.length} bytes`);
    
    console.log('🤖 Processing with OCR...');
    const ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
    console.log('✅ OCR processing completed!');
    console.log('📋 OCR Result:', JSON.stringify(ocrResult, null, 2));
    
    // Update delivery order with OCR results
    console.log('💾 Updating delivery order with OCR results...');
    const updateData = {
      surat_jalan_ocr_data: ocrResult,
      surat_jalan_ocr_confidence: ocrResult.overall_confidence || 0,
      surat_jalan_volume_extracted: ocrResult.total_volume_pengisian || null,
      surat_jalan_ocr_processed_at: new Date()
    };
    
    console.log('📝 Update data:', updateData);
    await deliveryOrder.update(updateData);
    console.log('✅ Delivery order updated successfully!');
    
    // Verify the update
    const updatedDO = await DeliveryOrder.findByPk(deliveryOrder.id);
    console.log('🔍 Verification:');
    console.log('Updated DO OCR data:', {
      has_ocr_data: !!updatedDO.surat_jalan_ocr_data,
      confidence: updatedDO.surat_jalan_ocr_confidence,
      volume_extracted: updatedDO.surat_jalan_volume_extracted,
      processed_at: updatedDO.surat_jalan_ocr_processed_at
    });
    
    console.log('\n🎉 Retry OCR test completed successfully!');
    console.log('💡 Now try refreshing the Tagihan modal to see the OCR data!');
    
  } catch (error) {
    console.error('❌ Retry OCR test failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testRetryOCR();
