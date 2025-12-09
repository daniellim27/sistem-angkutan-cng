// backend/src/controllers/cctvMonitoring.controller.js

/**
 * CCTV Monitoring Controller
 * 
 * Handles HTTP requests for CCTV monitoring operations
 * Connects service layer to API endpoints
 */

const { Op } = require('sequelize');
const cctvMonitoringService = require('../services/cctvMonitoringService');
const cctvScheduler = require('../services/cctvScheduler');
const db = require('../models');
const { CCTVSession, CCTVScreenshot, SystemSettings } = db;
const { cleanupCloudinaryScreenshotsOnce, initCloudinaryFromEnv } = require('../services/cctvScreenshotRetention');

const BARDI_TOKEN_SETTING_KEY = 'cctv.bardi_session_token';

const persistBardiToken = async (sessionToken) => {
  if (!SystemSettings) return null;

  const stringValue = JSON.stringify(sessionToken);
  const defaults = {
    setting_key: BARDI_TOKEN_SETTING_KEY,
    setting_value: stringValue,
    data_type: 'json',
    description: 'Latest BARDI session token (cookies from ipc.bardi.co.id)',
    is_editable: false,
  };

  const [setting, created] = await SystemSettings.findOrCreate({
    where: { setting_key: BARDI_TOKEN_SETTING_KEY },
    defaults,
  });

  if (!created) {
    await setting.update({
      setting_value: stringValue,
      data_type: 'json',
      description: setting.description || defaults.description,
      is_editable: setting.is_editable ?? false,
      updated_at: new Date(),
    });
    return setting;
  }

  return setting;
};

/**
 * Get all monitoring sessions
 * GET /api/cctv-monitoring/sessions
 */
