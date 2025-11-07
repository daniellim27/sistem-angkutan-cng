/**
 * CCTV Monitoring Controller
 * 
 * Handles HTTP requests for CCTV monitoring operations
 * Connects service layer to API endpoints
 */

const cctvMonitoringService = require('../services/cctvMonitoringService');
const cctvScheduler = require('../services/cctvScheduler');
const db = require('../models');
const { CCTVSession, CCTVScreenshot } = db;

/**
 * Get all monitoring sessions
 * GET /api/cctv-monitoring/sessions
 */
exports.getSessions = async (req, res) => {
  try {
    console.log('📹 getSessions called with query:', req.query);
    
    const {
      status,
      delivery_order_id,
      limit = 50,
      offset = 0,
    } = req.query;

    console.log('Calling cctvMonitoringService.getSessions...');
    const result = await cctvMonitoringService.getSessions({
      status,
      delivery_order_id: delivery_order_id ? parseInt(delivery_order_id) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getSessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring sessions',
      error: error.message,
    });
  }
};

/**
 * Get a single session by ID
 * GET /api/cctv-monitoring/sessions/:id
 */
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const result = await cctvMonitoringService.getSessionById(sessionId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getSessionById:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
      error: error.message,
    });
  }
};

/**
 * Create a new monitoring session
 * POST /api/cctv-monitoring/sessions
 */
exports.createSession = async (req, res) => {
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
    } = req.body;

    // Debug logging for panel values
    console.log('🔍 DEBUG - Create Session Request Body:', {
      panel_row: req.body.panel_row,
      panel_column: req.body.panel_column,
      panel_row_type: typeof req.body.panel_row,
      panel_column_type: typeof req.body.panel_column
    });

    // Validation
    if (!delivery_order_id) {
      return res.status(400).json({
        success: false,
        message: 'delivery_order_id is required',
      });
    }

    if (!customer_name) {
      return res.status(400).json({
        success: false,
        message: 'customer_name is required',
      });
    }

    // Parse panel values properly - handle null, undefined, and 0
    let parsedPanelRow = null;
    let parsedPanelColumn = null;
    
    if (panel_row !== null && panel_row !== undefined && panel_row !== '') {
      parsedPanelRow = parseInt(panel_row);
      if (isNaN(parsedPanelRow)) {
        parsedPanelRow = null;
      }
    }
    
    if (panel_column !== null && panel_column !== undefined && panel_column !== '') {
      parsedPanelColumn = parseInt(panel_column);
      if (isNaN(parsedPanelColumn)) {
        parsedPanelColumn = null;
      }
    }

    const sessionData = {
      delivery_order_id: parseInt(delivery_order_id),
      customer_name,
      customer_location_index: parseInt(customer_location_index),
      device_id,
      panel_row: parsedPanelRow,
      panel_column: parsedPanelColumn,
      screenshot_interval_minutes: parseInt(screenshot_interval_minutes),
      health_check_interval_minutes: parseInt(health_check_interval_minutes),
      session_notes,
      created_by: req.user?.id || null, // From auth middleware
    };

    console.log('🔍 DEBUG - Session Data to Service:', {
      panel_row: sessionData.panel_row,
      panel_column: sessionData.panel_column
    });

    const result = await cctvMonitoringService.createSession(sessionData);

    res.status(201).json({
      success: true,
      message: 'Monitoring session created successfully',
      data: result.session.toJSON(),
    });
  } catch (error) {
    console.error('Error in createSession:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create monitoring session',
      error: error.message,
    });
  }
};

/**
 * Update a session
 * PUT /api/cctv-monitoring/sessions/:id
 */
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const session = await CCTVSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session ${sessionId} not found`,
      });
    }

    const {
      screenshot_interval_minutes,
      health_check_interval_minutes,
      session_notes,
      panel_row,
      panel_column,
    } = req.body;

    const updateData = {};
    if (screenshot_interval_minutes !== undefined) {
      updateData.screenshot_interval_minutes = parseInt(screenshot_interval_minutes);
    }
    if (health_check_interval_minutes !== undefined) {
      updateData.health_check_interval_minutes = parseInt(health_check_interval_minutes);
    }
    if (session_notes !== undefined) {
      updateData.session_notes = session_notes;
    }
    if (panel_row !== undefined) {
      updateData.panel_row = panel_row ? parseInt(panel_row) : null;
    }
    if (panel_column !== undefined) {
      updateData.panel_column = panel_column ? parseInt(panel_column) : null;
    }

    await session.update(updateData);

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session.toJSON(),
    });
  } catch (error) {
    console.error('Error in updateSession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message,
    });
  }
};

/**
 * Stop a monitoring session
 * POST /api/cctv-monitoring/sessions/:id/stop
 */
exports.stopSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const { reason = null, create_nota_kecil = false } = req.body;

    const result = await cctvMonitoringService.stopSession(sessionId, {
      reason,
      create_nota_kecil,
    });

    res.json({
      success: true,
      message: 'Session stopped successfully',
      data: result.session,
    });
  } catch (error) {
    console.error('Error in stopSession:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not active')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to stop session',
      error: error.message,
    });
  }
};

/**
 * Restart a session
 * POST /api/cctv-monitoring/sessions/:id/restart
 */
exports.restartSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const result = await cctvMonitoringService.restartSession(sessionId);

    res.json({
      success: true,
      message: 'Session restarted successfully',
      data: result.session,
    });
  } catch (error) {
    console.error('Error in restartSession:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('already active')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to restart session',
      error: error.message,
    });
  }
};

/**
 * Delete a session (soft delete or hard delete)
 * DELETE /api/cctv-monitoring/sessions/:id
 */
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const session = await CCTVSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session ${sessionId} not found`,
      });
    }

    // Check if session is active - warn before deletion
    if (session.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active session. Please stop it first.',
      });
    }

    // Delete session (cascade will delete screenshots)
    await session.destroy();

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteSession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message,
    });
  }
};

