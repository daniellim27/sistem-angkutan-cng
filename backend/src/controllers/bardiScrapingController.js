// backend/src/controllers/bardiScrapingController.js

const bardiScrapingService = require('../services/bardiScrapingService');

/**
 * Test Session
 */
exports.testSession = async (req, res) => {
  try {
    const result = await bardiScrapingService.testSession();
    res.json(result.success ? { success: true, data: result } : { success: false, error: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get User Info
 */
exports.getUserInfo = async (req, res) => {
  try {
    const result = await bardiScrapingService.getUserInfo();
    res.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get All Devices
 */
exports.getDevices = async (req, res) => {
  try {
    const result = await bardiScrapingService.getDevices();
    res.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Device Details
 */
exports.getDeviceDetails = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId is required' });

    const result = await bardiScrapingService.getDeviceDetails(deviceId);
    res.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Device Status
 */
exports.getDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId is required' });

    const result = await bardiScrapingService.getDeviceStatus(deviceId);
    res.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Take Screenshot – by row in sidebar (most reliable)
 * POST /devices/:deviceId/screenshot → fallback to row 1
 * POST /screenshot → uses body.row or defaults to 1
 */
// In bardiScrapingController.js → takeCameraScreenshot
exports.takeCameraScreenshot = async (req, res) => {
  try {
    const row = parseInt(req.body.row) || 1;

    const result = await bardiScrapingService.capturePanelScreenshot(row);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to capture screenshot',
        error: result.error
      });
    }

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-store');
    res.send(result.imageBuffer);

  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Click Fullscreen – by sidebar row (1-based)
 * POST /camera/fullscreen { "row": 2 }
 */
exports.clickFullscreen = async (req, res) => {
  try {
    const row = parseInt(req.body.row) || 1;
    const result = await bardiScrapingService.clickFullscreen(row);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Click Fullscreen – by exact camera name
 * POST /camera/fullscreen-by-name { "name": "BARDI Smart IP Camera PTZ Indoor Syno 2" }
 */
exports.clickFullscreenByName = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const result = await bardiScrapingService.clickFullscreenByName(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PTZ Control
 * POST /camera/ptz
 * { "row": 1, "direction": "up", "duration": 800 }
 * direction: up, down, left, right, zoomIn, zoomOut
 */
exports.controlPTZ = async (req, res) => {
  try {
    const { row = 1, direction = 'up', duration = 800 } = req.body;

    const validDirections = ['up', 'down', 'left', 'right', 'zoomin', 'zoomout'];
    if (!validDirections.includes(direction.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid direction' });
    }

    const result = await bardiScrapingService.controlPTZ(row, direction.toLowerCase(), duration);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Make Custom Request (debug / advanced)
 */
exports.makeCustomRequest = async (req, res) => {
  try {
    const { endpoint, method = 'GET', data } = req.body;
    if (!endpoint) return res.status(400).json({ success: false, message: 'endpoint required' });

    const result = await bardiScrapingService.makeRequest(endpoint, method, data);
    res.json(result.success ? { success: true, data: result } : { success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update Session (cookies + headers)
 */
exports.updateSession = async (req, res) => {
  try {
    const { cookies, headers } = req.body;
    if (!cookies || !headers) return res.status(400).json({ success: false, message: 'cookies & headers required' });

    await bardiScrapingService.updateSession({ cookies, headers });
    res.json({ success: true, message: 'Session updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Session Info (safe)
 */
exports.getSessionInfo = async (req, res) => {
  try {
    const session = await bardiScrapingService.loadSession();
    res.json({
      success: true,
      cookieCount: Object.keys(session.cookies || {}).length,
      headerCount: Object.keys(session.headers || {}).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};