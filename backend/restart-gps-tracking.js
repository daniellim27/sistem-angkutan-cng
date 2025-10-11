// Script to restart GPS tracking with improved error handling
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-angkutan.onrender.com';

async function restartGPSTracking() {
  console.log('🔄 Restarting GPS tracking service...\n');

  try {
    // Test 1: Check server health
    console.log('1️⃣ Checking server health...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Server is healthy:', healthResponse.data.status);

    // Test 2: Get tracking stats
    console.log('\n2️⃣ Getting current tracking stats...');
    const statsResponse = await axios.get(`${BACKEND_URL}/api/web/tracking/stats`);
    if (statsResponse.data.success) {
      console.log('📊 Current tracking stats:', {
        activeVehicles: statsResponse.data.data.activeVehicles,
        totalVehicles: statsResponse.data.data.totalVehicles,
        recentLocations: statsResponse.data.data.recentLocations
      });
    }

    // Test 3: Manually trigger scraping to test recovery
    console.log('\n3️⃣ Manually triggering GPS scraping (sequential mode)...');
    const scrapeResponse = await axios.post(`${BACKEND_URL}/api/web/tracking/scrape?concurrent=false`, {}, {
      timeout: 120000 // 2 minute timeout
    });
    
    if (scrapeResponse.data.success) {
      console.log('✅ Manual scraping successful:', {
        recordsScraped: scrapeResponse.data.data.recordsScraped,
        processingMode: scrapeResponse.data.data.processingMode,
        duration: scrapeResponse.data.data.duration
      });
    }

    console.log('\n✨ GPS tracking restart completed successfully!');
    console.log('📝 The service should now be running with improved browser management.');

  } catch (error) {
    console.error('❌ Error during GPS tracking restart:', error.message);
    
    if (error.response) {
      console.error('📄 Response data:', error.response.data);
      console.error('📄 Response status:', error.response.status);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - server may be down or unreachable');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS resolution failed - check server URL');
    } else if (error.code === 'TIMEOUT') {
      console.error('⏰ Request timeout - server may be overloaded');
    }
  }
}

// Run immediately if called directly
if (require.main === module) {
  restartGPSTracking().catch(console.error);
}

module.exports = restartGPSTracking;