/**
 * Get screenshots for a session
 * GET /api/cctv-monitoring/sessions/:id/screenshots
 */
exports.getSessionScreenshots = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const {
      ocr_status,
      limit = 20,
      offset = 0,
      sort = 'newest',
    } = req.query;

    const result = await cctvMonitoringService.getSessionScreenshots(sessionId, {
      ocr_status,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getSessionScreenshots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch screenshots',
      error: error.message,
    });
  }
};

/**
 * Manually capture a screenshot
 * POST /api/cctv-monitoring/sessions/:id/capture
 */
exports.manualCapture = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const { process_ocr = true, notes = null } = req.body;

    const result = await cctvMonitoringService.captureScreenshot(sessionId, {
      processOcr: process_ocr,
      notes,
    });

    res.json({
      success: true,
      message: 'Screenshot captured successfully',
      data: result.screenshot,
    });
  } catch (error) {
    console.error('Error in manualCapture:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not active')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to capture screenshot',
      error: error.message,
    });
  }
};

/**
 * Delete a screenshot
 * DELETE /api/cctv-monitoring/screenshots/:id
 */
exports.deleteScreenshot = async (req, res) => {
  try {
    const { id } = req.params;
    const screenshotId = parseInt(id);

    if (isNaN(screenshotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid screenshot ID',
      });
    }

    const screenshot = await CCTVScreenshot.findByPk(screenshotId);
    if (!screenshot) {
      return res.status(404).json({
        success: false,
        message: `Screenshot ${screenshotId} not found`,
      });
    }

    // Soft delete
    await screenshot.update({ is_deleted: true });

    // Update session screenshot count
    const session = await CCTVSession.findByPk(screenshot.session_id);
    if (session) {
      await session.update({
        total_screenshots_captured: Math.max(0, session.total_screenshots_captured - 1),
      });
    }

    res.json({
      success: true,
      message: 'Screenshot deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteScreenshot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete screenshot',
      error: error.message,
    });
  }
};

/**
 * Retry OCR processing for a screenshot
 * POST /api/cctv-monitoring/screenshots/:id/retry-ocr
 */
exports.retryOcr = async (req, res) => {
  try {
    const { id } = req.params;
    const screenshotId = parseInt(id);

    if (isNaN(screenshotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid screenshot ID',
      });
    }

    const result = await cctvMonitoringService.retryOcr(screenshotId);

    res.json({
      success: true,
      message: 'OCR processing queued',
      data: {
        id: screenshotId,
        ocr_status: 'processing',
        retry_count: result.retry_count || 0,
      },
    });
  } catch (error) {
    console.error('Error in retryOcr:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retry OCR',
      error: error.message,
    });
  }
};

/**
 * Get OCR result for a screenshot
 * GET /api/cctv-monitoring/screenshots/:id/ocr-result
 */
exports.getOcrResult = async (req, res) => {
  try {
    const { id } = req.params;
    const screenshotId = parseInt(id);

    if (isNaN(screenshotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid screenshot ID',
      });
    }

    const screenshot = await CCTVScreenshot.findByPk(screenshotId);
    if (!screenshot) {
      return res.status(404).json({
        success: false,
        message: `Screenshot ${screenshotId} not found`,
      });
    }

    res.json({
      success: true,
      data: {
        id: screenshot.id,
        screenshot_url: screenshot.screenshot_url,
        ocr_status: screenshot.ocr_status,
        ocr_result: screenshot.ocr_result,
        ocr_raw_response: screenshot.ocr_raw_response,
        ocr_confidence_score: screenshot.ocr_confidence_score,
        ocr_processed_at: screenshot.ocr_processed_at,
        retry_count: screenshot.retry_count,
      },
    });
  } catch (error) {
    console.error('Error in getOcrResult:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OCR result',
      error: error.message,
    });
  }
};