exports.getSessions = async (req, res) => {
  try {
    console.log('📹 getSessions called with query:', req.query);
    
    const {
      status,
      customer_name,
      limit = 50,
      offset = 0,
    } = req.query;

    console.log('Calling cctvMonitoringService.getSessions...');
    const result = await cctvMonitoringService.getSessions({
      status,
      customer_name: customer_name || null,
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
 * Trigger on-demand cleanup of old Cloudinary screenshots (admin only)
 * POST /api/cctv-monitoring/cleanup-screenshots
 */
exports.cleanupScreenshots = async (req, res) => {
  try {
    initCloudinaryFromEnv();
    const summary = await cleanupCloudinaryScreenshotsOnce();
    res.json({
      success: true,
      message: 'Cleanup executed',
      data: summary,
    });
  } catch (error) {
    console.error('Error in cleanupScreenshots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup screenshots',
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
      meter_type = null,
      screenshot_interval_minutes = 10,
      health_check_interval_minutes = 15,
      session_notes = null,
    } = req.body;

    // Debug logging for panel values
    console.log('🔍 DEBUG - Create Session Request Body:', {
      panel_row: req.body.panel_row,
      panel_column: req.body.panel_column,
      panel_row_type: typeof req.body.panel_row,
      panel_column_type: typeof req.body.panel_column,
      meter_type: req.body.meter_type,
      meter_type_type: typeof req.body.meter_type
    });

    // Validation
    // ✅ VALIDATE meter_type
    if (!meter_type) {
      return res.status(400).json({
        success: false,
        message: 'meter_type is required (stan, pressure_inlet, pressure_outlet, temperature)',
      });
    }

    if (!['stan', 'pressure_inlet', 'pressure_outlet', 'temperature'].includes(meter_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meter_type. Must be: stan, pressure_inlet, pressure_outlet, temperature',
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

    // Build sessionData - only include delivery_order_id if it's actually provided
    const sessionData = {
      customer_name,
      customer_location_index: parseInt(customer_location_index),
      device_id,
      panel_row: parsedPanelRow,
      panel_column: parsedPanelColumn,
      meter_type: meter_type || null,
      screenshot_interval_minutes: parseInt(screenshot_interval_minutes),
      health_check_interval_minutes: parseInt(health_check_interval_minutes),
      session_notes,
      created_by: req.user?.id || null, // From auth middleware
    };
    
    // Only include delivery_order_id if it's provided and valid
    if (delivery_order_id && delivery_order_id !== '0' && delivery_order_id !== 0) {
      sessionData.delivery_order_id = parseInt(delivery_order_id);
    }

    console.log('🔍 DEBUG - Session Data to Service:', {
      panel_row: sessionData.panel_row,
      panel_column: sessionData.panel_column,
      meter_type: sessionData.meter_type,
      meter_type_type: typeof sessionData.meter_type
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

    const { reason = null, create_nota_kecil = false } = req.body || {};

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
 * Complete a session
 * POST /api/cctv-monitoring/sessions/:id/complete
 */
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const { reason = null } = req.body || {};

    const result = await cctvMonitoringService.completeSession(sessionId, {
      reason,
    });

    res.json({
      success: true,
      message: 'Session completed successfully',
      data: result.session,
    });
  } catch (error) {
    console.error('Error in completeSession:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('already completed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to complete session',
      error: error.message,
    });
  }
};

/**
 * Recalibrate nota kecil creation for all full batches
 */
exports.recalibrateNotaKecil = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const result = await cctvMonitoringService.recalibrateNotaKecil(sessionId);

    res.json({
      success: true,
      message: 'Nota kecil recalibration completed',
      data: result,
    });
  } catch (error) {
    console.error('Error in recalibrateNotaKecil:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to recalibrate nota kecil',
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

    // Track batch for nota kecil creation (manual captures also count)
    const session = await CCTVSession.findByPk(sessionId);
    if (session && session.status === 'active') {
      const cctvScheduler = require('../services/cctvScheduler');
      try {
        await cctvScheduler.processPendingNotaBatches(session);
      } catch (batchError) {
        console.error('Error processing nota batches for manual capture:', batchError);
        // Don't fail the request if batch processing fails
      }
    }

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
 * Manually set OCR values for a screenshot
 * PUT /api/cctv-monitoring/screenshots/:id/manual-ocr
 */
exports.setManualOcr = async (req, res) => {
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

    const {
      meter_reading = null,
      pressure = null,
      temperature = null,
      flow_rate = null,
      unit = 'm³',
      notes = 'Manual OCR override',
    } = req.body || {};

    const manualResult = {
      meter_reading: meter_reading !== null ? Number(meter_reading) : null,
      pressure: pressure !== null ? Number(pressure) : null,
      temperature: temperature !== null ? Number(temperature) : null,
      flow_rate: flow_rate !== null ? Number(flow_rate) : null,
      unit,
      timestamp_on_meter: null,
      raw_text: 'MANUAL_ENTRY',
      notes,
    };

    await screenshot.update({
      ocr_status: 'success',
      ocr_result: manualResult,
      ocr_raw_response: { manual: true, by: req.user?.id || null, at: new Date().toISOString() },
      ocr_confidence_score: 1.0,
      ocr_processed_at: new Date(),
      ocr_error_message: null,
      notes: `${screenshot.notes || ''}\nManual OCR set at ${new Date().toISOString()}`.trim(),
    });

    res.json({
      success: true,
      message: 'Manual OCR values saved',
      data: {
        id: screenshot.id,
        ocr_status: screenshot.ocr_status,
        ocr_result: screenshot.ocr_result,
      },
    });
  } catch (error) {
    console.error('Error in setManualOcr:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set manual OCR',
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
/**
 * Update BARDI session token — NOW SUPER FLEXIBLE
 * Accepts ANY common format people paste from browser
 */
/**
 * Update BARDI session token — SUPER FLEXIBLE & ERROR-FREE
 */
exports.updateBardiToken = async (req, res) => {
  try {
    const { session_token, apply_to_session_id = null } = req.body;

    if (!session_token) {
      return res.status(400).json({ success: false, message: 'session_token is required' });
    }

    let cookies = {};

    // Case 1: Already perfect format
    if (session_token['s-sid'] && session_token['s-sid.sig']) {
      cookies = { ...session_token };
    }
    // Case 2: Full session.json → { cookies: { ... } }
    else if (session_token.cookies && typeof session_token.cookies === 'object') {
      cookies = session_token.cookies;
    }
    // Case 3: Raw cookie string
    else if (typeof session_token === 'string' && session_token.includes('=')) {
      session_token.split(';').forEach(part => {
        const [key, ...val] = part.trim().split('=');
        if (key) cookies[key.trim()] = decodeURIComponent(val.join('='));
      });
    }
    // Case 4: BARDI "s:uuid.sig" format
    else if (typeof session_token['s-sid'] === 'string' && session_token['s-sid'].startsWith('s:')) {
      const full = session_token['s-sid'];
      cookies['s-sid'] = full;
      cookies['s-sid.sig'] = full.split('.').pop();
      cookies = { ...session_token, ...cookies };
    }
    // Case 5: Messy pasted string from Chrome DevTools table
    else if (typeof session_token === 'string' && session_token.includes('s-sid')) {
      const sidMatch = session_token.match(/s[-:]sid[=:](s?:[^;\s"'},]+)/i);
      const sigMatch = session_token.match(/s[-:]sid\.sig[=:]([A-Za-z0-9+/=]+)/i);
      const uidMatch = session_token.match(/uid[=:]([a-zA-Z0-9]+)/i);
      const clientIdMatch = session_token.match(/clientId[=:]([a-zA-Z0-9]+)/i);
      const deviceIdMatch = session_token.match(/deviceId[=:]([a-zA-Z0-9-]+)/i);

      if (sidMatch) {
        const val = sidMatch[1].trim();
        cookies['s-sid'] = val.startsWith('s:') ? val : `s:${val}`;
      }
      if (sigMatch) cookies['s-sid.sig'] = sigMatch[1].trim();
      if (uidMatch) cookies.uid = uidMatch[1];
      if (clientIdMatch) cookies.clientId = clientIdMatch[1];
      if (deviceIdMatch) cookies.deviceId = deviceIdMatch[1];
    }

    // Auto-fix s-sid.sig from s-sid if missing
    if (!cookies['s-sid.sig'] && cookies['s-sid'] && cookies['s-sid'].includes('.')) {
      cookies['s-sid.sig'] = cookies['s-sid'].split('.').pop();
    }

    // Final validation
    if (!cookies['s-sid'] || !cookies['s-sid.sig']) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract valid s-sid and s-sid.sig. Please copy cookies again.',
      });
    }

    console.log('BARDI token parsed successfully:', {
      's-sid': cookies['s-sid'].slice(0, 40) + '...',
      's-sid.sig': cookies['s-sid.sig'].slice(0, 20) + '...',
    });

    // === REST OF YOUR ORIGINAL LOGIC (unchanged) ===
    await persistBardiToken(cookies);

    let sessionsAffected = 0;
    let restartedSessions = 0;

    if (apply_to_session_id) {
      const sessionId = parseInt(apply_to_session_id);
      const session = await CCTVSession.findByPk(sessionId);
      if (!session) return res.status(404).json({ success: false, message: `Session ${apply_to_session_id} not found` });

      await session.update({ bardi_session_token: JSON.stringify(cookies) });
      sessionsAffected = 1;
      if (session.status === 'dead') {
        try { await cctvMonitoringService.restartSession(session.id); restartedSessions = 1; }
        catch (e) { console.warn('Restart failed:', e.message); }
      }
    } else {
      const sessions = await CCTVSession.findAll({ where: { status: { [Op.in]: ['active', 'dead'] } } });
      for (const s of sessions) {
        await s.update({ bardi_session_token: JSON.stringify(cookies) });
        if (s.status === 'dead') {
          try { await cctvMonitoringService.restartSession(s.id); restartedSessions++; }
          catch (e) { console.warn('Restart failed:', e.message); }
        }
      }
      sessionsAffected = sessions.length;
    }

    // Update session.json
    try {
      const bardiScrapingService = require('../services/bardiScrapingService');
      const current = await bardiScrapingService.loadSession();
      const updated = {
        ...current,
        cookies: {
          ...current.cookies,
          's-sid': cookies['s-sid'],
          's-sid.sig': cookies['s-sid.sig'],
          uid: cookies.uid || current.cookies.uid,
          clientId: cookies.clientId || current.cookies.clientId,
          deviceId: cookies.deviceId || current.cookies.deviceId,
        }
      };
      await bardiScrapingService.updateSession(updated);
    } catch (e) { console.error('Failed to update session.json:', e); }

    try { await cctvScheduler.captureAllActiveSessions(true); }
    catch (e) { console.error('Capture trigger failed:', e); }

    res.json({
      success: true,
      message: 'BARDI token updated — works with ANY paste format!',
      data: { sessions_affected: sessionsAffected, sessions_restarted: restartedSessions },
    });

  } catch (error) {
    console.error('Error in updateBardiToken:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get the persisted BARDI session token
 * GET /api/cctv-monitoring/bardi-token
 */
exports.getBardiToken = async (req, res) => {
  try {
    const setting = SystemSettings
      ? await SystemSettings.findOne({ where: { setting_key: BARDI_TOKEN_SETTING_KEY } })
      : null;

    if (!setting) {
      return res.json({
        success: true,
        data: null,
        message: 'No BARDI token saved yet',
      });
    }

    let parsedToken = null;
    try {
      parsedToken = setting.data_type === 'json'
        ? JSON.parse(setting.setting_value)
        : setting.setting_value;
    } catch (parseError) {
      console.error('Failed to parse saved BARDI token:', parseError);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse stored BARDI token',
      });
    }

    res.json({
      success: true,
      data: {
        session_token: parsedToken,
        updated_at: setting.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in getBardiToken:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch BARDI token',
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

