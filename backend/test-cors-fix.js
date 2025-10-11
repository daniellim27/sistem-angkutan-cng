// Test script to verify CORS and tracking endpoint fixes
const fetch = require('node-fetch');

const BACKEND_URL = 'https://backend-angkutan.onrender.com';
const FRONTEND_ORIGIN = 'https://frontend-angkutan.onrender.com';

async function testCORS() {
  console.log('🧪 Testing CORS and tracking endpoint fixes...\n');

  // Test 1: Basic CORS test endpoint
  try {
    console.log('1️⃣ Testing basic CORS endpoint...');
    const response = await fetch(`${BACKEND_URL}/api/test-cors`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ CORS test successful:', data.message);
    console.log('   Headers received by server:', data.origin);
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }

  // Test 2: Tracking vehicles/active endpoint
  try {
    console.log('\n2️⃣ Testing tracking vehicles/active endpoint...');
    const response = await fetch(`${BACKEND_URL}/api/web/tracking/vehicles/active`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      console.error('❌ 404 - Endpoint not found');
      return;
    }
    
    const data = await response.json();
    console.log('✅ Tracking endpoint successful');
    console.log('   Active vehicles found:', data.data?.length || 0);
    console.log('   Response success:', data.success);
  } catch (error) {
    console.error('❌ Tracking endpoint failed:', error.message);
  }

  // Test 3: Root endpoint
  try {
    console.log('\n3️⃣ Testing root endpoint...');
    const response = await fetch(`${BACKEND_URL}/`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Root endpoint successful');
    console.log('   Tracking endpoints listed:', !!data.tracking);
  } catch (error) {
    console.error('❌ Root endpoint failed:', error.message);
  }

  console.log('\n✨ Test completed!');
}

testCORS().catch(console.error);
