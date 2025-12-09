const cron = require('node-cron');
// Note: cctvMonitoringService is lazy-loaded to avoid circular dependency
const { CCTVSession, CCTVScreenshot, NotaKecil } = require('../models');
const gasCalculationService = require('./gasCalculationService');
const { Op } = require('sequelize');

const CAPTURES_PER_BATCH = 24;
const CAPTURES_PER_NOTA_KECIL = 6;

// Helper function to safely get cctvMonitoringService (avoids circular dependency)
async function getCctvMonitoringService(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Clear cache to force fresh load
      const modulePath = require.resolve('./cctvMonitoringService');
      if (require.cache[modulePath]) {
        delete require.cache[modulePath];
      }
      
      const service = require('./cctvMonitoringService');
      
      // Debug logging
      console.log(`[getCctvMonitoringService] Attempt ${i + 1}: service=${!!service}, type=${typeof service}, hasCaptureScreenshot=${typeof service?.captureScreenshot}`);
      
      // Check if service and method exist
      if (service && typeof service.captureScreenshot === 'function') {
        console.log(`[getCctvMonitoringService] ✅ Service loaded successfully on attempt ${i + 1}`);
        return service;
      }
      
      // If not ready, wait a bit and retry
      if (i < maxRetries - 1) {
        console.log(`[getCctvMonitoringService] ⏳ Service not ready, waiting before retry ${i + 2}...`);
        // Small delay to allow module to fully initialize
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Increasing delay: 100ms, 200ms, 300ms
      }
    } catch (error) {
      console.error(`[getCctvMonitoringService] ❌ Error loading cctvMonitoringService (attempt ${i + 1}/${maxRetries}):`, error.message);
      if (i === maxRetries - 1) {
        throw new Error(`Failed to load cctvMonitoringService after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error('cctvMonitoringService.captureScreenshot is not available');
}

class CCTVScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.stats = {
      totalRuns: 0,
      successfulCaptures: 0,
      failedCaptures: 0,
      notasCreated: 0,
      lastRunTime: null,
    };
  }

  /**
   * Start the CCTV scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  CCTV Scheduler is already running');
      return false;
    }

    console.log('🎬 Starting CCTV Auto-Capture Scheduler...');

    // Run every 10 minutes to check sessions
    this.cronJob = cron.schedule('*/10 * * * *', async () => {
      await this.runScheduledTasks();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;

    console.log('✅ CCTV Scheduler started successfully');
    console.log('📅 Checking for screenshot captures every 10 minutes');
    
    // Run immediate capture for all active sessions when starting
    console.log('📸 Running immediate capture for all active sessions...');
    setTimeout(() => {
      this.captureAllActiveSessions();
    }, 2000);

    return true;
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('⏹️  CCTV Scheduler stopped');
  }

  /**
   * Run scheduled tasks
   */
  async runScheduledTasks() {
    if (!this.isRunning) return;

    try {
      this.stats.totalRuns++;
      this.stats.lastRunTime = new Date();

      console.log(`\n🔄 CCTV Scheduler Cycle #${this.stats.totalRuns} - ${this.stats.lastRunTime.toLocaleString()}`);

      // Get all active sessions
      const activeSessions = await CCTVSession.findAll({
        where: {
          status: 'active'
        }
      });

      if (activeSessions.length === 0) {
        console.log('   No active CCTV sessions found');
        return;
      }

      console.log(`   Found ${activeSessions.length} active session(s)`);

      for (const session of activeSessions) {
        await this.processSession(session);
      }

      console.log(`✅ Scheduler cycle completed`);
      console.log(`   Stats: ${this.stats.successfulCaptures} total captures, ${this.stats.failedCaptures} failures, ${this.stats.notasCreated} notas created\n`);

    } catch (error) {
      console.error('❌ Error in CCTV scheduler:', error);
    }
  }

  /**
   * Process a single session
   */
  async processSession(session) {
    try {
      // Check if it's time for a screenshot
      const shouldCapture = await this.shouldCaptureScreenshot(session);
      
      if (shouldCapture) {
        console.log(`   📸 Capturing screenshot for session ${session.id} (${session.customer_name})`);
        
        try {
          // Lazy load cctvMonitoringService to avoid circular dependency
          const cctvMonitoringService = await getCctvMonitoringService();
          await cctvMonitoringService.captureScreenshot(session.id);
          this.stats.successfulCaptures++;
          console.log(`   ✅ Screenshot captured successfully`);

          // After every capture, reconcile pending nota kecil batches
          await this.processPendingNotaBatches(session);
          
        } catch (error) {
          this.stats.failedCaptures++;
          console.error(`   ❌ Screenshot capture failed:`, error.message);
          
          // Mark session as dead if too many consecutive failures
          if (error.message.includes('expired') || error.message.includes('login')) {
            await session.update({
              status: 'dead',
              session_notes: `${session.session_notes || ''}\nAuto-marked dead: ${error.message}`.trim()
            });
            console.log(`   ⚠️  Session ${session.id} marked as dead`);
          }
        }
      } else {
        // Even if we don't capture now, check if there are pending nota batches (e.g., from manual captures)
        await this.processPendingNotaBatches(session);
        console.log(`   ⏭️  Session ${session.id} - not yet time for next capture`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing session ${session.id}:`, error.message);
    }
  }

  /**
   * Check if it's time to capture a screenshot for this session
   */
  async shouldCaptureScreenshot(session) {
    const now = new Date();
    
    // If never captured, capture now
    if (!session.last_screenshot_at) {
      return true;
    }

    const lastCapture = new Date(session.last_screenshot_at);
    const minutesSinceLastCapture = Math.floor((now - lastCapture) / (1000 * 60));
    const intervalMinutes = session.screenshot_interval_minutes || 10;

    // Time for next capture?
    return minutesSinceLastCapture >= intervalMinutes;
  }

  /**
   * Process pending nota kecil batches for a session
   * Handles both backlog (existing captures) and new captures
   */
  // ✅ NEW: Every 6 screenshots (1 hour) = 1 Nota Kecil
  async processPendingNotaBatches(session) {
    try {
      await session.reload();
      const totalCaptures = session.total_screenshots_captured || 0;

      // Count existing notas for this session (delivery_order_id is now optional)
      const whereClause = {
        customer_location_index: session.customer_location_index,
        cctv_session_id: session.id // ✅ Link to specific session
      };
      
      // Only filter by delivery_order_id if it exists
      if (session.delivery_order_id) {
        whereClause.delivery_order_id = session.delivery_order_id;
      } else {
        // If no delivery_order_id, ensure we only count notas without DO for this session
        whereClause.delivery_order_id = null;
      }
      
      const existingNotas = await NotaKecil.count({
        where: whereClause
      });

      const expectedNotas = Math.floor(totalCaptures / CAPTURES_PER_NOTA_KECIL);
      
      if (existingNotas < expectedNotas) {
        console.log(`   📦 Session ${session.id}: Creating ${expectedNotas - existingNotas} pending nota(s)...`);
        
        for (let i = existingNotas; i < expectedNotas; i++) {
          const batchNumber = i + 1;
          const startSeq = (batchNumber - 1) * CAPTURES_PER_NOTA_KECIL + 1;
          const endSeq = batchNumber * CAPTURES_PER_NOTA_KECIL;

          await this.createNotaKecilFromBatch(session, {
            startSequence: startSeq,
            endSequence: endSeq,
            batchNumber
          });
        }
      }

      // Track remainder for next nota
      const remainder = totalCaptures % CAPTURES_PER_NOTA_KECIL;
      if (remainder > 0) {
        console.log(`   📊 Progress: ${remainder}/${CAPTURES_PER_NOTA_KECIL} → Next nota in ${CAPTURES_PER_NOTA_KECIL - remainder} screenshots`);
      }

    } catch (error) {
      console.error(`   ❌ Batch processing failed:`, error);
    }
  }

  /**
   * Create Nota Kecil from a completed batch (CAPTURES_PER_BATCH captures)
   */
  /**
   * ✅ NEW: Create Nota Kecil from CONTINUOUS STAN batch (every 6 screenshots = 1 hour)
   */
  /**
  /**
   * ✅ FIXED: Create Nota Kecil that matches your model schema
   * Uses the existing fields: stan_awal, current_stan, stan_akhir, pressure_inlet, pressure_outlet, temperature, volume_delta, k
   */
  async createNotaKecilFromBatch(session, batchInfo) {
    try {
      const { startSequence, endSequence, batchNumber } = batchInfo;
      
      console.log(`📦 Creating Nota Kecil for batch ${batchNumber} (sequences ${startSequence}-${endSequence})...`);

      // Check if a nota kecil already exists for this batch (unless force is true)
      // Note: Recalibrate should be able to recreate, so we'll allow it but log it
      const existingNota = await NotaKecil.findOne({
        where: {
          cctv_session_id: session.id,
          batch_start_sequence: startSequence,
          batch_end_sequence: endSequence
        }
      });

      if (existingNota && !batchInfo.force) {
        console.log(`   ⚠️  Nota Kecil already exists for this batch (ID: ${existingNota.id}), skipping...`);
        return true; // Return true because the nota already exists
      }

      if (existingNota && batchInfo.force) {
        console.log(`   🔄 Deleting existing Nota Kecil (ID: ${existingNota.id}) for recalibration...`);
        await existingNota.destroy();
      }

      // Get ALL successful OCR results from this session for the batch range
      const allSuccessfulScreenshots = await CCTVScreenshot.findAll({
        where: {
          session_id: session.id,
          is_deleted: false,
          sequence_number: {
            [Op.between]: [startSequence, endSequence]
          },
          ocr_status: 'success'
        },
        order: [['captured_at', 'DESC']] // Most recent first
      });

      console.log(`   📸 Found ${allSuccessfulScreenshots.length} successful OCR screenshots`);

      if (allSuccessfulScreenshots.length === 0) {
        console.log(`   ⚠️  No successful OCR screenshots found for batch ${batchNumber} (sequences ${startSequence}-${endSequence})`);
        console.log(`   💡 Check if screenshots in this range have ocr_status='success'`);
        return false;
      }

      // ✅ GET THE MOST RECENT SCREENSHOT FOR REPRESENTATIVE IMAGE
      const representativeScreenshot = allSuccessfulScreenshots[0]; // Most recent
      console.log(`   🖼️ Using screenshot ${representativeScreenshot.id} as representative image`);

      // ✅ EXTRACT SENSOR READINGS FROM MOST RECENT 6 SCREENSHOTS
      const recentScreenshots = allSuccessfulScreenshots.slice(0, 6); // Get 6 most recent
      console.log(`   📊 Using ${recentScreenshots.length} most recent screenshots for averages`);

      const sensorReadings = {
        stan: [],
        pressure_inlet: [],
        pressure_outlet: [],
        temperature: []
      };

      // Extract readings from the 6 most recent screenshots
      recentScreenshots.forEach(screenshot => {
        const ocr = screenshot.ocr_result || {};
        
        // Extract readings that exist
        if (ocr.stan !== null && ocr.stan !== undefined) {
          const val = parseFloat(ocr.stan);
          if (!isNaN(val)) sensorReadings.stan.push(val);
        }
        if (ocr.meter_reading !== null && ocr.meter_reading !== undefined) {
          const val = parseFloat(ocr.meter_reading);
          if (!isNaN(val)) sensorReadings.stan.push(val);
        }
        if (ocr.pressure_inlet !== null && ocr.pressure_inlet !== undefined) {
          const val = parseFloat(ocr.pressure_inlet);
          if (!isNaN(val)) sensorReadings.pressure_inlet.push(val);
        }
        if (ocr.pressure_outlet !== null && ocr.pressure_outlet !== undefined) {
          const val = parseFloat(ocr.pressure_outlet);
          if (!isNaN(val)) sensorReadings.pressure_outlet.push(val);
        }
        if (ocr.temperature !== null && ocr.temperature !== undefined) {
          const val = parseFloat(ocr.temperature);
          if (!isNaN(val)) sensorReadings.temperature.push(val);
        }
        if (ocr.pressure !== null && ocr.pressure !== undefined) {
          const val = parseFloat(ocr.pressure);
          if (!isNaN(val)) {
            // Distribute to both if we don't know which pressure
            sensorReadings.pressure_inlet.push(val);
            sensorReadings.pressure_outlet.push(val);
          }
        }
      });

      console.log(`   📊 Readings extracted from recent screenshots:`, {
        stan: sensorReadings.stan.length,
        pressure_inlet: sensorReadings.pressure_inlet.length,
        pressure_outlet: sensorReadings.pressure_outlet.length,
        temperature: sensorReadings.temperature.length
      });

      // ✅ CALCULATE AVERAGES (for pressure_inlet, pressure_outlet, temperature)
      const calculateAverage = (readings) => {
        if (readings.length === 0) return null;
        const sum = readings.reduce((a, b) => a + b, 0);
        const avg = sum / readings.length;
        return Math.round(avg * 100) / 100; // Round to 2 decimal places
      };

      // Calculate averages for sensors (using all available readings from recent screenshots)
      const avgPressureInlet = calculateAverage(sensorReadings.pressure_inlet);
      const avgPressureOutlet = calculateAverage(sensorReadings.pressure_outlet);
      const avgTemperature = calculateAverage(sensorReadings.temperature);

      // ✅ SPECIAL CALCULATION FOR STAN: Rolling window (latest vs 6 readings ago)
      let stanAwal = 0;
      let currentStan = 0;
      let stanAkhir = 0;

      if (sensorReadings.stan.length > 0) {
        // Use ALL stan readings from the batch for the rolling window calculation
        const allStanReadings = [];
        
        // Extract stan readings from ALL screenshots in the batch (not just recent 6)
        allSuccessfulScreenshots.forEach(screenshot => {
          const ocr = screenshot.ocr_result || {};
          if (ocr.stan !== null && ocr.stan !== undefined) {
            const val = parseFloat(ocr.stan);
            if (!isNaN(val)) allStanReadings.push(val);
          }
          if (ocr.meter_reading !== null && ocr.meter_reading !== undefined) {
            const val = parseFloat(ocr.meter_reading);
            if (!isNaN(val)) allStanReadings.push(val);
          }
        });

        if (allStanReadings.length > 0) {
          // Sort by sequence (ascending) to get chronological order
          const chronologicalStan = allStanReadings.reverse();
          
          currentStan = chronologicalStan[chronologicalStan.length - 1]; // Latest reading
          
          // Find stan from 6 readings ago (or use oldest available)
          const lookbackIndex = Math.max(0, chronologicalStan.length - 6);
          stanAwal = chronologicalStan[lookbackIndex];
          
          stanAkhir = currentStan - stanAwal;
          
          console.log(`   🔢 STAN calculation: ${stanAwal} → ${currentStan} = ${stanAkhir} m³`);
          console.log(`   📈 STAN readings used: ${chronologicalStan.length} total, window: ${lookbackIndex} to ${chronologicalStan.length - 1}`);
        }
      }

      // ✅ FIXED: Use model's existing fields for volume calculation
      const k = 1.0; // Default correction factor
      const volume_delta = stanAkhir * k; // This is what the frontend shows as "Final Usage"

      // ✅ CREATE NOTA KECIL WITH REPRESENTATIVE SCREENSHOT
      // Only include delivery_order_id if session has one (now optional)
      const notaData = {
        customer_location_index: session.customer_location_index,
        customer_name: session.customer_name,
        customer_address: session.customer_address || 'Auto-generated from CCTV session',
        cctv_session_id: session.id,
      
        // Batch tracking
        batch_start_sequence: startSequence,
        batch_end_sequence: endSequence,
        screenshots_count: allSuccessfulScreenshots.length,
        ocr_success_count: allSuccessfulScreenshots.length,
      
        // ✅ NEW: Representative screenshot
        representative_screenshot_url: representativeScreenshot.screenshot_url,
        representative_screenshot_id: representativeScreenshot.id,
      
        // ✅ STAN DATA
        stan_awal: stanAwal,
        current_stan: currentStan,
        stan_akhir: stanAkhir,
      
        // ✅ SENSOR DATA
        pressure_inlet: avgPressureInlet,
        pressure_outlet: avgPressureOutlet,
        temperature: avgTemperature,
      
        // ✅ VOLUME CALCULATION
        volume_delta: volume_delta,
        k: k,
      
        // OCR metadata
        ocr_confidence_avg: allSuccessfulScreenshots.reduce((sum, s) => sum + (s.ocr_confidence_score || 0), 0) / allSuccessfulScreenshots.length,
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(),
      
        // Driver confirmation
        driver_confirmed: false,
        driver_confirmed_at: null,
        driver_notes: `Auto-generated from batch ${batchNumber} (${recentScreenshots.length} recent screenshots averaged)`,
      
        manual_values_used: false
      };

      // Only include delivery_order_id if session has one (now optional)
      if (session.delivery_order_id) {
        notaData.delivery_order_id = session.delivery_order_id;
      }

      // Create Nota Kecil
      const notaKecil = await NotaKecil.create(notaData);

      console.log(`   ✅ Nota Kecil created: ID ${notaKecil.id}`);
      console.log(`   🖼️ Representative screenshot: ${representativeScreenshot.screenshot_url}`);
      console.log(`   📊 AVERAGED SENSOR DATA (from ${recentScreenshots.length} most recent screenshots):`);
      console.log(`      STAN: ${stanAwal} → ${currentStan} = ${stanAkhir} m³`);
      console.log(`      FINAL USAGE (volume_delta): ${volume_delta} m³`);
      console.log(`      Pressure Inlet: ${avgPressureInlet} bar (from ${sensorReadings.pressure_inlet.length} readings)`);
      console.log(`      Pressure Outlet: ${avgPressureOutlet} bar (from ${sensorReadings.pressure_outlet.length} readings)`);
      console.log(`      Temperature: ${avgTemperature}°C (from ${sensorReadings.temperature.length} readings)`);
      
      this.stats.notasCreated++;
      return true;

    } catch (error) {
      console.error(`   ❌ Nota Kecil creation failed:`, error);
      return false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      stats: {
        ...this.stats,
        uptime: this.stats.lastRunTime 
          ? Math.floor((new Date() - this.stats.lastRunTime) / 1000) 
          : 0
      }
    };
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return this.stats;
  }

  /**
   * Immediately capture screenshots for all active sessions (async/background)
   * Called when scheduler is started via toggle
   * Returns immediately with session count, actual captures happen in background
   */
  async captureAllActiveSessions(runInBackground = true) {
    try {
      console.log('\n🎬 IMMEDIATE CAPTURE - Capturing all active sessions...');

      // Get all active sessions
      const activeSessions = await CCTVSession.findAll({
        where: {
          status: 'active'
        }
      });

      if (activeSessions.length === 0) {
        console.log('   No active sessions to capture');
        return {
          success: true,
          captured: 0,
          failed: 0,
          sessions: [],
          totalSessions: 0,
          status: 'completed'
        };
      }

      console.log(`   Found ${activeSessions.length} active session(s)`);

      // If running in background, return immediately and process async
      if (runInBackground) {
        console.log(`   🚀 Starting background capture for ${activeSessions.length} session(s)...`);
        
        // Run captures in background (don't await)
        this.runBackgroundCaptures(activeSessions);
        
        // Return immediately
        return {
          success: true,
          totalSessions: activeSessions.length,
          status: 'processing',
          message: `Started background capture for ${activeSessions.length} session(s)`
        };
      }

      // Synchronous mode (for testing/manual triggers)
      const results = await this.runBackgroundCaptures(activeSessions);
      return results;

    } catch (error) {
      console.error('❌ Error in immediate capture:', error);
      throw error;
    }
  }

  /**
   * Run captures in background
   */
  async runBackgroundCaptures(sessions) {
    const results = {
      success: true,
      captured: 0,
      failed: 0,
      sessions: [],
      totalSessions: sessions.length
    };

    console.log(`\n🔄 Processing ${sessions.length} capture(s) in background...`);

    // Capture screenshots for all active sessions
    for (const session of sessions) {
      try {
        console.log(`   📸 Capturing session ${session.id} (${session.customer_name})`);
        
        // Lazy load cctvMonitoringService to avoid circular dependency
        const cctvMonitoringService = await getCctvMonitoringService();
        await cctvMonitoringService.captureScreenshot(session.id);
        
        // Process pending nota batches after manual capture run
        try {
          await this.processPendingNotaBatches(session);
        } catch (batchError) {
          console.error(`   ⚠️  Batch processing failed for session ${session.id}:`, batchError.message);
        }
        
        results.captured++;
        results.sessions.push({
          id: session.id,
          customer_name: session.customer_name,
          status: 'success'
        });
        
        console.log(`   ✅ Session ${session.id} captured successfully`);
        
      } catch (error) {
        results.failed++;
        results.sessions.push({
          id: session.id,
          customer_name: session.customer_name,
          status: 'failed',
          error: error.message
        });
        
        console.error(`   ❌ Session ${session.id} capture failed:`, error.message);
      }
    }

    console.log(`\n✅ Background capture completed: ${results.captured} succeeded, ${results.failed} failed\n`);
    
    // Update stats
    this.stats.successfulCaptures += results.captured;
    this.stats.failedCaptures += results.failed;

    return results;
  }
}

// Export singleton instance
const cctvScheduler = new CCTVScheduler();
module.exports = cctvScheduler;

