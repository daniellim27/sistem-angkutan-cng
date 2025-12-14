// Script to update test car GPS location with current timestamp
// This ensures the test car appears on the map

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/utils/db');

async function updateTestCarLocation() {
  try {
    console.log('🔄 Updating test car GPS location...');

    // Update the timestamp for the test car's GPS location (most recent one)
    const result = await db.pool.query(`
      UPDATE driver_locations
      SET timestamp = NOW()
      WHERE id = (
        SELECT id FROM driver_locations
        WHERE vehicle_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST-1234')
           OR device_id = 'DEV-TEST-DEVICE-1'
        ORDER BY timestamp DESC
        LIMIT 1
      );
    `);

    if (result.rowCount === 0) {
      // If no existing location, create a new one
      console.log('📍 Creating new GPS location for test car...');
      
      const insertResult = await db.pool.query(`
        INSERT INTO driver_locations (
          driver_id,
          vehicle_id,
          latitude,
          longitude,
          altitude,
          speed,
          heading,
          accuracy,
          timestamp,
          device_id,
          battery_level,
          signal_strength,
          status
        )
        SELECT 
          (SELECT id FROM users WHERE username = 'jack_driver'),
          (SELECT id FROM vehicles WHERE license_plate = 'TEST-1234'),
          -6.2088000,
          106.8456000,
          10.0,
          0.0,
          0.0,
          5.0,
          NOW(),
          'DEV-TEST-DEVICE-1',
          90,
          80,
          'active'
        WHERE EXISTS (
          SELECT 1 FROM vehicles WHERE license_plate = 'TEST-1234'
        )
        RETURNING id;
      `);

      if (insertResult.rowCount > 0) {
        console.log('✅ Created new GPS location for test car');
      } else {
        console.log('⚠️  Test car vehicle not found. Please run the seeder first.');
      }
    } else {
      console.log(`✅ Updated ${result.rowCount} GPS location(s) for test car`);
    }

    // Verify the update
    const verifyResult = await db.pool.query(`
      SELECT 
        dl.id,
        dl.timestamp,
        dl.latitude,
        dl.longitude,
        dl.device_id,
        v.license_plate
      FROM driver_locations dl
      LEFT JOIN vehicles v ON dl.vehicle_id = v.id
      WHERE v.license_plate = 'TEST-1234' OR dl.device_id = 'DEV-TEST-DEVICE-1'
      ORDER BY dl.timestamp DESC
      LIMIT 1;
    `);

    if (verifyResult.rows.length > 0) {
      const location = verifyResult.rows[0];
      console.log('\n📊 Test car GPS location:');
      console.log(`   License Plate: ${location.license_plate || 'N/A'}`);
      console.log(`   Device ID: ${location.device_id || 'N/A'}`);
      console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
      console.log(`   Timestamp: ${location.timestamp}`);
      console.log(`   Age: ${Math.round((Date.now() - new Date(location.timestamp).getTime()) / 1000 / 60)} minutes ago`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating test car location:', error);
    process.exit(1);
  }
}

updateTestCarLocation();

