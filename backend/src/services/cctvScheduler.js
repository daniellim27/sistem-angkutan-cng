const cron = require('node-cron');
const cctvMonitoringService = require('./cctvMonitoringService');
const { CCTVSession, CCTVScreenshot, NotaKecil } = require('../models');
const gasCalculationService = require('./gasCalculationService');
const { Op } = require('sequelize');

const CAPTURES_PER_BATCH = 24;

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
      // Check if it's time for a screenshot
      const shouldCapture = await this.shouldCaptureScreenshot(session);
      
      if (shouldCapture) {
        console.log(`   📸 Capturing screenshot for session ${session.id} (${session.customer_name})`);
        
        try {
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
  async processPendingNotaBatches(session) {
    try {
      await session.reload();
      const totalCaptures = session.total_screenshots_captured || 0;

      // Count how many nota kecils already exist for this session
      const existingNotas = await NotaKecil.count({
        where: {
          delivery_order_id: session.delivery_order_id,
          customer_location_index: session.customer_location_index,
          created_at: {
            [Op.gte]: session.start_time
          }
        }
      });

      const expectedNotas = Math.floor(totalCaptures / CAPTURES_PER_BATCH);
      let processedNotas = existingNotas;

      if (processedNotas < expectedNotas) {
        console.log(`   📦 Session ${session.id} has ${expectedNotas - processedNotas} pending nota kecil batch(es). Processing backlog...`);
      }

      while (processedNotas < expectedNotas) {
        const batchNumber = processedNotas + 1;
        const startSequence = (batchNumber - 1) * CAPTURES_PER_BATCH + 1;
        const endSequence = batchNumber * CAPTURES_PER_BATCH;

        const created = await this.createNotaKecilFromBatch(session, {
          startSequence,
          endSequence,
          batchNumber,
        });

        if (!created) {
          console.log(`   ⚠️  Unable to create nota kecil for batch ${batchNumber}. Will retry later.`);
          break;
        }

        this.stats.notasCreated++;
        processedNotas++;
      }

      const remainder = totalCaptures % CAPTURES_PER_BATCH;
      if (remainder === 0) {
        await session.update({
          nota_batch_start_at: null,
          nota_batch_start_sequence: null,
          nota_batch_capture_count: 0,
          nota_batch_end_at: null,
          nota_batch_end_sequence: null,
        });
      } else {
        const remainderStartSequence = totalCaptures - remainder + 1;
        const remainderStartScreenshot = await CCTVScreenshot.findOne({
          where: {
            session_id: session.id,
            sequence_number: remainderStartSequence,
            is_deleted: false,
          },
          order: [['sequence_number', 'ASC']],
        });

        await session.update({
          nota_batch_start_sequence: remainderStartSequence,
          nota_batch_capture_count: remainder,
          nota_batch_start_at: remainderStartScreenshot?.captured_at || session.nota_batch_start_at,
          nota_batch_end_at: null,
          nota_batch_end_sequence: null,
        });

        console.log(`   📊 Batch progress for session ${session.id}: ${remainder}/${CAPTURES_PER_BATCH} captures (start sequence ${remainderStartSequence})`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing nota batches for session ${session.id}:`, error);
    }
  }

  /**
   * Create Nota Kecil from a completed batch (CAPTURES_PER_BATCH captures)
   */
  async createNotaKecilFromBatch(session, options = {}) {
    try {
      await session.reload();

      const startSequence = options.startSequence ?? session.nota_batch_start_sequence;
      const endSequence = options.endSequence ?? session.nota_batch_end_sequence;

      if (!startSequence || !endSequence) {
        console.log(`   ⚠️  Batch markers missing - cannot create nota kecil`);
        return false;
      }

      const batchNumber = options.batchNumber ?? Math.floor((startSequence - 1) / CAPTURES_PER_BATCH) + 1;

      console.log(`\n📊 Creating Nota Kecil for session ${session.id}, batch ${batchNumber} (sequences ${startSequence}-${endSequence})...`);

      // Get screenshots for this batch range
      const batchScreenshots = await CCTVScreenshot.findAll({
        where: {
          session_id: session.id,
          sequence_number: {
            [Op.gte]: startSequence,
            [Op.lte]: endSequence
          }
        },
        order: [['sequence_number', 'ASC']]
      });

      if (batchScreenshots.length === 0) {
        console.log(`   ⚠️  No successful OCR data found in batch - skipping nota kecil creation`);
        return false;
      }

      const successfulScreenshots = batchScreenshots.filter(screenshot => screenshot.ocr_status === 'success');
      const totalInBatch = batchScreenshots.length;
      const failedCount = totalInBatch - successfulScreenshots.length;

      if (successfulScreenshots.length === 0) {
        console.log(`   ⚠️  No successful OCR data found in batch - skipping nota kecil creation`);
        return false;
      }

      console.log(`   Found ${successfulScreenshots.length} screenshot(s) with successful OCR in batch`);

      // Extract meter readings from OCR results (failed ones treated as 0)
      // Build in sequence order across the whole batch
      const meterReadings = [];
      for (const screenshot of batchScreenshots) {
        try {
          // Handle JSONB - might be a string that needs parsing
          let ocrResult = screenshot.ocr_result;
          if (typeof ocrResult === 'string') {
            try {
              ocrResult = JSON.parse(ocrResult);
            } catch (e) {
              console.log(`   ⚠️  Failed to parse OCR result for screenshot ${screenshot.id}: ${e.message}`);
              // Treat as failed => value 0
              meterReadings.push(0);
              continue;
            }
          }

          if (screenshot.ocr_status === 'success' && ocrResult && ocrResult.meter_reading !== undefined && ocrResult.meter_reading !== null) {
            const reading = parseFloat(ocrResult.meter_reading);
            meterReadings.push(!isNaN(reading) && reading > 0 ? reading : 0);
          } else {
            // Treat failed or missing as 0
            meterReadings.push(0);
          }
        } catch (error) {
          console.error(`   ❌ Error processing OCR result for screenshot ${screenshot.id}:`, error.message);
          meterReadings.push(0);
        }
      }

      // Get session meter_type to determine which field to calculate
      const meterType = session.meter_type;

      // Check minimum data based on meter_type (but don't block creation - we'll create with invalid_data status)
      // For stan_awal/stan_akhir, we need at least 2 meter readings (first and last)
      // For temperature/pressure, we need at least 1 valid value
      let hasMinimumData = false;
      let insufficientDataReason = null;
      
      if (meterType === 'stan_awal' || meterType === 'stan_akhir') {
        // Count non-zero meter readings
        const validMeterReadings = meterReadings.filter(r => r > 0);
        hasMinimumData = validMeterReadings.length >= 2;
        if (!hasMinimumData) {
          insufficientDataReason = `insufficient meter readings (need at least 2 for ${meterType}, found ${validMeterReadings.length})`;
          console.log(`   ⚠️  ${insufficientDataReason}`);
        }
      } else if (meterType === 'temperature') {
        // Check if we have at least 1 temperature value
        let tempCount = 0;
        for (const screenshot of batchScreenshots) {
          try {
            let ocrResult = screenshot.ocr_result;
            if (typeof ocrResult === 'string') {
              try {
                ocrResult = JSON.parse(ocrResult);
              } catch (e) {
                continue;
              }
            }
            const temperature = parseFloat(ocrResult?.temperature ?? ocrResult?.temperatur_operasi ?? 0);
            if (!isNaN(temperature)) {
              tempCount++;
            }
          } catch (error) {
            // Skip
          }
        }
        hasMinimumData = tempCount >= 1;
        if (!hasMinimumData) {
          insufficientDataReason = `insufficient temperature readings (need at least 1, found ${tempCount})`;
          console.log(`   ⚠️  ${insufficientDataReason}`);
        }
      } else if (meterType === 'pressure') {
        // Check if we have at least 1 pressure value
        let pressureCount = 0;
        for (const screenshot of batchScreenshots) {
          try {
            let ocrResult = screenshot.ocr_result;
            if (typeof ocrResult === 'string') {
              try {
                ocrResult = JSON.parse(ocrResult);
              } catch (e) {
                continue;
              }
            }
            const pressure = parseFloat(ocrResult?.pressure ?? ocrResult?.tekanan_operasi ?? 0);
            if (!isNaN(pressure) && pressure > 0) {
              pressureCount++;
            }
          } catch (error) {
            // Skip
          }
        }
        hasMinimumData = pressureCount >= 1;
        if (!hasMinimumData) {
          insufficientDataReason = `insufficient pressure readings (need at least 1, found ${pressureCount})`;
          console.log(`   ⚠️  ${insufficientDataReason}`);
        }
      } else {
        // For 'other' or no meter_type, default to stan_awal/stan_akhir requirement
        const validMeterReadings = meterReadings.filter(r => r > 0);
        hasMinimumData = validMeterReadings.length >= 2;
        if (!hasMinimumData) {
          insufficientDataReason = `insufficient meter readings (need at least 2, found ${validMeterReadings.length})`;
          console.log(`   ⚠️  ${insufficientDataReason}`);
        }
      }
      
      // Note: We continue even if hasMinimumData is false - we'll create the nota kecil with invalid_data status
      if (!hasMinimumData) {
        console.log(`   ⚠️  Insufficient data detected, but will still create nota kecil with 'insufficient_data' status`);
      }

      // Initialize all values to 0 - we'll only calculate the one matching meter_type
      let stan_awal = 0;
      let stan_akhir = 0;
      let avgPressure = 0;
      let avgTemperature = 0;
      let pressureCount = 0;
      let temperatureCount = 0;

      // Only calculate the average for the meter_type that matches the session
      if (meterType === 'stan_awal' || meterType === 'stan_akhir') {
        // For stan_awal/stan_akhir, use first and last meter readings
        stan_awal = meterReadings[0];
        stan_akhir = meterReadings[meterReadings.length - 1];
        console.log(`   📏 Meter readings (${meterType}): Stan Awal=${stan_awal}, Stan Akhir=${stan_akhir}`);
      } else if (meterType === 'temperature') {
        // Calculate average temperature only
        let totalTemperature = 0;
        for (const screenshot of batchScreenshots) {
          try {
            let ocrResult = screenshot.ocr_result;
            if (typeof ocrResult === 'string') {
              try {
                ocrResult = JSON.parse(ocrResult);
              } catch (e) {
                continue;
              }
            }
            const temperature = parseFloat(ocrResult?.temperature ?? ocrResult?.temperatur_operasi ?? 0);
            if (!isNaN(temperature)) {
              totalTemperature += temperature;
              temperatureCount++;
            }
          } catch (error) {
            console.error(`   ❌ Error extracting temperature from screenshot ${screenshot.id}:`, error.message);
          }
        }
        const denom = Math.max(totalInBatch, 1);
        avgTemperature = totalTemperature / denom;
        console.log(`   📏 Average Temperature: ${avgTemperature.toFixed(2)}°C (from ${temperatureCount} readings)`);
      } else if (meterType === 'pressure') {
        // Calculate average pressure only
        let totalPressure = 0;
        for (const screenshot of batchScreenshots) {
          try {
            let ocrResult = screenshot.ocr_result;
            if (typeof ocrResult === 'string') {
              try {
                ocrResult = JSON.parse(ocrResult);
              } catch (e) {
                continue;
              }
            }
            const pressure = parseFloat(ocrResult?.pressure ?? ocrResult?.tekanan_operasi ?? 0);
            if (!isNaN(pressure) && pressure > 0) {
              totalPressure += pressure;
              pressureCount++;
            }
          } catch (error) {
            console.error(`   ❌ Error extracting pressure from screenshot ${screenshot.id}:`, error.message);
          }
        }
        const denom = Math.max(totalInBatch, 1);
        avgPressure = totalPressure / denom;
        console.log(`   📏 Average Pressure: ${avgPressure.toFixed(2)} bar (from ${pressureCount} readings)`);
      } else {
        // For 'other' or no meter_type, default to stan_awal/stan_akhir calculation
        stan_awal = meterReadings[0];
        stan_akhir = meterReadings[meterReadings.length - 1];
        console.log(`   📏 Meter readings (default): Stan Awal=${stan_awal}, Stan Akhir=${stan_akhir}`);
      }

      // Log summary based on meter_type
      if (meterType === 'temperature') {
        console.log(`   📊 Data quality: ${temperatureCount} temperature readings out of ${totalInBatch} screenshots`);
      } else if (meterType === 'pressure') {
        console.log(`   📊 Data quality: ${pressureCount} pressure readings out of ${totalInBatch} screenshots`);
      } else {
        console.log(`   📊 Data quality: ${meterReadings.length} meter readings, ${pressureCount} pressure readings, ${temperatureCount} temperature readings`);
      }

      // Validate required values before creating nota kecil
      // NOTE: Do NOT skip creation; instead, label the nota as invalid_data
      // Only validate the field that matches the meter_type
      let hasInvalidAggregate = false;
      let invalidReasons = [];
      
      if (meterType === 'pressure') {
        if (avgPressure <= 0) {
          hasInvalidAggregate = true;
          invalidReasons.push(`pressure=${avgPressure}`);
          console.log(`   ⚠️  Invalid average pressure (${avgPressure}). Will still create nota kecil with 'invalid_data' label.`);
        }
      } else if (meterType === 'temperature') {
        if (avgTemperature < -50 || avgTemperature > 100) {
          hasInvalidAggregate = true;
          invalidReasons.push(`temperature=${avgTemperature}`);
          console.log(`   ⚠️  Invalid average temperature (${avgTemperature}°C). Will still create nota kecil with 'invalid_data' label.`);
        }
      } else if (meterType === 'stan_awal' || meterType === 'stan_akhir') {
        // For stan_awal/stan_akhir, validate that we have valid readings
        if (stan_awal <= 0 || stan_akhir <= 0) {
          hasInvalidAggregate = true;
          invalidReasons.push(`stan_awal=${stan_awal}, stan_akhir=${stan_akhir}`);
          console.log(`   ⚠️  Invalid meter readings. Will still create nota kecil with 'invalid_data' label.`);
        }
      }

      // Calculate gas volume - only if we have stan_awal and stan_akhir (not 0)
      let gasCalculation = null;
      let calcFailed = false;
      if (stan_awal > 0 && stan_akhir > 0) {
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
          calcFailed = true;
          hasInvalidAggregate = true;
          invalidReasons.push(`calc_error=${calcError.message}`);
          console.error(`   ❌ Gas calculation failed:`, calcError.message);
          // Continue and create nota kecil with invalid_data label; Vt/k/V may be null
        }
      } else {
        // Skip gas calculation if stan_awal/stan_akhir are 0 (not applicable for this meter_type)
        console.log(`   ℹ️  Skipping gas calculation (stan_awal=${stan_awal}, stan_akhir=${stan_akhir} - not applicable for meter_type=${meterType})`);
      }

      const batchStartAt = batchScreenshots[0]?.captured_at || session.nota_batch_start_at;
      const batchEndAt = batchScreenshots[batchScreenshots.length - 1]?.captured_at || session.nota_batch_end_at;

      // Create Nota Kecil for this batch
      // Tagging rules (priority order):
      // - insufficient data -> 'insufficient_data' (highest priority)
      // - invalid aggregates -> 'invalid_data'
      // - else if >=10 failures -> '<failedCount>_failed'
      // - else -> 'completed'
      let notaStatus = 'completed';
      if (!hasMinimumData) {
        notaStatus = 'insufficient_data';
      } else if (hasInvalidAggregate) {
        notaStatus = 'invalid_data';
      } else if (failedCount >= 10) {
        notaStatus = `${failedCount}_failed`;
      }
      const notaKecil = await NotaKecil.create({
        delivery_order_id: session.delivery_order_id,
        customer_location_index: session.customer_location_index,
        customer_name: session.customer_name,
        customer_address: null, // Can be populated from delivery order if needed
        stan_awal: stan_awal,
        stan_akhir: stan_akhir,
        tekanan_operasi: avgPressure,
        temperatur_operasi: avgTemperature,
        Vt: gasCalculation?.Vt ?? null,
        k: gasCalculation?.k ?? null,
        V: gasCalculation?.V ?? null,
        ocr_processing_status: notaStatus,
        ocr_processed_at: new Date(),
        driver_confirmed: false, // Auto-created, needs driver confirmation
        driver_notes: `${!hasMinimumData ? `[INSUFFICIENT DATA: ${insufficientDataReason}] ` : ''}${failedCount >= 10 ? `[${failedCount} FAILED] ` : ''}${hasInvalidAggregate ? `[INVALID DATA: ${invalidReasons.join(', ')}] ` : ''}Auto-created from CCTV session ${session.id}, batch ${batchNumber} (sequences ${startSequence}-${endSequence}), ${successfulScreenshots.length} successful OCR screenshots, ${failedCount} failed. Time range: ${batchStartAt?.toLocaleString()} to ${batchEndAt?.toLocaleString()}`
      });

      console.log(`   ✅ Nota Kecil #${notaKecil.id} created successfully`);
      if (gasCalculation && gasCalculation.Vt && gasCalculation.V) {
        console.log(`   📊 Volume: Vt=${gasCalculation.Vt.toFixed(3)}m³, k=${gasCalculation.k.toFixed(6)}, V=${gasCalculation.V.toFixed(3)}m³`);
      } else {
        console.log(`   ⚠️  Volume calculation failed - Vt/k/V are null`);
      }

      // Update session notes to track nota kecil creation (but keep session active!)
      const updatedNotes = `${session.session_notes || ''}\nNota Kecil #${notaKecil.id} created from batch ${batchNumber} (sequences ${startSequence}-${endSequence}).`.trim();
      
      await session.update({
        session_notes: updatedNotes,
        created_nota_kecil_id: notaKecil.id
      });

      console.log(`   ✅ Nota Kecil created for batch ${batchNumber}. Session continues...\n`);
      return true;

    } catch (error) {
      console.error(`   ❌ Error creating nota kecil for session ${session.id} from batch:`, error);
      
      // Don't stop the session - just log the error and continue
      await session.update({
        session_notes: `${session.session_notes || ''}\nFailed to create nota kecil from batch: ${error.message}`.trim()
      });
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

