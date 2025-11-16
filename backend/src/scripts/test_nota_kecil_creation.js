/**
 * Test script to trigger nota kecil creation from existing screenshots
 * 
 * Usage (inside container):
 *   node src/scripts/test_nota_kecil_creation.js [sessionId] [batchNumber]
 * 
 * Examples:
 *   node src/scripts/test_nota_kecil_creation.js              # Use first session, batch 1
 *   node src/scripts/test_nota_kecil_creation.js 1            # Use session 1, batch 1
 *   node src/scripts/test_nota_kecil_creation.js 1 5          # Use session 1, batch 5
 */

const path = require('path');
const { sequelize, CCTVSession, CCTVScreenshot, NotaKecil } = require('../models');
const cctvScheduler = require('../services/cctvScheduler');
const { Op } = require('sequelize');

// TEMPORARY: Should match the value in cctvScheduler.js
const CAPTURES_PER_BATCH = 1;

async function testNotaKecilCreation() {
  try {
    console.log('🧪 Testing Nota Kecil Creation\n');
    
    // Parse command line arguments
    const sessionId = process.argv[2] ? parseInt(process.argv[2]) : null;
    const batchNumberArg = process.argv[3] ? parseInt(process.argv[3]) : 1;
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Find session
    let session;
    if (sessionId) {
      session = await CCTVSession.findByPk(sessionId, {
        include: ['delivery_order']
      });
      
      if (!session) {
        console.error(`❌ Session ${sessionId} not found`);
        process.exit(1);
      }
      
      console.log(`📋 Using session ${session.id}: ${session.customer_name}`);
    } else {
      // Get first active session
      session = await CCTVSession.findOne({
        where: {
          status: 'active'
        },
        include: ['delivery_order'],
        order: [['created_at', 'DESC']]
      });
      
      if (!session) {
        console.error('❌ No active sessions found');
        process.exit(1);
      }
      
      console.log(`📋 Using first active session ${session.id}: ${session.customer_name}`);
    }
    
    // Get total screenshots for this session
    const totalScreenshots = await CCTVScreenshot.count({
      where: {
        session_id: session.id,
        is_deleted: false
      }
    });
    
    console.log(`📸 Total screenshots in session: ${totalScreenshots}\n`);
    
    if (totalScreenshots === 0) {
      console.error('❌ No screenshots found for this session');
      process.exit(1);
    }
    
    // Calculate batch parameters
    const batchNumber = batchNumberArg;
    const startSequence = (batchNumber - 1) * CAPTURES_PER_BATCH + 1;
    const endSequence = batchNumber * CAPTURES_PER_BATCH;
    
    console.log(`📊 Batch Configuration:`);
    console.log(`   Batch Number: ${batchNumber}`);
    console.log(`   Start Sequence: ${startSequence}`);
    console.log(`   End Sequence: ${endSequence}`);
    console.log(`   Captures per Batch: ${CAPTURES_PER_BATCH}\n`);
    
    // Check if screenshots exist for this batch
    const batchScreenshots = await CCTVScreenshot.findAll({
      where: {
        session_id: session.id,
        sequence_number: {
          [Op.gte]: startSequence,
          [Op.lte]: endSequence
        },
        is_deleted: false
      },
      order: [['sequence_number', 'ASC']]
    });
    
    console.log(`📷 Screenshots in batch range:`);
    console.log(`   Found: ${batchScreenshots.length} screenshot(s)`);
    
    if (batchScreenshots.length === 0) {
      console.error(`❌ No screenshots found for sequence range ${startSequence}-${endSequence}`);
      
      // Show available sequences
      const allScreenshots = await CCTVScreenshot.findAll({
        where: {
          session_id: session.id,
          is_deleted: false
        },
        attributes: ['sequence_number'],
        order: [['sequence_number', 'ASC']],
        limit: 10
      });
      
      if (allScreenshots.length > 0) {
        const sequences = allScreenshots.map(s => s.sequence_number).join(', ');
        console.log(`   Available sequences (first 10): ${sequences}`);
      }
      
      process.exit(1);
    }
    
    batchScreenshots.forEach((screenshot, idx) => {
      const ocrStatus = screenshot.ocr_status || 'pending';
      const hasResult = screenshot.ocr_result ? '✅' : '❌';
      const meterReading = screenshot.ocr_result ? 
        (typeof screenshot.ocr_result === 'string' ? 
          JSON.parse(screenshot.ocr_result)?.meter_reading : 
          screenshot.ocr_result?.meter_reading) : 'N/A';
      console.log(`   ${idx + 1}. Sequence ${screenshot.sequence_number}: ${ocrStatus} ${hasResult} (meter: ${meterReading})`);
    });
    console.log('');
    
    // Count existing notas for this session
    const existingNotas = await NotaKecil.count({
      where: {
        delivery_order_id: session.delivery_order_id,
        customer_location_index: session.customer_location_index,
        created_at: {
          [Op.gte]: session.start_time
        }
      }
    });
    
    console.log(`📋 Existing Nota Kecils for this session: ${existingNotas}`);
    console.log(`📋 Expected Nota Kecils (based on screenshots): ${Math.floor(totalScreenshots / CAPTURES_PER_BATCH)}\n`);
    
    // Prepare batch markers in session (if needed)
    if (!session.nota_batch_start_sequence || !session.nota_batch_end_sequence) {
      console.log('📝 Setting batch markers in session...');
      await session.update({
        nota_batch_start_sequence: startSequence,
        nota_batch_end_sequence: endSequence,
        nota_batch_capture_count: batchScreenshots.length,
        nota_batch_start_at: batchScreenshots[0]?.captured_at || session.nota_batch_start_at,
        nota_batch_end_at: batchScreenshots[batchScreenshots.length - 1]?.captured_at || session.nota_batch_end_at,
      });
      console.log('✅ Batch markers set\n');
    } else {
      console.log('📝 Batch markers already set in session\n');
    }
    
    // Trigger nota kecil creation
    console.log('🚀 Triggering nota kecil creation...\n');
    const created = await cctvScheduler.createNotaKecilFromBatch(session, {
      startSequence,
      endSequence,
      batchNumber,
    });
    
    if (created) {
      console.log('\n✅ Nota Kecil created successfully!');
      
      // Fetch the created nota kecil
      const notaKecils = await NotaKecil.findAll({
        where: {
          delivery_order_id: session.delivery_order_id,
          customer_location_index: session.customer_location_index,
          created_at: {
            [Op.gte]: session.start_time
          }
        },
        order: [['created_at', 'DESC']],
        limit: 1
      });
      
      if (notaKecils.length > 0) {
        const nota = notaKecils[0];
        console.log(`\n📋 Created Nota Kecil Details:`);
        console.log(`   ID: ${nota.id}`);
        console.log(`   Stan Awal: ${nota.stan_awal}`);
        console.log(`   Stan Akhir: ${nota.stan_akhir}`);
        console.log(`   Tekanan Operasi: ${nota.tekanan_operasi} bar`);
        console.log(`   Temperatur Operasi: ${nota.temperatur_operasi}°C`);
        console.log(`   Volume (V): ${nota.V} m³`);
        console.log(`   OCR Status: ${nota.ocr_processing_status || 'N/A'}`);
        console.log(`   Driver Notes: ${nota.driver_notes || 'N/A'}`);
      }
    } else {
      console.log('\n❌ Failed to create nota kecil');
      console.log('   Check the logs above for details');
    }
    
  } catch (error) {
    console.error('\n💥 Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the test
testNotaKecilCreation();

