/**
 * CCTV Monitoring Service
 * 
 * Handles all business logic for CCTV monitoring sessions:
 * - Session creation, management, and lifecycle
 * - Screenshot capture orchestration
 * - Health monitoring and statistics
 * - Integration with BARDI API and OCR processing
 */

const { Op } = require('sequelize');
const db = require('../models');
const bardiScrapingService = require('./bardiScrapingService');
const meterOcrService = require('./meterOcrService');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

const { CCTVSession, CCTVScreenshot, DeliveryOrder, NotaKecil, User } = db;

class CCTVMonitoringService {
  /**
   * Create a new monitoring session
   * @param {Object} sessionData - Session configuration
   * @returns {Promise<Object>} Created session
   */
  async createSession(sessionData) {
    try {
      const {
        delivery_order_id,
        customer_name,
        customer_location_index = 0,
        device_id = null,
        panel_row = null,
        panel_column = null,
        screenshot_interval_minutes = 10,
        health_check_interval_minutes = 15,
        session_notes = null,
        created_by = null,
      } = sessionData;

      // Validate delivery order exists
      const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
      if (!deliveryOrder) {
        throw new Error(`Delivery order ${delivery_order_id} not found`);
      }

      // Check if there's already an active session for this delivery order + location
      const existingSession = await CCTVSession.findOne({
        where: {
          delivery_order_id,
          customer_location_index,
          status: 'active',
        },
      });

      if (existingSession) {
        throw new Error(
          `An active monitoring session already exists for this delivery order and location (Session ID: ${existingSession.id})`
        );
      }

      // Auto-generate device_id if not provided
      const finalDeviceId = device_id || `BARDI-AUTO-${Date.now()}`;

      // Debug logging
      console.log('🔍 DEBUG - Creating Session with Panel Values:', {
        panel_row,
        panel_column,
        panel_row_type: typeof panel_row,
        panel_column_type: typeof panel_column
      });

      // Create the session
      const session = await CCTVSession.create({
        delivery_order_id,
        customer_name,
        customer_location_index,
        device_id: finalDeviceId,
        panel_row,
        panel_column,
        screenshot_interval_minutes,
        health_check_interval_minutes,
        session_notes,
        created_by,
        start_time: new Date(),
        status: 'active',
        total_screenshots_captured: 0,
      });

      // Verify what was actually saved
      console.log('✅ DEBUG - Session Created with Values:', {
        id: session.id,
        panel_row: session.panel_row,
        panel_column: session.panel_column
      });

      console.log(`✓ CCTV session created: ${session.id} for DO ${delivery_order_id}`);

      // Load relationships for response
      await session.reload({
        include: [
          { model: DeliveryOrder, as: 'delivery_order' },
          { model: User, as: 'creator' },
        ],
      });

      return {
        success: true,
        session,
        message: 'Monitoring session created successfully',
      };
    } catch (error) {
      console.error('Error creating CCTV session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Sessions and statistics
   */
  async getSessions(filters = {}) {
    try {
      console.log('🔍 cctvMonitoringService.getSessions called with filters:', filters);
      
      const {
        status = null,
        delivery_order_id = null,
        limit = 50,
        offset = 0,
      } = filters;
      
      console.log('CCTVSession model:', typeof CCTVSession);

      const whereClause = {};
      if (status) whereClause.status = status;
      if (delivery_order_id) whereClause.delivery_order_id = delivery_order_id;

      const { count, rows: sessions } = await CCTVSession.findAndCountAll({
        where: whereClause,
        include: [
          { model: DeliveryOrder, as: 'delivery_order' },
          { model: User, as: 'creator' },
          { model: NotaKecil, as: 'created_nota_kecil' },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      // Pre-compute nota kecil counts for each session (count nota created after session start)
      const notaCounts = {};
      await Promise.all(
        sessions.map(async (session) => {
          try {
            const count = await NotaKecil.count({
              where: {
                delivery_order_id: session.delivery_order_id,
                customer_location_index: session.customer_location_index,
                created_at: {
                  [Op.gte]: session.start_time,
                },
              },
            });
            notaCounts[session.id] = count;
          } catch (error) {
            console.error(`Error counting nota kecils for session ${session.id}:`, error.message);
            notaCounts[session.id] = 0;
          }
        })
      );

      // Calculate health status for each session
      const sessionsWithHealth = sessions.map((session) => {
        const sessionData = session.toJSON();
        sessionData.health_status = session.getHealthStatus();
        sessionData.time_since_last_capture = session.getTimeSinceLastCapture();
        sessionData.nota_kecil_count = notaCounts[session.id] || 0;
        return sessionData;
      });

      // Calculate statistics
      const stats = await this.calculateHealthStats(sessions);

      return {
        success: true,
        data: sessionsWithHealth,
        stats,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + sessions.length < count,
        },
      };
    } catch (error) {
      console.error('Error fetching CCTV sessions:', error);
      throw error;
    }
  }

  /**
   * Get a single session by ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} Session details
   */
  async getSessionById(sessionId) {
    try {
      const session = await CCTVSession.findByPk(sessionId, {
        include: [
          { model: DeliveryOrder, as: 'delivery_order' },
          { model: User, as: 'creator' },
          { model: NotaKecil, as: 'created_nota_kecil' },
        ],
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionData = session.toJSON();
      sessionData.health_status = session.getHealthStatus();
      sessionData.time_since_last_capture = session.getTimeSinceLastCapture();

      return {
        success: true,
        data: sessionData,
      };
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  /**
   * Capture a screenshot for a session
   * @param {number} sessionId - Session ID
   * @param {Object} options - Capture options
   * @returns {Promise<Object>} Screenshot data
   */
  async captureScreenshot(sessionId, options = {}) {
    try {
      const { processOcr = true, notes = null } = options; // Default: OCR enabled (using OpenAI)

      // Get session
      const session = await CCTVSession.findByPk(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.status !== 'active') {
        throw new Error(`Session ${sessionId} is not active (status: ${session.status})`);
      }

      console.log(`📸 Capturing screenshot for session ${sessionId}...`);

      // Get next sequence number
      const lastScreenshot = await CCTVScreenshot.findOne({
        where: { session_id: sessionId },
        order: [['sequence_number', 'DESC']],
      });
      const sequenceNumber = lastScreenshot ? lastScreenshot.sequence_number + 1 : 1;

      // Capture screenshot from BARDI API
      let screenshotUrl = null;
      let cloudinaryPublicId = null;

      try {
        // Call BARDI API to get screenshot from specific panel
        console.log(`📸 Capturing screenshot from panel [${session.panel_row}, ${session.panel_column}]`);
        console.log(`   Device ID: ${session.device_id || 'Not specified'}`);
        console.log('🔍 DEBUG - Panel values before calling BARDI:', {
          panel_row: session.panel_row,
          panel_column: session.panel_column,
          panel_row_type: typeof session.panel_row,
          panel_column_type: typeof session.panel_column
        });
        
        const bardiResult = await bardiScrapingService.capturePanelScreenshot(
          session.panel_row,
          session.panel_column,
          session.device_id
        );
        
        if (!bardiResult.success || !bardiResult.imageBuffer) {
          throw new Error(`BARDI screenshot capture failed: ${bardiResult.error || 'No image data returned'}`);
        }

        console.log(`✅ Panel screenshot received: ${bardiResult.size} bytes`);
        console.log(`   Panel: [${bardiResult.panel.row}, ${bardiResult.panel.column}] (Index: ${bardiResult.panel.index})`);
        console.log(`📤 Uploading to Cloudinary...`);
        
        // Upload to Cloudinary
        const cloudinaryService = require('./cloudinaryService');
        const uploadResult = await cloudinaryService.uploadCCTVScreenshot(
          bardiResult.imageBuffer,
          sessionId,
          sequenceNumber
        );
        
        if (!uploadResult.success) {
          throw new Error('Failed to upload screenshot to Cloudinary');
        }
        
        screenshotUrl = uploadResult.secureUrl;
        cloudinaryPublicId = uploadResult.publicId;
        
        console.log(`✅ Screenshot uploaded successfully`);
        console.log(`   URL: ${screenshotUrl}`);
        console.log(`   Size: ${uploadResult.width}x${uploadResult.height}`);
        console.log(`   Bytes: ${uploadResult.bytes}`);
        
      } catch (bardiError) {
        console.error('Screenshot capture error:', bardiError.message);
        // Don't create screenshot record if capture completely failed
        throw new Error(`Failed to capture screenshot: ${bardiError.message}`);
      }

      // Create screenshot record
      const screenshot = await CCTVScreenshot.create({
        session_id: sessionId,
        screenshot_url: screenshotUrl,
        cloudinary_public_id: cloudinaryPublicId,
        captured_at: new Date(),
        sequence_number: sequenceNumber,
        ocr_status: processOcr ? 'pending' : 'pending',
        notes,
      });

      // Update session statistics
      await session.update({
        total_screenshots_captured: session.total_screenshots_captured + 1,
        last_screenshot_at: new Date(),
      });

      console.log(`✓ Screenshot record created: ${screenshot.id}`);

      // Queue OCR processing if requested
      if (processOcr) {
        // Process OCR asynchronously (don't wait)
        this.processScreenshotOcr(screenshot.id).catch((err) => {
          console.error(`OCR processing failed for screenshot ${screenshot.id}:`, err);
        });
      }

      return {
        success: true,
        screenshot: screenshot.toJSON(),
        message: 'Screenshot captured successfully',
      };
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    }
  }

  /**
   * Process OCR for a screenshot
   * @param {number} screenshotId - Screenshot ID
   * @returns {Promise<Object>} OCR result
   */
  async processScreenshotOcr(screenshotId) {
    try {
      const screenshot = await CCTVScreenshot.findByPk(screenshotId);
      if (!screenshot) {
        throw new Error(`Screenshot ${screenshotId} not found`);
      }

      // Update status to processing
      await screenshot.update({ ocr_status: 'processing' });

      console.log(`🔍 Processing OCR for screenshot ${screenshotId}...`);

      // Call meter OCR service
      const ocrResult = await meterOcrService.processMeterReading(
        screenshot.screenshot_url
      );

      if (ocrResult.success) {
        // Update screenshot with OCR results
        await screenshot.update({
          ocr_status: 'success',
          ocr_result: ocrResult.data,
          ocr_raw_response: ocrResult.raw_response,
          ocr_confidence_score: ocrResult.confidence_score,
          ocr_processed_at: new Date(),
          ocr_error_message: null,
        });

        console.log(`✓ OCR completed for screenshot ${screenshotId}`);

        return {
          success: true,
          data: ocrResult.data,
        };
      } else {
        // OCR failed
        await screenshot.update({
          ocr_status: 'failed',
          ocr_error_message: ocrResult.error || 'OCR processing failed',
          ocr_processed_at: new Date(),
        });

        throw new Error(ocrResult.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('Error processing OCR:', error);
      
      // Update screenshot status to failed
      const screenshot = await CCTVScreenshot.findByPk(screenshotId);
      if (screenshot) {
        await screenshot.update({
          ocr_status: 'failed',
          ocr_error_message: error.message,
          ocr_processed_at: new Date(),
        });
      }

      throw error;
    }
  }

  /**
   * Retry OCR processing for a failed screenshot
   * @param {number} screenshotId - Screenshot ID
   * @returns {Promise<Object>} OCR result
   */
  async retryOcr(screenshotId) {
    try {
      const screenshot = await CCTVScreenshot.findByPk(screenshotId);
      if (!screenshot) {
        throw new Error(`Screenshot ${screenshotId} not found`);
      }

      // Increment retry count
      await screenshot.update({
        retry_count: screenshot.retry_count + 1,
        ocr_status: 'pending',
      });

      console.log(`🔄 Retrying OCR for screenshot ${screenshotId} (attempt ${screenshot.retry_count})...`);

      // Process OCR
      return await this.processScreenshotOcr(screenshotId);
    } catch (error) {
      console.error('Error retrying OCR:', error);
      throw error;
    }
  }

  /**
   * Get screenshots for a session
   * @param {number} sessionId - Session ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Screenshots
   */
  async getSessionScreenshots(sessionId, filters = {}) {
    try {
      const {
        ocr_status = null,
        limit = 20,
        offset = 0,
        sort = 'newest',
      } = filters;

      const whereClause = { session_id: sessionId };
      if (ocr_status) whereClause.ocr_status = ocr_status;

      const orderBy = sort === 'oldest' 
        ? [['captured_at', 'ASC']]
        : [['captured_at', 'DESC']];

      const { count, rows: screenshots } = await CCTVScreenshot.findAndCountAll({
        where: whereClause,
        order: orderBy,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        success: true,
        data: screenshots,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + screenshots.length < count,
        },
      };
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      throw error;
    }
  }

  /**
   * Stop a monitoring session
   * @param {number} sessionId - Session ID
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Updated session
   */
  async stopSession(sessionId, options = {}) {
    try {
      const { reason = null, create_nota_kecil = false } = options;

      const session = await CCTVSession.findByPk(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.status !== 'active') {
        throw new Error(`Session ${sessionId} is not active`);
      }

      // Update session
      const updateData = {
        status: 'stopped',
        end_time: new Date(),
        session_notes: reason 
          ? `${session.session_notes || ''}\nStopped: ${reason}`.trim()
          : session.session_notes,
      };

      // Create Nota Kecil if requested
      if (create_nota_kecil) {
        // Get last screenshot with successful OCR
        const lastScreenshot = await CCTVScreenshot.findOne({
          where: {
            session_id: sessionId,
            ocr_status: 'success',
          },
          order: [['captured_at', 'DESC']],
        });

        if (lastScreenshot && lastScreenshot.ocr_result) {
          // TODO: Create Nota Kecil from OCR data
          // This would integrate with your existing Nota Kecil creation logic
          console.log(`📝 Creating Nota Kecil from session ${sessionId} data...`);
          // updateData.created_nota_kecil_id = notaKecil.id;
        }
      }

      await session.update(updateData);

      console.log(`⏹️ Session ${sessionId} stopped`);

      return {
        success: true,
        session: session.toJSON(),
        message: 'Session stopped successfully',
      };
    } catch (error) {
      console.error('Error stopping session:', error);
      throw error;
    }
  }

  /**
   * Restart a dead or stopped session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} Updated session
   */
  async restartSession(sessionId) {
    try {
      const session = await CCTVSession.findByPk(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.status === 'active') {
        throw new Error(`Session ${sessionId} is already active`);
      }

      // Restart session
      await session.update({
        status: 'active',
        end_time: null,
        session_notes: `${session.session_notes || ''}\nRestarted at ${new Date().toISOString()}`.trim(),
      });

      console.log(`▶️ Session ${sessionId} restarted`);

      return {
        success: true,
        session: session.toJSON(),
        message: 'Session restarted successfully',
      };
    } catch (error) {
      console.error('Error restarting session:', error);
      throw error;
    }
  }

  /**
   * Complete a monitoring session
   * @param {number} sessionId - Session ID
   * @param {Object} options - Complete options
   * @returns {Promise<Object>} Updated session
   */
  async completeSession(sessionId, options = {}) {
    try {
      const { reason = null } = options;

      const session = await CCTVSession.findByPk(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.status === 'completed') {
        throw new Error(`Session ${sessionId} is already completed`);
      }

      // Update session to completed
      await session.update({
        status: 'completed',
        end_time: new Date(),
        session_notes: reason 
          ? `${session.session_notes || ''}\nCompleted: ${reason}`.trim()
          : `${session.session_notes || ''}\nCompleted at ${new Date().toISOString()}`.trim(),
      });

      console.log(`✅ Session ${sessionId} marked as completed`);

      return {
        success: true,
        session: session.toJSON(),
        message: 'Session completed successfully',
      };
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  /**
   * Calculate health statistics for sessions
   * @param {Array} sessions - Array of session instances
   * @returns {Object} Health statistics
   */
  async calculateHealthStats(sessions = null) {
    try {
      // If no sessions provided, fetch all
      if (!sessions) {
        sessions = await CCTVSession.findAll();
      }

      const stats = {
        total_sessions: sessions.length,
        active_sessions: 0,
        healthy_sessions: 0,
        warning_sessions: 0,
        dead_sessions: 0,
        stopped_sessions: 0,
        completed_sessions: 0,
        total_screenshots_today: 0,
        total_screenshots_this_week: 0,
        ocr_success_rate: 0,
        average_ocr_confidence: 0,
      };

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const session of sessions) {
        // Count by status
        if (session.status === 'active') stats.active_sessions++;
        if (session.status === 'dead') stats.dead_sessions++;
        if (session.status === 'stopped') stats.stopped_sessions++;
        if (session.status === 'completed') stats.completed_sessions++;

        // Count by health
        const health = session.getHealthStatus();
        if (health === 'healthy') stats.healthy_sessions++;
        if (health === 'warning') stats.warning_sessions++;

        // Count screenshots
        const screenshots = await CCTVScreenshot.findAll({
          where: { session_id: session.id },
        });

        stats.total_screenshots_today += screenshots.filter(
          (s) => new Date(s.captured_at) >= todayStart
        ).length;

        stats.total_screenshots_this_week += screenshots.filter(
          (s) => new Date(s.captured_at) >= weekStart
        ).length;
      }

      // Calculate OCR statistics
      const allScreenshots = await CCTVScreenshot.findAll();
      const successfulOcr = allScreenshots.filter((s) => s.ocr_status === 'success');
      const processedOcr = allScreenshots.filter((s) => 
        s.ocr_status === 'success' || s.ocr_status === 'failed'
      );

      if (processedOcr.length > 0) {
        stats.ocr_success_rate = successfulOcr.length / processedOcr.length;
      }

      if (successfulOcr.length > 0) {
        const totalConfidence = successfulOcr.reduce(
          (sum, s) => sum + (s.ocr_confidence_score || 0),
          0
        );
        stats.average_ocr_confidence = totalConfidence / successfulOcr.length;
      }

      return stats;
    } catch (error) {
      console.error('Error calculating health stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed health information for a session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} Health details
   */
  async getSessionHealth(sessionId) {
    try {
      const session = await CCTVSession.findByPk(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const screenshots = await CCTVScreenshot.findAll({
        where: { session_id: sessionId },
      });

      const now = new Date();
      const startTime = new Date(session.start_time);
      const uptimeMinutes = Math.floor((now - startTime) / (1000 * 60));

      const expectedScreenshots = Math.floor(
        uptimeMinutes / session.screenshot_interval_minutes
      );

      const successfulOcr = screenshots.filter((s) => s.ocr_status === 'success').length;
      const failedOcr = screenshots.filter((s) => s.ocr_status === 'failed').length;
      const pendingOcr = screenshots.filter((s) => s.ocr_status === 'pending').length;
      const processedOcr = successfulOcr + failedOcr;

      const health = {
        session_id: sessionId,
        health_status: session.getHealthStatus(),
        status: session.status,
        uptime_minutes: uptimeMinutes,
        last_screenshot_at: session.last_screenshot_at,
        time_since_last_capture_minutes: session.last_screenshot_at
          ? Math.floor((now - new Date(session.last_screenshot_at)) / (1000 * 60))
          : null,
        expected_screenshots: expectedScreenshots,
        actual_screenshots: screenshots.length,
        capture_success_rate: expectedScreenshots > 0
          ? screenshots.length / expectedScreenshots
          : 0,
        ocr_success_rate: processedOcr > 0 ? successfulOcr / processedOcr : 0,
        average_ocr_confidence: successfulOcr > 0
          ? screenshots
              .filter((s) => s.ocr_status === 'success')
              .reduce((sum, s) => sum + (s.ocr_confidence_score || 0), 0) / successfulOcr
          : 0,
        failed_captures: Math.max(0, expectedScreenshots - screenshots.length),
        pending_ocr: pendingOcr,
        failed_ocr: failedOcr,
        issues: [],
        recommendations: [],
      };

      // Add issues and recommendations
      if (health.health_status === 'dead') {
        health.issues.push('Session appears to be dead - no recent screenshots');
        health.recommendations.push('Check BARDI connection and restart session');
      }

      if (health.capture_success_rate < 0.8) {
        health.issues.push('Low screenshot capture rate');
        health.recommendations.push('Check network connection and BARDI API status');
      }

      if (health.ocr_success_rate < 0.7) {
        health.issues.push('Low OCR success rate');
        health.recommendations.push('Check image quality and OCR service status');
      }

      if (health.issues.length === 0) {
        health.recommendations.push('System operating normally');
      }

      return {
        success: true,
        data: health,
      };
    } catch (error) {
      console.error('Error getting session health:', error);
      throw error;
    }
  }
}

module.exports = new CCTVMonitoringService();