/**
 * Get overall system health statistics
 * GET /api/cctv-monitoring/health
 */
exports.getHealthStats = async (req, res) => {
  try {
    const stats = await cctvMonitoringService.calculateHealthStats();

    res.json({
      success: true,
      data: {
        ...stats,
        system_status: stats.dead_sessions > stats.active_sessions / 2 ? 'critical' : 
                       stats.dead_sessions > 0 ? 'warning' : 'healthy',
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in getHealthStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health statistics',
      error: error.message,
    });
  }
};

/**
 * Get detailed health information for a session
 * GET /api/cctv-monitoring/sessions/:id/health
 */
exports.getSessionHealth = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const result = await cctvMonitoringService.getSessionHealth(sessionId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getSessionHealth:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch session health',
      error: error.message,
    });
  }
};

/**
 * Update BARDI session token
 * PUT /api/cctv-monitoring/bardi-token
 */
exports.updateBardiToken = async (req, res) => {
  try {
    const { session_token, apply_to_session_id = null } = req.body;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        message: 'session_token is required',
      });
    }

    // Validate token structure
    if (!session_token['s-sid'] || !session_token['s-sid.sig']) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session token format. Required fields: s-sid, s-sid.sig',
      });
    }

    let sessionsAffected = 0;

    if (apply_to_session_id) {
      // Update specific session
      const session = await CCTVSession.findByPk(parseInt(apply_to_session_id));
      if (!session) {
        return res.status(404).json({
          success: false,
          message: `Session ${apply_to_session_id} not found`,
        });
      }

      // Store token (in production, encrypt this!)
      await session.update({
        bardi_session_token: JSON.stringify(session_token),
      });

      sessionsAffected = 1;
    } else {
      // Update all active sessions
      const activeSessions = await CCTVSession.findAll({
        where: { status: 'active' },
      });

      for (const session of activeSessions) {
        await session.update({
          bardi_session_token: JSON.stringify(session_token),
        });
      }

        sessionsAffected = activeSessions.length;
    }
    
    // IMPORTANT: Also update the session.json file that bardiScrapingService uses
    console.log('📝 Updating session.json file with new BARDI token...');
    const bardiScrapingService = require('../services/bardiScrapingService');
    
    try {
      // Load current session file
      const currentSession = await bardiScrapingService.loadSession();
      
      // Update cookies with new token
      const updatedSession = {
        ...currentSession,
        cookies: {
          ...currentSession.cookies,
          's-sid': session_token['s-sid'],
          's-sid.sig': session_token['s-sid.sig'],
          'uid': session_token['uid'] || currentSession.cookies['uid'],
          'clientId': session_token['clientId'] || currentSession.cookies['clientId'],
          'deviceId': session_token['deviceId'] || currentSession.cookies['deviceId'],
        }
      };
      
      // Save updated session
      await bardiScrapingService.updateSession(updatedSession);
      console.log('✅ session.json file updated successfully');
    } catch (fileError) {
      console.error('⚠️ Failed to update session.json file:', fileError);
      // Continue anyway - database is updated
    }

    res.json({
      success: true,
      message: 'BARDI token updated successfully (database + session.json file)',
      data: {
        token_updated_at: new Date().toISOString(),
        sessions_affected: sessionsAffected,
      },
    });
  } catch (error) {
    console.error('Error in updateBardiToken:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update BARDI token',
      error: error.message,
    });
  }
};

/**
 * Get scheduler status
 * GET /api/cctv-monitoring/scheduler/status
 */
exports.getSchedulerStatus = async (req, res) => {
  try {
    const status = cctvScheduler.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error.message,
    });
  }
};

/**
 * Start the scheduler
 * POST /api/cctv-monitoring/scheduler/start
 */
exports.startScheduler = async (req, res) => {
  try {
    const result = cctvScheduler.start();
    res.json({
      success: true,
      message: result ? 'Scheduler started successfully' : 'Scheduler already running',
      data: cctvScheduler.getStatus(),
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: error.message,
    });
  }
};

/**
 * Stop the scheduler
 * POST /api/cctv-monitoring/scheduler/stop
 */
exports.stopScheduler = async (req, res) => {
  try {
    cctvScheduler.stop();
    res.json({
      success: true,
      message: 'Scheduler stopped successfully',
      data: cctvScheduler.getStatus(),
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: error.message,
    });
  }
};

/**
 * Trigger immediate capture for all active sessions
 * POST /api/cctv-monitoring/scheduler/capture-all
 */
exports.captureAllSessions = async (req, res) => {
  try {
    const results = await cctvScheduler.captureAllActiveSessions();
    res.json({
      success: true,
      message: `Captured ${results.captured} session(s), ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    console.error('Error capturing all sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture all sessions',
      error: error.message,
    });
  }
};

