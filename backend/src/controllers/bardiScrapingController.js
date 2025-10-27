const bardiScrapingService = require('../services/bardiScrapingService');

/**
 * Test if the Bardi session is valid
 */
exports.testSession = async (req, res) => {
  try {
    const result = await bardiScrapingService.testSession();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Session is valid and working',
        data: result,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Session test failed',
        error: result,
      });
    }
  } catch (error) {
    console.error('Error testing session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test session',
      error: error.message,
    });
  }
};

/**
 * Get user information from Bardi
 */
exports.getUserInfo = async (req, res) => {
  try {
    const result = await bardiScrapingService.getUserInfo();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get user info',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info',
      error: error.message,
    });
  }
};

/**
 * Get all devices from Bardi
 */
exports.getDevices = async (req, res) => {
  try {
    const result = await bardiScrapingService.getDevices();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get devices',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get devices',
      error: error.message,
    });
  }
};

/**
 * Get device details by ID
 */
exports.getDeviceDetails = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
    }
    
    const result = await bardiScrapingService.getDeviceDetails(deviceId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get device details',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error getting device details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device details',
      error: error.message,
    });
  }
};

/**
 * Get device status
 */
exports.getDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
    }
    
    const result = await bardiScrapingService.getDeviceStatus(deviceId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get device status',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device status',
      error: error.message,
    });
  }
};

/**
 * Make a custom request to Bardi API
 */
exports.makeCustomRequest = async (req, res) => {
  try {
    const { endpoint, method = 'GET', data } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required',
      });
    }
    
    const result = await bardiScrapingService.makeRequest(endpoint, method, data);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        statusCode: result.statusCode,
        headers: result.headers,
      });
    } else {
      res.status(result.statusCode || 400).json({
        success: false,
        message: 'Request failed',
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    console.error('Error making custom request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make custom request',
      error: error.message,
    });
  }
};

/**
 * Update session data
 */
exports.updateSession = async (req, res) => {
  try {
    const { cookies, headers } = req.body;
    
    if (!cookies || !headers) {
      return res.status(400).json({
        success: false,
        message: 'Cookies and headers are required',
      });
    }
    
    const newSession = { cookies, headers };
    const result = await bardiScrapingService.updateSession(newSession);
    
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message,
    });
  }
};

/**
 * Load and return current session data (without sensitive info)
 */
exports.getSessionInfo = async (req, res) => {
  try {
    const session = await bardiScrapingService.loadSession();
    
    // Return session info without exposing full cookie values
    const sessionInfo = {
      cookies: Object.keys(session.cookies),
      headers: Object.keys(session.headers),
      hasValidStructure: !!(session.cookies && session.headers),
    };
    
    res.json({
      success: true,
      data: sessionInfo,
    });
  } catch (error) {
    console.error('Error getting session info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session info',
      error: error.message,
    });
  }
};

/**
 * Take a screenshot of the camera interface
 */
exports.takeCameraScreenshot = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const result = await bardiScrapingService.takeCameraScreenshot(deviceId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Screenshot captured successfully',
        data: result.data,
        endpoint: result.endpoint,
        statusCode: result.statusCode,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to take screenshot',
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to take screenshot',
      error: error.message,
    });
  }
};

