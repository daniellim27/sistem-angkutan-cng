/**
 * Test script for Bardi Scraping Service
 * 
 * This script tests the Bardi scraping functionality by making requests
 * to the local API endpoints.
 * 
 * Prerequisites:
 * 1. Ensure backend server is running (npm start or node src/server.js)
 * 2. Update session.json with valid Bardi session cookies
 * 3. Have a valid admin user or test user for authentication
 */

const axios = require('axios');

// Configuration  
// Use port 3000 for Docker, or 5000 if running locally
const PORT = process.env.TEST_PORT || '3000';
const BASE_URL = `http://localhost:${PORT}/api`;
const BARDI_API = `${BASE_URL}/bardi`;

// Test credentials - Update these with valid credentials
const TEST_USER = {
  username: 'admin',
  password: 'awak1234'
};

let authToken = null;

/**
 * Helper function to log test results
 */
function logResult(testName, success, data, error = null) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log('Error:', error?.message || error);
    if (error?.response?.data) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

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
    console.log('❌ Authentication failed:', error.message);
    if (error.response?.data) {
      console.log('Response:', error.response.data);
    }
    return false;
  }
}

/**
 * Get axios config with auth token
 */
function getAuthConfig() {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  };
}

/**
 * Test 1: Test session validity (no auth required)
 */
async function testSessionValidity() {
  try {
    const response = await axios.get(`${BARDI_API}/test-session`);
    logResult('Test Session Validity', true, response.data);
    return response.data.success;
  } catch (error) {
    logResult('Test Session Validity', false, null, error);
    return false;
  }
}

/**
 * Test 2: Get session info (no auth required)
 */
async function testGetSessionInfo() {
  try {
    const response = await axios.get(`${BARDI_API}/session-info`);
    logResult('Get Session Info', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Session Info', false, null, error);
    return false;
  }
}

/**
 * Test 3: Get user info (requires auth)
 */
async function testGetUserInfo() {
  try {
    const response = await axios.get(`${BARDI_API}/user-info`, getAuthConfig());
    logResult('Get User Info', true, response.data);
    return true;
  } catch (error) {
    logResult('Get User Info', false, null, error);
    return false;
  }
}

/**
 * Test 4: Get devices (requires auth)
 */
async function testGetDevices() {
  try {
    const response = await axios.get(`${BARDI_API}/devices`, getAuthConfig());
    logResult('Get Devices', true, response.data);
    return response.data;
  } catch (error) {
    logResult('Get Devices', false, null, error);
    return null;
  }
}

/**
 * Test 5: Get device details (requires auth and device ID)
 */
async function testGetDeviceDetails(deviceId) {
  try {
    const response = await axios.get(`${BARDI_API}/devices/${deviceId}`, getAuthConfig());
    logResult(`Get Device Details (${deviceId})`, true, response.data);
    return true;
  } catch (error) {
    logResult(`Get Device Details (${deviceId})`, false, null, error);
    return false;
  }
}

/**
 * Test 6: Get device status (requires auth and device ID)
 */
async function testGetDeviceStatus(deviceId) {
  try {
    const response = await axios.get(`${BARDI_API}/devices/${deviceId}/status`, getAuthConfig());
    logResult(`Get Device Status (${deviceId})`, true, response.data);
    return true;
  } catch (error) {
    logResult(`Get Device Status (${deviceId})`, false, null, error);
    return false;
  }
}

/**
 * Test 7: Make custom request (requires auth)
 */
async function testCustomRequest() {
  try {
    const requestData = {
      endpoint: '/api/some-endpoint',
      method: 'GET'
    };
    const response = await axios.post(`${BARDI_API}/custom-request`, requestData, getAuthConfig());
    logResult('Custom Request', true, response.data);
    return true;
  } catch (error) {
    logResult('Custom Request', false, null, error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('  BARDI SCRAPING SERVICE TEST SUITE');
  console.log('█'.repeat(60));
  
  console.log('\n📋 Test Configuration:');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Bardi API: ${BARDI_API}`);
  console.log(`  Username: ${TEST_USER.username}`);
  
  // Test 1 & 2: No authentication required
  console.log('\n\n🔹 PHASE 1: Public Endpoints (No Authentication)');
  await testSessionValidity();
  await testGetSessionInfo();
  
  // Authenticate for protected endpoints
  console.log('\n\n🔹 PHASE 2: Authentication');
  const authenticated = await authenticate();
  
  if (!authenticated) {
    console.log('\n❌ Cannot proceed with protected endpoint tests without authentication');
    console.log('💡 Make sure:');
    console.log('   1. Backend server is running');
    console.log('   2. Test credentials are correct');
    console.log('   3. Admin user exists (run docker-setup-admin.bat or npm run create-admin)');
    return;
  }
  
  // Test 3-7: Protected endpoints
  console.log('\n\n🔹 PHASE 3: Protected Endpoints');
  await testGetUserInfo();
  
  const devicesData = await testGetDevices();
  
  // If we got devices, test device-specific endpoints
  if (devicesData?.data?.devices && devicesData.data.devices.length > 0) {
    const firstDeviceId = devicesData.data.devices[0].id;
    console.log(`\n📱 Testing device-specific endpoints with device: ${firstDeviceId}`);
    await testGetDeviceDetails(firstDeviceId);
    await testGetDeviceStatus(firstDeviceId);
  } else {
    console.log('\n⚠️ No devices found, skipping device-specific tests');
  }
  
  // Test custom request
  console.log('\n\n🔹 PHASE 4: Custom Request');
  await testCustomRequest();
  
  // Summary
  console.log('\n\n' + '█'.repeat(60));
  console.log('  TEST SUITE COMPLETED');
  console.log('█'.repeat(60));
  console.log('\n📝 Notes:');
  console.log('   - If tests fail, check session.json has valid cookies');
  console.log('   - Update session.json with fresh cookies from browser');
  console.log('   - Verify the Bardi API endpoints are correct');
  console.log('   - Check network connectivity to ipc.bardi.co.id\n');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

