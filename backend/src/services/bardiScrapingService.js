const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class BardiScrapingService {
  constructor() {
    this.baseUrl = 'https://ipc.bardi.co.id';
    this.apiBaseUrl = 'https://ipc.bardi.co.id/api'; // Adjust based on actual API endpoints
    this.sessionPath = path.join(__dirname, '../../session.json');
    this.session = null;
    
    // Create an HTTPS agent that doesn't reject unauthorized certificates
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  /**
   * Load session data from session.json
   */
  async loadSession() {
    try {
      const sessionData = await fs.readFile(this.sessionPath, 'utf-8');
      this.session = JSON.parse(sessionData);
      console.log('Session loaded successfully');
      return this.session;
    } catch (error) {
      console.error('Error loading session:', error.message);
      throw new Error('Failed to load session file. Please ensure session.json exists.');
    }
  }

  /**
   * Get axios config with session cookies and headers
   */
  getAxiosConfig(additionalHeaders = {}) {
    if (!this.session) {
      throw new Error('Session not loaded. Call loadSession() first.');
    }

    // Convert cookies object to cookie string
    const cookieString = Object.entries(this.session.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return {
      headers: {
        ...this.session.headers,
        ...additionalHeaders,
        Cookie: cookieString,
      },
      withCredentials: true,
      httpsAgent: this.httpsAgent,
    };
  }

  /**
   * Test if the session is valid by making a test request
   */
  async testSession() {
    try {
      await this.loadSession();
      
      const config = this.getAxiosConfig();
      const response = await axios.get(this.baseUrl, config);
      
      return {
        success: true,
        statusCode: response.status,
        message: 'Session is valid',
        responseLength: response.data.length,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get user profile/info
   */
  async getUserInfo() {
    try {
      if (!this.session) {
        await this.loadSession();
      }

      const config = this.getAxiosConfig();
      const response = await axios.get(`${this.apiBaseUrl}/user/info`, config);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting user info:', error.message);
      return {
        success: false,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get devices list
   */
  async getDevices() {
    try {
      if (!this.session) {
        await this.loadSession();
      }

      const config = this.getAxiosConfig();
      const response = await axios.get(`${this.apiBaseUrl}/devices`, config);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting devices:', error.message);
      return {
        success: false,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get device details by ID
   */
  async getDeviceDetails(deviceId) {
    try {
      if (!this.session) {
        await this.loadSession();
      }

      const config = this.getAxiosConfig();
      const response = await axios.get(`${this.apiBaseUrl}/devices/${deviceId}`, config);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting device details:', error.message);
      return {
        success: false,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get device status/events
   */
  async getDeviceStatus(deviceId) {
    try {
      if (!this.session) {
        await this.loadSession();
      }

      const config = this.getAxiosConfig();
      const response = await axios.get(`${this.apiBaseUrl}/devices/${deviceId}/status`, config);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting device status:', error.message);
      return {
        success: false,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Make a custom GET request to any endpoint
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      if (!this.session) {
        await this.loadSession();
      }

      const config = this.getAxiosConfig();
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      
      let response;
      if (method.toUpperCase() === 'GET') {
        response = await axios.get(url, config);
      } else if (method.toUpperCase() === 'POST') {
        response = await axios.post(url, data, config);
      } else if (method.toUpperCase() === 'PUT') {
        response = await axios.put(url, data, config);
      } else if (method.toUpperCase() === 'DELETE') {
        response = await axios.delete(url, config);
      }
      
      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      console.error(`Error making ${method} request to ${endpoint}:`, error.message);
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Update session cookies and headers
   */
  async updateSession(newSession) {
    try {
      await fs.writeFile(this.sessionPath, JSON.stringify(newSession, null, 2));
      this.session = newSession;
      console.log('Session updated successfully');
      return { success: true, message: 'Session updated' };
    } catch (error) {
      console.error('Error updating session:', error.message);
      throw new Error('Failed to update session file');
    }
  }

  /**
   * Take a screenshot of the camera interface
   * This method tries to capture a screenshot by calling screenshot endpoints
   */
  async takeCameraScreenshot(deviceId = null) {
    await this.loadSession();
    const config = this.getAxiosConfig();
    
    try {
      // Try different possible screenshot endpoints
      const screenshotEndpoints = [
        '/api/screenshot',
        '/api/capture',
        '/api/camera/screenshot',
        '/api/device/screenshot',
        `/api/device/${deviceId}/screenshot`,
        '/home/screenshot',
        '/camera/screenshot'
      ];

      for (const endpoint of screenshotEndpoints) {
        try {
          console.log(`Trying screenshot endpoint: ${endpoint}`);
          const response = await axios.post(`${this.baseUrl}${endpoint}`, {}, config);
          
          if (response.status === 200) {
            return {
              success: true,
              data: response.data,
              endpoint: endpoint,
              statusCode: response.status,
              headers: response.headers
            };
          }
        } catch (endpointError) {
          // Continue to next endpoint
          console.log(`Endpoint ${endpoint} failed: ${endpointError.message}`);
        }
      }

      // If no screenshot endpoint worked, return the camera page
      const cameraResponse = await axios.get(`${this.baseUrl}/`, config);
      return {
        success: true,
        data: cameraResponse.data,
        message: "Screenshot endpoint not found, returning camera interface HTML",
        statusCode: cameraResponse.status
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 500
      };
    }
  }
}

module.exports = new BardiScrapingService();

