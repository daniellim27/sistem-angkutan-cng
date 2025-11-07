const cron = require('node-cron');
const cctvMonitoringService = require('./cctvMonitoringService');
const { CCTVSession, CCTVScreenshot, NotaKecil } = require('../models');
const gasCalculationService = require('./gasCalculationService');
const { Op } = require('sequelize');

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

    // Run every 1 minute to check sessions
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.runScheduledTasks();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;

    console.log('✅ CCTV Scheduler started successfully');
    console.log('📅 Checking for screenshot captures every minute');
    
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
      const now = new Date();
      const sessionStart = new Date(session.start_time);
      const sessionDurationMinutes = Math.floor((now - sessionStart) / (1000 * 60));
      const sessionDurationHours = sessionDurationMinutes / 60;

      // Check if it's time to create a nota kecil (every 4 hours)
      await this.checkAndCreateNotaKecil(session, sessionDurationHours);

      // Check if it's time for a screenshot
      const shouldCapture = await this.shouldCaptureScreenshot(session);
      
      if (shouldCapture) {
        console.log(`   📸 Capturing screenshot for session ${session.id} (${session.customer_name})`);
        
        try {
          await cctvMonitoringService.captureScreenshot(session.id);
          this.stats.successfulCaptures++;
          console.log(`   ✅ Screenshot captured successfully`);
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
   * Check if it's time to create a nota kecil (every 4 hours)
   * Track which period we're in and create nota for completed periods
   */
  async checkAndCreateNotaKecil(session, sessionDurationHours) {
    try {
      // Calculate how many 4-hour periods have passed
      const periodsCompleted = Math.floor(sessionDurationHours / 4);
      
      if (periodsCompleted === 0) {
        // Haven't reached 4 hours yet
        return;
      }

      // Check how many nota kecils we've already created for this session
      const existingNotas = await NotaKecil.findAll({
        where: {
          delivery_order_id: session.delivery_order_id,
          customer_location_index: session.customer_location_index
        },
        order: [['created_at', 'DESC']]
      });

      // Filter notas that were created during this session
      const sessionStart = new Date(session.start_time);
      const notasFromThisSession = existingNotas.filter(nota => 
        new Date(nota.created_at) >= sessionStart
      );

      const notasCreatedCount = notasFromThisSession.length;

      // Should we create a new nota kecil?
      if (periodsCompleted > notasCreatedCount) {
        const periodNumber = notasCreatedCount + 1;
        console.log(`\n⏰ Session ${session.id} - Creating Nota Kecil for period ${periodNumber} (hours ${(periodNumber-1)*4}-${periodNumber*4})`);
        
        await this.createNotaKecilForPeriod(session, periodNumber);
        this.stats.notasCreated++;
      }

    } catch (error) {
      console.error(`   ❌ Error checking nota kecil for session ${session.id}:`, error);
    }
  }

  /**
   * Create Nota Kecil for a specific 4-hour period
   */
  async createNotaKecilForPeriod(session, periodNumber) {
    try {
      console.log(`\n📊 Creating Nota Kecil for session ${session.id}, period ${periodNumber}...`);

      // Calculate time range for this period
      const sessionStart = new Date(session.start_time);
      const periodStartHours = (periodNumber - 1) * 4;
      const periodEndHours = periodNumber * 4;
      
      const periodStart = new Date(sessionStart.getTime() + periodStartHours * 60 * 60 * 1000);
      const periodEnd = new Date(sessionStart.getTime() + periodEndHours * 60 * 60 * 1000);

      console.log(`   Period ${periodNumber}: ${periodStart.toLocaleTimeString()} - ${periodEnd.toLocaleTimeString()}`);

      // Get screenshots for this specific 4-hour period
      const screenshots = await CCTVScreenshot.findAll({
        where: {
          session_id: session.id,
          ocr_status: 'success',
          is_deleted: false,
          captured_at: {
            [Op.gte]: periodStart,
            [Op.lt]: periodEnd
          }
        },
        order: [['captured_at', 'ASC']]
      });

      if (screenshots.length === 0) {
        console.log(`   ⚠️  No successful OCR data found for period ${periodNumber} - skipping nota kecil creation`);
        return;
      }

      console.log(`   Found ${screenshots.length} screenshot(s) with successful OCR`);

      // Extract meter readings from OCR results
      const meterReadings = [];
      for (const screenshot of screenshots) {
        try {
          // Handle JSONB - might be a string that needs parsing
          let ocrResult = screenshot.ocr_result;
          if (typeof ocrResult === 'string') {
            try {
              ocrResult = JSON.parse(ocrResult);
            } catch (e) {
              console.log(`   ⚠️  Failed to parse OCR result for screenshot ${screenshot.id}: ${e.message}`);
              continue;
            }
          }

          if (ocrResult && ocrResult.meter_reading !== undefined && ocrResult.meter_reading !== null) {
            const reading = parseFloat(ocrResult.meter_reading);
            if (!isNaN(reading) && reading > 0) {
              meterReadings.push(reading);
            } else {
              console.log(`   ⚠️  Invalid meter reading for screenshot ${screenshot.id}: ${ocrResult.meter_reading}`);
            }
          } else {
            console.log(`   ⚠️  No meter_reading found in OCR result for screenshot ${screenshot.id}`);
          }
        } catch (error) {
          console.error(`   ❌ Error processing OCR result for screenshot ${screenshot.id}:`, error.message);
        }
      }

      if (meterReadings.length < 2) {
        console.log(`   ⚠️  Insufficient meter readings for period ${periodNumber} (need at least 2, found ${meterReadings.length})`);
        console.log(`   ⚠️  Skipping nota kecil creation for this period. Session continues...`);
        await session.update({
          session_notes: `${session.session_notes || ''}\nPeriod ${periodNumber}: Insufficient OCR data (${meterReadings.length} readings). Skipped nota kecil creation.`.trim()
        });
        return;
      }

      // Calculate averages (use first and last readings for stan_awal and stan_akhir)
      const stan_awal = meterReadings[0];
      const stan_akhir = meterReadings[meterReadings.length - 1];

      // Get average pressure and temperature from all readings
      let totalPressure = 0;
      let totalTemperature = 0;
      let pressureCount = 0;
      let temperatureCount = 0;

      for (const screenshot of screenshots) {
        try {
          // Handle JSONB - might be a string that needs parsing
          let ocrResult = screenshot.ocr_result;
          if (typeof ocrResult === 'string') {
            try {
              ocrResult = JSON.parse(ocrResult);
            } catch (e) {
              continue; // Skip this screenshot if parsing fails
            }
          }

          if (ocrResult) {
            const pressure = parseFloat(ocrResult.pressure || ocrResult.tekanan_operasi || 0);
            const temperature = parseFloat(ocrResult.temperature || ocrResult.temperatur_operasi || 0);
            
            if (!isNaN(pressure) && pressure > 0) {
              totalPressure += pressure;
              pressureCount++;
            }
            
            if (!isNaN(temperature) && temperature !== 0) { // Allow negative temperatures
              totalTemperature += temperature;
              temperatureCount++;
            }
          }
        } catch (error) {
          console.error(`   ❌ Error extracting pressure/temp from screenshot ${screenshot.id}:`, error.message);
        }
      }

      const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0;
      const avgTemperature = temperatureCount > 0 ? totalTemperature / temperatureCount : 0;

      console.log(`   📏 Meter readings: Stan Awal=${stan_awal}, Stan Akhir=${stan_akhir}`);
      console.log(`   📏 Averages: Pressure=${avgPressure.toFixed(2)} bar, Temp=${avgTemperature.toFixed(2)}°C`);
      console.log(`   📊 Data quality: ${meterReadings.length} meter readings, ${pressureCount} pressure readings, ${temperatureCount} temperature readings`);

      // Validate required values before creating nota kecil
      if (avgPressure <= 0) {
        console.log(`   ⚠️  Invalid average pressure (${avgPressure}). Skipping nota kecil creation.`);
        await session.update({
          session_notes: `${session.session_notes || ''}\nPeriod ${periodNumber}: Invalid pressure data. Skipped nota kecil creation.`.trim()
        });
        return;
      }

      if (avgTemperature < -50 || avgTemperature > 100) {
        console.log(`   ⚠️  Invalid average temperature (${avgTemperature}°C). Skipping nota kecil creation.`);
        await session.update({
          session_notes: `${session.session_notes || ''}\nPeriod ${periodNumber}: Invalid temperature data (${avgTemperature}°C). Skipped nota kecil creation.`.trim()
        });
        return;
      }

      // Calculate gas volume
      let gasCalculation;
      try {
        gasCalculation = gasCalculationService.calculateVolumeGas(
          stan_awal,
          stan_akhir,
          avgPressure,
          avgTemperature
        );
        
        if (!gasCalculation || !gasCalculation.Vt || !gasCalculation.V) {
          throw new Error('Gas calculation returned invalid results');
        }
      } catch (calcError) {
        console.error(`   ❌ Gas calculation failed:`, calcError.message);
        await session.update({
          session_notes: `${session.session_notes || ''}\nPeriod ${periodNumber}: Gas calculation failed (${calcError.message}). Skipped nota kecil creation.`.trim()
        });
        return;
      }

      // Create Nota Kecil for this period
      const notaKecil = await NotaKecil.create({
        delivery_order_id: session.delivery_order_id,
        customer_location_index: session.customer_location_index,
        customer_name: session.customer_name,
        customer_address: null, // Can be populated from delivery order if needed
        stan_awal: stan_awal,
        stan_akhir: stan_akhir,
        tekanan_operasi: avgPressure,
        temperatur_operasi: avgTemperature,
        Vt: gasCalculation.Vt,
        k: gasCalculation.k,
        V: gasCalculation.V,
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(),
        driver_confirmed: false, // Auto-created, needs driver confirmation
        driver_notes: `Auto-created from CCTV session ${session.id}, period ${periodNumber} (hours ${(periodNumber-1)*4}-${periodNumber*4}), ${screenshots.length} screenshots`
      });

      console.log(`   ✅ Nota Kecil #${notaKecil.id} created successfully`);
      console.log(`   📊 Volume: Vt=${gasCalculation.Vt.toFixed(3)}m³, k=${gasCalculation.k.toFixed(6)}, V=${gasCalculation.V.toFixed(3)}m³`);

      // Update session notes to track nota kecil creation (but keep session active!)
      const updatedNotes = `${session.session_notes || ''}\nNota Kecil #${notaKecil.id} created at ${periodNumber*4}h (period ${periodNumber}).`.trim();
      
      await session.update({
        session_notes: updatedNotes,
        // Keep session ACTIVE - don't stop it!
        // Only update the last created nota kecil reference
        created_nota_kecil_id: notaKecil.id
      });

      console.log(`   ✅ Nota Kecil created for period ${periodNumber}. Session continues...\n`);

    } catch (error) {
      console.error(`   ❌ Error creating nota kecil for session ${session.id}, period ${periodNumber}:`, error);
      
      // Don't stop the session - just log the error and continue
      await session.update({
        session_notes: `${session.session_notes || ''}\nFailed to create nota kecil for period ${periodNumber}: ${error.message}`.trim()
      });
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
        
        await cctvMonitoringService.captureScreenshot(session.id);
        
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

