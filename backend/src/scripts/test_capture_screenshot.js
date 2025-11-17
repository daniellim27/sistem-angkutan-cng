/**
 * Test script to verify screenshot capture works after circular dependency fix
 * 
 * Usage (inside container):
 *   node src/scripts/test_capture_screenshot.js [sessionId]
 * 
 * Example:
 *   node src/scripts/test_capture_screenshot.js 3
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { sequelize, CCTVSession } = require('../models');
const cctvMonitoringService = require('../services/cctvMonitoringService');

async function testCaptureScreenshot() {
  try {
    console.log('🧪 Testing Screenshot Capture\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Parse command line arguments
    const sessionId = process.argv[2] ? parseInt(process.argv[2]) : null;
    
    // Find session
    let session;
    if (sessionId) {
      session = await CCTVSession.findByPk(sessionId);
      
      if (!session) {
        console.error(`❌ Session ${sessionId} not found`);
        process.exit(1);
      }
      
      if (session.status !== 'active') {
        console.error(`❌ Session ${sessionId} is not active (status: ${session.status})`);
        process.exit(1);
      }
      
      console.log(`📋 Using session ${session.id}: ${session.customer_name}`);
    } else {
      // Get first active session
      session = await CCTVSession.findOne({
        where: {
          status: 'active'
        },
        order: [['created_at', 'DESC']]
      });
      
      if (!session) {
        console.error('❌ No active sessions found');
        process.exit(1);
      }
      
      console.log(`📋 Using first active session ${session.id}: ${session.customer_name}`);
    }
    
    console.log(`\n📸 Attempting to capture screenshot...\n`);
    
    // Test the captureScreenshot function
    const result = await cctvMonitoringService.captureScreenshot(session.id, {
      processOcr: true
    });
    
    if (result && result.success) {
      console.log('\n✅ SUCCESS! Screenshot capture is working!');
      console.log(`   Screenshot ID: ${result.screenshot?.id || 'N/A'}`);
      console.log(`   Sequence: ${result.screenshot?.sequence_number || 'N/A'}`);
      console.log(`   Status: ${result.screenshot?.ocr_status || 'N/A'}`);
    } else {
      console.log('\n❌ FAILED! Screenshot capture returned an error:');
      console.log(`   ${JSON.stringify(result, null, 2)}`);
    }
    
  } catch (error) {
    if (error.message.includes('captureScreenshot is not a function')) {
      console.error('\n❌ FAILED! Circular dependency still exists!');
      console.error('   Error:', error.message);
    } else {
      console.error('\n💥 Error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the test
testCaptureScreenshot();

