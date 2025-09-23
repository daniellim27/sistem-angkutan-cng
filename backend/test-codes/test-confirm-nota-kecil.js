// Load environment variables
require('dotenv').config();

const axios = require('axios');

async function testConfirmNotaKecil() {
  console.log('🧪 Testing confirmNotaKecil API...\n');

  try {
    // Step 1: Login to get auth token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/mobile/login', {
      username: 'jack_driver',
      password: 'jack123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Test confirm nota kecil API
    console.log('\n📋 Testing confirmNotaKecil API...');
    
    const confirmData = {
      stan_awal: 1279.07,
      stan_akhir: 1413.03,
      tekanan_operasi: 1.70,
      temperatur_operasi: 29.0,
      driver_notes: 'Test nota kecil from API test',
      customer_location_index: 0,
      customer_name: 'Test Customer',
      customer_address: 'Test Address',
      photos: {
        pressure_bar: [{ url: "https://example.com/pressure_bar.jpg" }],
        temperature: [{ url: "https://example.com/temperature.jpg" }],
        stan_awal: [{ url: "https://example.com/stan_awal.jpg" }],
        stan_akhir: [{ url: "https://example.com/stan_akhir.jpg" }]
      },
      ocr_results: {
        pressure_bar: { value: '1.70', confidence: 0.92 },
        temperature: { value: '29.0', confidence: 0.88 },
        stan_awal: { value: '1279.07', confidence: 0.95 },
        stan_akhir: { value: '1413.03', confidence: 0.91 }
      }
    };

    const confirmResponse = await axios.post(
      'http://localhost:3000/api/delivery-orders/24/nota-kecil/confirm',
      confirmData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Confirm API response received!');
    console.log('📊 Response status:', confirmResponse.status);
    console.log('📊 Response data:', JSON.stringify(confirmResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('📊 Error response status:', error.response.status);
      console.log('📊 Error response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testConfirmNotaKecil();
