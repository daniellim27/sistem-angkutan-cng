/**
 * Test Bardi Screenshot API Endpoints
 * 
 * This script tests the screenshot functionality through the API
 */

const axios = require('axios');

// Configuration
const PORT = process.env.TEST_PORT || '3000';
const BASE_URL = `http://localhost:${PORT}/api`;
const BARDI_API = `${BASE_URL}/bardi`;

// Test credentials
const TEST_USER = {
  username: 'admin',
  password: 'awak1234'
};

let authToken = null;

/**
 * Authenticate and get token
 */
async function authenticate() {
  try {
    console.log('\n🔐 Authenticating...');
    const response = await axios.post(`${BASE_URL}/auth/web/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test screenshot endpoints
 */
async function testScreenshotEndpoints() {
  console.log('\n📸 Testing Screenshot Endpoints');
  console.log('=====================================');

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // Test 1: General screenshot endpoint
  console.log('\nTEST 1: General Screenshot');
  console.log('---------------------------');
  try {
    const response = await axios.post(`${BARDI_API}/screenshot`, {}, { headers });
    console.log('✅ SUCCESS');
    console.log(`Status: ${response.status}`);
    console.log(`Response type: ${typeof response.data.data}`);
    
    if (typeof response.data.data === 'string' && response.data.data.includes('<!DOCTYPE html>')) {
      console.log('📄 Response is HTML (camera interface)');
      console.log(`HTML length: ${response.data.data.length} characters`);
    } else {
      console.log('📊 Response data:', JSON.stringify(response.data.data, null, 2));
    }
    
    if (response.data.endpoint) {
      console.log(`🎯 Working endpoint: ${response.data.endpoint}`);
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`Error: ${error.response?.data?.message || error.message}`);
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
  }

  // Test 2: Device-specific screenshot (try with a common device ID)
  console.log('\nTEST 2: Device-Specific Screenshot');
  console.log('-----------------------------------');
  const testDeviceId = 'BARDI_CAMERA_001'; // Common device ID pattern
  
  try {
    const response = await axios.post(`${BARDI_API}/devices/${testDeviceId}/screenshot`, {}, { headers });
    console.log('✅ SUCCESS');
    console.log(`Status: ${response.status}`);
    console.log(`Response type: ${typeof response.data.data}`);
    
    if (typeof response.data.data === 'string' && response.data.data.includes('<!DOCTYPE html>')) {
      console.log('📄 Response is HTML (camera interface)');
      console.log(`HTML length: ${response.data.data.length} characters`);
    } else {
      console.log('📊 Response data:', JSON.stringify(response.data.data, null, 2));
    }
    
    if (response.data.endpoint) {
      console.log(`🎯 Working endpoint: ${response.data.endpoint}`);
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`Error: ${error.response?.data?.message || error.message}`);
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
  }

  // Test 3: Try different screenshot endpoint patterns
  console.log('\nTEST 3: Custom Screenshot Request');
  console.log('----------------------------------');
  
  const customRequests = [
    { endpoint: '/api/screenshot', method: 'POST' },
    { endpoint: '/api/capture', method: 'POST' },
    { endpoint: '/api/camera/screenshot', method: 'POST' },
    { endpoint: '/home/screenshot', method: 'POST' },
    { endpoint: '/camera/screenshot', method: 'POST' }
  ];

  for (const request of customRequests) {
    try {
      console.log(`\n  Trying: ${request.method} ${request.endpoint}`);
      const response = await axios.post(`${BARDI_API}/custom-request`, request, { headers });
      
      if (response.data.success) {
        console.log(`  ✅ SUCCESS - Status: ${response.data.statusCode}`);
        console.log(`  🎯 Working endpoint found: ${request.endpoint}`);
        break;
      } else {
        console.log(`  ❌ FAILED - ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.response?.data?.message || error.message}`);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('████████████████████████████████████████████████████████████');
  console.log('  BARDI SCREENSHOT API TEST SUITE');
  console.log('████████████████████████████████████████████████████████████');
  console.log('\n📋 Test Configuration:');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Bardi API: ${BARDI_API}`);
  console.log(`  Username: ${TEST_USER.username}`);

  // Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Test screenshot endpoints
  await testScreenshotEndpoints();

  console.log('\n████████████████████████████████████████████████████████████');
  console.log('  TEST SUITE COMPLETED');
  console.log('████████████████████████████████████████████████████████████');
  
  console.log('\n📝 Next Steps:');
  console.log('  1. If screenshots return HTML, the camera interface is working');
  console.log('  2. Look for actual screenshot/image data in successful responses');
  console.log('  3. Check browser DevTools to find the real screenshot API endpoint');
  console.log('  4. Update the service with the correct endpoint');
}

// Run the tests
runTests().catch(console.error);
