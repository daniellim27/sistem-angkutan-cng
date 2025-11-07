/**
 * Test if CCTV routes can be loaded without errors
 */

require('dotenv').config();

console.log('Testing CCTV routes loading...\n');

try {
  console.log('1. Loading models...');
  const db = require('./src/models');
  console.log('✓ Models loaded');
  console.log('  - CCTVSession:', typeof db.CCTVSession);
  console.log('  - CCTVScreenshot:', typeof db.CCTVScreenshot);
  
  console.log('\n2. Loading services...');
  const cctvService = require('./src/services/cctvMonitoringService');
  console.log('✓ CCTV Service loaded');
  
  const meterOcrService = require('./src/services/meterOcrService');
  console.log('✓ Meter OCR Service loaded');
  
  console.log('\n3. Loading controller...');
  const controller = require('./src/controllers/cctvMonitoring.controller');
  console.log('✓ Controller loaded');
  console.log('  - getSessions:', typeof controller.getSessions);
  console.log('  - createSession:', typeof controller.createSession);
  
  console.log('\n4. Loading routes...');
  const routes = require('./src/routes/cctvMonitoring.routes');
  console.log('✓ Routes loaded');
  console.log('  - Route type:', typeof routes);
  
  console.log('\n✅ All CCTV components loaded successfully!');
  console.log('\nIf routes still 404, check that server.js is registering them correctly.');
  
} catch (error) {
  console.error('\n❌ Error loading CCTV components:');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}

