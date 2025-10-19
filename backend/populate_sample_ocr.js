// Populate sample OCR data for testing (without calling OpenAI API)
require('dotenv').config();

const { DeliveryOrder } = require('./src/models');

async function populateSampleOCR() {
  try {
    console.log('📝 Populating sample OCR data for testing...');
    
    // Find delivery orders with photos but no OCR data
    const deliveryOrders = await DeliveryOrder.findAll({
      where: {
        surat_jalan_photo_url: {
          [require('sequelize').Op.ne]: null
        },
        surat_jalan_ocr_data: null
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });
    
    if (deliveryOrders.length === 0) {
      console.log('❌ No delivery orders found with photos but no OCR data');
      return;
    }
    
    console.log(`✅ Found ${deliveryOrders.length} delivery orders to populate with sample OCR data`);
    
    // Sample OCR data based on the successful OCR results we saw
    const sampleOCRData = [
      {
        total_volume_pengisian: 1277.37,
        nomor_surat_jalan: "225486",
        tanggal: "2025-09-19T00:00:00.000Z",
        nama_pengirim: "PT GAGAS ENERGI INDONESIA",
        alamat_pengirim: "Jl. Zainal Arifin 11D, Jakarta Barat 11140",
        nama_penerima: "PT. Gaspol",
        jenis_barang: "CNG",
        satuan: "m³",
        confidence: 85,
        overall_confidence: 90
      },
      {
        total_volume_pengisian: 5361.93,
        nomor_surat_jalan: "SPBG Purw. 231 09 20 25",
        tanggal: "2025-09-23T00:00:00.000Z",
        nama_pengirim: "PT. Gagas Energi Indonesia",
        alamat_pengirim: "Jl. Raya Sadang-Subang No.53, Ciseureuh, Kec. Purwakarta",
        nama_penerima: "PT. Gaspol",
        jenis_barang: "CNG",
        satuan: "m³",
        confidence: 90,
        overall_confidence: 100
      },
      {
        total_volume_pengisian: 850.25,
        nomor_surat_jalan: "SJ-2025-001",
        tanggal: "2025-10-19T00:00:00.000Z",
        nama_pengirim: "PT GAGAS ENERGI INDONESIA",
        alamat_pengirim: "Jakarta",
        nama_penerima: "PT. Gaspol",
        jenis_barang: "CNG",
        satuan: "m³",
        confidence: 88,
        overall_confidence: 92
      }
    ];
    
    // Update each delivery order with sample OCR data
    for (let i = 0; i < deliveryOrders.length; i++) {
      const deliveryOrder = deliveryOrders[i];
      const ocrData = sampleOCRData[i % sampleOCRData.length];
      
      // Adjust volume based on the DO's gas volume for more realistic data
      const adjustedVolume = parseFloat(deliveryOrder.gas_volume_m3) * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variation
      ocrData.total_volume_pengisian = Math.round(adjustedVolume * 100) / 100;
      
      const updateData = {
        surat_jalan_ocr_data: {
          ...ocrData,
          extracted_at: new Date(),
          raw_data: ocrData
        },
        surat_jalan_ocr_confidence: ocrData.overall_confidence,
        surat_jalan_volume_extracted: ocrData.total_volume_pengisian,
        surat_jalan_ocr_processed_at: new Date()
      };
      
      await deliveryOrder.update(updateData);
      
      console.log(`✅ Updated DO ${deliveryOrder.do_number} with OCR data:`, {
        volume_extracted: ocrData.total_volume_pengisian,
        confidence: ocrData.overall_confidence,
        gas_volume_m3: deliveryOrder.gas_volume_m3
      });
    }
    
    console.log('\n🎉 Sample OCR data populated successfully!');
    console.log('💡 Now try refreshing the Tagihan modal to see the OCR data and calculations!');
    
  } catch (error) {
    console.error('❌ Failed to populate sample OCR data:', error);
  } finally {
    process.exit(0);
  }
}

populateSampleOCR();
