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
   * Capture screenshot from specific panel using Puppeteer
   * BARDI camera interface uses a 2x2 grid layout
   * @param {number} panelRow - Panel row (1-2)
   * @param {number} panelColumn - Panel column (1-2)
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<Object>} Screenshot result with image buffer
   */
  async capturePanelScreenshot(panelRow, panelColumn, deviceId = null) {
    const puppeteer = require('puppeteer');
    let browser = null;
    
    try {
      // Handle null/undefined panel coordinates - default to [1,1]
      const finalPanelRow = (panelRow !== null && panelRow !== undefined && !isNaN(panelRow)) ? panelRow : 1;
      const finalPanelColumn = (panelColumn !== null && panelColumn !== undefined && !isNaN(panelColumn)) ? panelColumn : 1;
      
      console.log(`📸 Capturing panel screenshot [Row ${finalPanelRow}, Col ${finalPanelColumn}]`);
      if (panelRow !== finalPanelRow || panelColumn !== finalPanelColumn) {
        console.log(`⚠️  Panel values were null/undefined/NaN, defaulted to [1,1]. Original values: [${panelRow}, ${panelColumn}]`);
      }
      
      // Validate panel coordinates (2x2 grid)
      if (finalPanelRow < 1 || finalPanelRow > 2 || finalPanelColumn < 1 || finalPanelColumn > 2) {
        throw new Error(`Invalid panel coordinates [${finalPanelRow}, ${finalPanelColumn}]. Must be 1-2 for both row and column.`);
      }
      
      // Calculate panel index in 2x2 grid
      // [1,1]=0, [1,2]=1, [2,1]=2, [2,2]=3
      const panelIndex = (finalPanelRow - 1) * 2 + (finalPanelColumn - 1);
      console.log(`   Panel index in grid: ${panelIndex}`);
      
      // 1. Launch browser (headless for production)
      console.log('🚀 Launching browser...');
      browser = await puppeteer.launch({
        headless: true, // Run in background
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      // 2. Load session and set cookies BEFORE navigation (like working script)
      console.log('🔐 Loading session...');
      const session = await this.loadSession();
      
      // 3. Set cookies BEFORE navigating (critical!)
      console.log('💉 Setting session cookies...');
      const cookies = Object.entries(session.cookies).map(([name, value]) => ({
        name,
        value,
        domain: 'ipc.bardi.co.id',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'None' // Must be 'None' for cross-site cookies
      }));
      await page.setCookie(...cookies);
      console.log(`✅ Set ${cookies.length} cookies (including s-sid: ${session.cookies['s-sid'] ? session.cookies['s-sid'].substring(0, 20) + '...' : 'MISSING!'})`);
      
      // 4. Navigate to playback page WITH cookies already set
      console.log('🌐 Navigating to BARDI playback...');
      await page.goto('https://ipc.bardi.co.id/playback', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if we're still on login page
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      if (currentUrl.includes('/login')) {
        throw new Error('Still on login page - BARDI session (s-sid) has expired. Please update the session token using "Update Token" button in the frontend.');
      }
      
      console.log('✅ Successfully logged in with session');
      
      // 5. Wait for playback page to fully load
      console.log('⏳ Waiting for playback page to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 6. Save debug screenshot of playback page (before clicking)
      const fs = require('fs').promises;
      const debugPath = path.join(__dirname, '../../screenshots/debug_before_click.png');
      await page.screenshot({ path: debugPath, fullPage: false });
      console.log(`🐛 Debug screenshot saved: ${debugPath}`);
      
      // 7. Expand "All Devices" toggle (like working script does)
      console.log('🔍 Looking for "All Devices" toggle...');
      const allDevicesExpanded = await this.expandAllDevices(page);
      if (allDevicesExpanded) {
        console.log('⏳ Waiting after expanding devices...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Give time for grid to appear
      }
      
      // 8. Check for video elements BEFORE clicking anything (grid should be visible)
      console.log('🔍 Checking for existing video grid...');
      let allVideos = [];
      let retryCount = 0;
      const maxRetries = 10;
      
      // Try to find videos without clicking camera first
      while (allVideos.length < 4 && retryCount < maxRetries) {
        allVideos = await page.$$('video');
        console.log(`   Attempt ${retryCount + 1}/${maxRetries}: Found ${allVideos.length} video element(s)`);
        
        // If we found 4+ videos, we have the grid view!
        if (allVideos.length >= 4) {
          console.log('✅ Grid view detected! No need to click camera.');
          break;
        }
        
        // If after 5 attempts we still don't have grid, try clicking camera
        if (retryCount === 4 && allVideos.length < 4) {
          console.log('⚠️ Grid not visible, trying to click camera device...');
          const cameraClicked = await this.clickCameraFromSidebar(page, panelIndex, deviceId);
          if (cameraClicked) {
            console.log('✅ Camera clicked, waiting for view to load...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
        if (allVideos.length < 4 && retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retryCount++;
      }
      
      if (allVideos.length === 0) {
        console.log('⚠️ No video elements found after waiting.');
        
        // Debug: Check what elements are on the page
        console.log('🔍 Debugging - checking for other media elements...');
        const canvasElements = await page.$$('canvas');
        const imgElements = await page.$$('img');
        const iframes = await page.$$('iframe');
        console.log(`   Found ${canvasElements.length} canvas element(s)`);
        console.log(`   Found ${imgElements.length} img element(s)`);
        console.log(`   Found ${iframes.length} iframe(s)`);
        
        // Try to find any element that might contain video
        const videoContainers = await page.$$('[class*="video"], [class*="player"], [class*="stream"], [class*="camera"]');
        console.log(`   Found ${videoContainers.length} potential video container(s)`);
        
        // Check if videos are in an iframe
        if (iframes.length > 0) {
          console.log('⚠️ Videos might be inside an iframe. Checking first iframe...');
          try {
            const frame = await iframes[0].contentFrame();
            if (frame) {
              const iframeVideos = await frame.$$('video');
              console.log(`   Found ${iframeVideos.length} video(s) inside iframe`);
              if (iframeVideos.length > 0) {
                allVideos = iframeVideos;
              }
            }
          } catch (e) {
            console.log(`   Error accessing iframe: ${e.message}`);
          }
        }
      } else {
        console.log(`✅ Found ${allVideos.length} video element(s) after ${retryCount} attempt(s)`);
      }
      
      // Save debug screenshot of initial state
      const debugPath2 = path.join(__dirname, '../../screenshots/debug_grid_view.png');
      await page.screenshot({ path: debugPath2, fullPage: false });
      console.log(`🐛 Debug screenshot saved: ${debugPath2}`);
      
      // 10. Capture the target panel by screen position (works even if panel is empty)
      console.log('📷 Attempting to capture target panel...');
      let imageBuffer;
      
      // Strategy 1: If we're in grid view (4+ videos), capture by video element
      if (allVideos.length >= 4) {
        console.log(`✅ Grid view detected with ${allVideos.length} video elements`);
        console.log(`🎯 Target panel [${finalPanelRow}, ${finalPanelColumn}] = video index ${panelIndex}`);
        
        // Log all video elements for debugging
        for (let i = 0; i < allVideos.length; i++) {
          const box = await allVideos[i].boundingBox();
          if (box) {
            console.log(`   Video[${i}]: ${Math.round(box.width)}x${Math.round(box.height)}px at [${Math.round(box.x)}, ${Math.round(box.y)}]`);
          }
        }
        
        // Capture the target panel
        if (panelIndex < allVideos.length) {
          const targetVideo = allVideos[panelIndex];
          const box = await targetVideo.boundingBox();
          
          if (box) {
            console.log(`✅ Capturing panel [${finalPanelRow}, ${finalPanelColumn}] at video[${panelIndex}]`);
            console.log(`   Size: ${Math.round(box.width)}x${Math.round(box.height)}px`);
            console.log(`   Position: [${Math.round(box.x)}, ${Math.round(box.y)}]`);
            
            imageBuffer = await targetVideo.screenshot({ 
              type: 'jpeg',
              quality: 90,
              encoding: 'binary'
            });
            
            console.log(`✅ Successfully captured panel [${finalPanelRow}, ${finalPanelColumn}]: ${imageBuffer.length} bytes`);
          } else {
            console.log(`⚠️ No bounding box for video[${panelIndex}]`);
          }
        } else {
          console.log(`⚠️ Panel index ${panelIndex} out of range (only ${allVideos.length} videos available)`);
        }
      } 
      
      // Strategy 2: Capture by screen position (works for grid with empty panels)
      if (!imageBuffer && allVideos.length > 0 && allVideos.length < 4) {
        console.log(`⚠️ Found ${allVideos.length} video(s) - grid may have empty panels`);
        console.log('🎯 Attempting to capture by screen position...');
        
        // Get the position of the first video to determine grid layout
        const firstVideoBox = await allVideos[0].boundingBox();
        
        if (firstVideoBox) {
          console.log(`   First video at [${Math.round(firstVideoBox.x)}, ${Math.round(firstVideoBox.y)}], size ${Math.round(firstVideoBox.width)}x${Math.round(firstVideoBox.height)}`);
          
          // Calculate panel position based on first video
          // Assume 2x2 grid where each panel has similar size
          const panelWidth = firstVideoBox.width;
          const panelHeight = firstVideoBox.height;
          const gridStartX = firstVideoBox.x;
          const gridStartY = firstVideoBox.y;
          
          // Calculate target panel position
          const targetX = gridStartX + (finalPanelColumn - 1) * panelWidth;
          const targetY = gridStartY + (finalPanelRow - 1) * panelHeight;
          
          console.log(`   Target panel [${finalPanelRow}, ${finalPanelColumn}] position: [${Math.round(targetX)}, ${Math.round(targetY)}]`);
          console.log(`   Capturing region: ${Math.round(panelWidth)}x${Math.round(panelHeight)}px`);
          
          // Capture that specific region
          const viewport = page.viewport();
          imageBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 90,
            clip: {
              x: Math.max(0, targetX),
              y: Math.max(0, targetY),
              width: Math.min(panelWidth, viewport.width - targetX),
              height: Math.min(panelHeight, viewport.height - targetY)
            },
            encoding: 'binary'
          });
          
          console.log(`✅ Captured panel by position: ${imageBuffer.length} bytes`);
        }
      } else if (!imageBuffer && allVideos.length === 0) {
        console.log(`⚠️ No videos found - cannot determine grid layout`);
      }
      
      // If we didn't capture from grid view, try to find the best video element
      if (!imageBuffer) {
        console.log('🔍 Grid capture failed or not applicable, finding best video element...');
        
        let bestVideo = null;
        let largestSize = 0;
        
        for (let i = 0; i < allVideos.length; i++) {
          const box = await allVideos[i].boundingBox();
          if (box) {
            const size = box.width * box.height;
            console.log(`   Video[${i}]: ${Math.round(box.width)}x${Math.round(box.height)}px (${Math.round(size)} px²)`);
            
            // Prefer larger videos (single camera view should be largest)
            if (size > largestSize && box.width > 300 && box.height > 200) {
              bestVideo = allVideos[i];
              largestSize = size;
            }
          }
        }
        
        if (bestVideo) {
          const box = await bestVideo.boundingBox();
          console.log(`✅ Capturing best video element: ${Math.round(box.width)}x${Math.round(box.height)}px`);
          imageBuffer = await bestVideo.screenshot({ 
            type: 'jpeg',
            quality: 90,
            encoding: 'binary'
          });
        }
      }
      
      // Final fallback if still no image
      if (!imageBuffer) {
        // Fallback: Try other selectors
        const videoSelectors = [
          'video',
          'canvas',
          '.camera-feed video',
          '[class*="video"] video',
          '[class*="player"] video',
        ];
        
        for (const selector of videoSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const box = await element.boundingBox();
              if (box && box.width > 300 && box.height > 200) {
                console.log(`✅ Found camera feed with selector: ${selector}`);
                console.log(`   Size: ${Math.round(box.width)}x${Math.round(box.height)}px`);
                imageBuffer = await element.screenshot({ 
                  type: 'jpeg',
                  quality: 90,
                  encoding: 'binary'
                });
                break;
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Last resort: capture main content area (excluding sidebar)
        if (!imageBuffer) {
          console.log('⚠️ No suitable video element found, capturing main content area...');
          const viewport = page.viewport();
          imageBuffer = await page.screenshot({ 
            type: 'jpeg',
            quality: 90,
            clip: {
              x: 250,      // Skip sidebar
              y: 50,       // Skip header
              width: viewport.width - 300,  // Main content width
              height: viewport.height - 100  // Main content height
            },
            encoding: 'binary'
          });
          console.log(`   Captured main content area`);
        }
      }
      
      // 11. Cleanup
      await browser.close();
      browser = null;
      
      console.log(`✅ Panel screenshot captured: ${imageBuffer.length} bytes`);
      
      return {
        success: true,
        imageBuffer: Buffer.from(imageBuffer),
        contentType: 'image/jpeg',
        size: imageBuffer.length,
        panel: { row: finalPanelRow, column: finalPanelColumn, index: panelIndex }
      };

    } catch (error) {
      console.error('Panel screenshot capture error:', error);
      
      // Cleanup browser if still open
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
      
      return {
        success: false,
        error: error.message,
        imageBuffer: null,
      };
    }
  }

  /**
   * Expand "All Devices" toggle in sidebar
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<boolean>} Success status
   */
  async expandAllDevices(page) {
    try {
      const allDevicesSelectors = [
        '.ant-tree-switcher',
        '.ant-tree-switcher_open',
        '.anticon-caret-down',
        'span[aria-label="caret-down"]',
        '[class*="ant-tree-switcher"]',
        '[class*="caret-down"]'
      ];

      for (const selector of allDevicesSelectors) {
        try {
          const elements = await page.$$(selector);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const classes = await element.evaluate(el => el.className || '');
            
            const isAlreadyOpen = classes.includes('ant-tree-switcher_open');
            if (isAlreadyOpen) {
              console.log('✅ "All Devices" is already open');
              return true;
            }
            
            // Try to click to expand
            const needsClick = classes.includes('ant-tree-switcher') && !isAlreadyOpen;
            if (needsClick) {
              console.log(`✅ Clicking "All Devices" toggle: ${selector}[${i}]`);
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              return true;
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.log('⚠️ Could not find "All Devices" toggle');
      return false;
    } catch (error) {
      console.error('Error expanding All Devices:', error);
      return false;
    }
  }

  /**
   * Click camera device from sidebar (matches working script approach)
   * This switches from 2x2 grid view to single camera view
   * @param {Page} page - Puppeteer page object
   * @param {number} panelIndex - Panel index (0-3) - which camera to select if multiple
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<boolean>} Success status
   */
  async clickCameraFromSidebar(page, panelIndex, deviceId = null) {
    try {
      // Strategy 1: Click by device ID if provided
      if (deviceId) {
        const deviceSelectors = [
          `[data-device-id="${deviceId}"]`,
          `[device-id="${deviceId}"]`,
          `.device-${deviceId}`,
          `*[title*="${deviceId}"]`,
        ];
        
        for (const selector of deviceSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              console.log(`✅ Found device by ID: ${selector}`);
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              return true;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Strategy 2: Find camera devices in sidebar (like working script)
      const cameraSelectors = [
        '.ant-tree-treenode-selected',
        '.deviceItem_box__3ZdcA',
        'span:has-text("BARDI Smart IP Camera PTZ Indoor Syno")',
        'div:has-text("BARDI Smart IP Camera")',
        '[class*="deviceItem"]',
        '[class*="device_online"]',
        '.ant-tree-treenode',  // Tree node items
      ];
      
      for (const selector of cameraSelectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
          
          if (elements.length > 0) {
            // Get all camera devices
            const cameraDevices = [];
            for (let i = 0; i < elements.length; i++) {
              const text = await elements[i].evaluate(el => el.textContent || '');
              const classes = await elements[i].evaluate(el => el.className || '');
              
              // Filter for camera devices
              if (text.includes('BARDI') || text.includes('Camera') || 
                  text.includes('PTZ') || classes.includes('device_online')) {
                cameraDevices.push({ element: elements[i], index: i, text, classes });
              }
            }
            
            console.log(`✅ Found ${cameraDevices.length} camera device(s) in sidebar`);
            
            // Click the camera at panelIndex (or first one if panelIndex doesn't exist)
            if (cameraDevices.length > 0) {
              const cameraToClick = cameraDevices[panelIndex] || cameraDevices[0];
              console.log(`🎯 Clicking camera device: "${cameraToClick.text.substring(0, 50)}..."`);
              await cameraToClick.element.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              return true;
            }
          }
        } catch (e) {
          console.log(`   Error with selector ${selector}: ${e.message}`);
        }
      }
      
      // Strategy 3: Fallback - find any clickable element with "BARDI" or "Camera" text
      try {
        const allElements = await page.$$('*');
        for (let i = 0; i < Math.min(allElements.length, 100); i++) {
          const text = await allElements[i].evaluate(el => el.textContent || '');
          if (text.includes('BARDI Smart IP Camera') || 
              (text.includes('Camera') && text.includes('BARDI'))) {
            console.log(`✅ Found camera by text search, clicking...`);
            await allElements[i].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          }
        }
      } catch (e) {
        console.log('   Text search failed:', e.message);
      }
      
      console.log('⚠️ Could not find camera device in sidebar');
      return false;
      
    } catch (error) {
      console.error('Error clicking camera from sidebar:', error);
      return false;
    }
  }

  /**
   * Click on panel in the camera grid (legacy method - kept for reference)
   * @param {Page} page - Puppeteer page object
   * @param {number} panelRow - Panel row (1-2)
   * @param {number} panelColumn - Panel column (1-2)
   * @param {number} panelIndex - Panel index (0-3 for 2x2 grid)
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<boolean>} Success status
   */
  async clickPanelInGrid(page, panelRow, panelColumn, panelIndex, deviceId = null) {
    try {
      // Strategy 1: Find camera grid panels (not tree nodes)
      // Look for actual video/camera containers in the playback grid
      const gridPanelSelectors = [
        // Common grid/panel patterns
        'div[class*="grid"] div[class*="panel"]',      // Grid with panels
        'div[class*="camera-grid"] > div',             // Camera grid children
        'div[class*="playback"] div[class*="cell"]',   // Playback grid cells
        'div[class*="view"] div[class*="item"]',       // View grid items
        '[class*="layout"] [class*="panel"]',          // Layout panels
        'div[class*="split"] > div',                   // Split view panels
        'div[class*="player"]',                        // Player containers
      ];
      
      console.log('🔍 Looking for camera grid panels...');
      
      for (const selector of gridPanelSelectors) {
        try {
          const panels = await page.$$(selector);
          console.log(`   Found ${panels.length} elements with selector: ${selector}`);
          
          // For 2x2 grid, we should find 4 panels
          if (panels.length >= 4 && panels.length <= 10) {
            console.log(`✅ Found ${panels.length} potential grid panels, clicking panel ${panelIndex}...`);
            
            // Click the panel at the calculated index
            if (panelIndex < panels.length) {
              const boundingBox = await panels[panelIndex].boundingBox();
              if (boundingBox) {
                // Use coordinates click instead of element click (more reliable)
                await page.mouse.click(
                  boundingBox.x + boundingBox.width / 2,
                  boundingBox.y + boundingBox.height / 2
                );
                console.log(`✅ Clicked panel at position [${panelRow}, ${panelColumn}]`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return true;
              }
            }
          }
        } catch (e) {
          console.log(`   Error with selector ${selector}: ${e.message}`);
        }
      }
      
      // Strategy 2: Try clicking by device ID if provided
      if (deviceId) {
        const deviceSelectors = [
          `[data-device-id="${deviceId}"]`,
          `[device-id="${deviceId}"]`,
          `.device-${deviceId}`,
          `*[title*="${deviceId}"]`,
        ];
        
        for (const selector of deviceSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              console.log(`✅ Found device by ID: ${selector}`);
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              return true;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Strategy 3: Try to find video elements and click their container
      try {
        const allVideos = await page.$$('video');
        console.log(`🔍 Found ${allVideos.length} video elements on page`);
        
        if (allVideos.length >= 4) {
          // Multiple videos = grid view, click the one at panelIndex
          if (panelIndex < allVideos.length) {
            console.log(`✅ Clicking video container at index ${panelIndex}...`);
            const video = allVideos[panelIndex];
            const parent = await video.evaluateHandle(el => el.parentElement);
            if (parent) {
              await parent.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              return true;
            }
          }
        }
      } catch (e) {
        console.log('   Video clicking failed:', e.message);
      }
      
      // Strategy 4: Try clicking by coordinates (calculate position in 2x2 grid)
      try {
        const viewport = page.viewport();
        const width = viewport.width;
        const height = viewport.height;
        
        // Calculate click position for 2x2 grid
        // Assuming grid is in center/main area of page
        const gridStartX = width * 0.2; // Left margin
        const gridStartY = height * 0.2; // Top margin
        const gridWidth = width * 0.6;   // Grid width
        const gridHeight = height * 0.6; // Grid height
        
        // Panel width/height
        const panelWidth = gridWidth / 2;
        const panelHeight = gridHeight / 2;
        
        // Click position for [row, column]
        const clickX = gridStartX + (panelColumn - 0.5) * panelWidth;
        const clickY = gridStartY + (panelRow - 0.5) * panelHeight;
        
        console.log(`📍 Attempting coordinate click at [${Math.round(clickX)}, ${Math.round(clickY)}]`);
        await page.mouse.click(clickX, clickY);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Coordinate click executed');
        return true;
      } catch (e) {
        console.log('   Coordinate click failed:', e.message);
      }
      
      console.log('⚠️ Could not reliably click specific panel - will capture what\'s visible');
      return false;
      
    } catch (error) {
      console.error('Error clicking panel:', error);
      return false;
    }
  }

  /**
   * Legacy method - now uses Puppeteer panel capture
   * @deprecated Use capturePanelScreenshot instead
   */
  async getCameraSnapshot(deviceId = null) {
    console.log('⚠️ getCameraSnapshot is deprecated - using panel capture instead');
    // Default to panel [1,1] for backward compatibility
    return this.capturePanelScreenshot(1, 1, deviceId);
  }

  /**
   * Take a screenshot of the camera interface (legacy method - kept for compatibility)
   * This method tries to capture a screenshot by calling screenshot endpoints
   */
  async takeCameraScreenshot(deviceId = null) {
    // Use the new snapshot method
    return this.getCameraSnapshot(deviceId);
  }
}

module.exports = new BardiScrapingService();

