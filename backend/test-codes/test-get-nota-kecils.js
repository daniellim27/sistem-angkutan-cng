// Load environment variables
require('dotenv').config();

const axios = require('axios');

async function checkNotaKecilsPhotos() {
  console.log('🔍 Checking nota kecils photos via API...\n');

  try {
    // Step 1: Login to get auth token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/mobile/login', {
      username: 'jack_driver',
      password: 'jack123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received\n');

    // Step 2: Get nota kecils for delivery order 24
    console.log('📋 Getting nota kecils for delivery order 24...');
    const response = await axios.get(
      'http://localhost:3000/api/delivery-orders/24/nota-kecils',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Nota kecils retrieved successfully!\n');
    
    const notaKecils = response.data.data;
    console.log(`Found ${notaKecils.length} nota kecils:\n`);

    notaKecils.forEach((nota, index) => {
      console.log(`📋 Nota Kecil ${index + 1} (ID: ${nota.id}):`);
      console.log(`   Delivery Order ID: ${nota.delivery_order_id}`);
      console.log(`   Customer Name: ${nota.customer_name}`);
      console.log(`   Created At: ${nota.created_at}`);
      
      // Check optimized photo structure
      console.log(`   📸 Optimized Photo Structure:`);
      if (nota.photos) {
        console.log(`      Photos:`, JSON.stringify(nota.photos, null, 4));
      } else {
        console.log(`      Photos: No photos found`);
      }
      
      // Check OCR results
      if (nota.ocr_results) {
        console.log(`   📊 OCR Results:`, JSON.stringify(nota.ocr_results, null, 4));
      }
      
      // Show raw database fields for comparison (only for first 3)
      if (index < 3) {
        console.log(`   🔍 Raw DB Fields (for debugging):`);
        console.log(`      Pressure Bar Photos:`, JSON.stringify(nota.pressure_bar_photos, null, 4));
        console.log(`      Temperature Photos:`, JSON.stringify(nota.temperature_photos, null, 4));
        console.log(`      Stan Awal Photos:`, JSON.stringify(nota.stan_awal_photos, null, 4));
        console.log(`      Stan Akhir Photos:`, JSON.stringify(nota.stan_akhir_photos, null, 4));
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking nota kecils:', error.message);
    if (error.response) {
      console.log('📊 Error response status:', error.response.status);
      console.log('📊 Error response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkNotaKecilsPhotos();
