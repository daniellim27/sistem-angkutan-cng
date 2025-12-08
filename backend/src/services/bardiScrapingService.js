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

  async clickFullscreen(panelRow = 1) {
    let browser = null;
    try {
      const row = parseInt(panelRow);
      console.log(`Clicking fullscreen on camera row ${row}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      const session = await this.loadSession();
      const cookies = Object.entries(session.cookies).map(([name, value]) => ({
        name, value, domain: 'ipc.bardi.co.id', path: '/', secure: true, sameSite: 'None'
      }));
      await page.setCookie(...cookies);

      await page.goto('https://ipc.bardi.co.id/playback', { waitUntil: 'networkidle2', timeout: 30000 });

      if (page.url().includes('/login')) {
        throw new Error('Session expired');
      }

      // Expand All Devices
      await this.expandAllDevices(page);
      await page.waitForTimeout(2000);

      // Click the camera by row
      const clicked = await this.clickCameraByRow(page, row);
      if (!clicked) throw new Error(`Camera row ${row} not found`);

      await page.waitForTimeout(4000); // Wait for video to load

      // Click the fullscreen button (8th icon from the left)
      const fullscreenClicked = await page.evaluate(() => {
        const panels = document.querySelectorAll('.gridShow_item__cpdxP');
        if (panels.length === 0) return false;

        // Find the active/single view panel or first one
        let targetPanel = document.querySelector('.gridShow_item__cpdxP');
        if (panels.length > 1) {
          targetPanel = Array.from(panels).find(p => 
            p.querySelector('video') && p.querySelector('video').src
          ) || panels[0];
        }

        const fullscreenBtn = targetPanel.querySelector(
          '.videoTool_control__ybx2m span:nth-last-child(2) .SVG_cs-wrapper__3Cu4D'
        );

        if (fullscreenBtn) {
          fullscreenBtn.click();
          return true;
        }
        return false;
      });

      await browser.close();
      return {
        success: true,
        action: 'fullscreen_clicked',
        cameraRow: row,
        fullscreenClicked
      };

    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return { success: false, error: error.message };
    }
  }

  // ————————————————————————
  // Click Fullscreen by Camera Name
  // ————————————————————————
  async clickFullscreenByName(cameraName) {
    let browser = null;
    try {
      console.log(`Clicking fullscreen on camera: "${cameraName}"`);

      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      await this.loadSession();
      await page.setCookie(...Object.entries(this.session.cookies).map(([n, v]) => ({
        name: n, value: v, domain: 'ipc.bardi.co.id', path: '/', secure: true
      })));

      await page.goto('https://ipc.bardi.co.id/playback', { waitUntil: 'networkidle2' });

      await this.expandAllDevices(page);
      await page.waitForTimeout(2000);

      const clicked = await page.evaluate((name) => {
        const deviceNames = document.querySelectorAll('.commonTool_device-name__3tXY0');
        for (const el of deviceNames) {
          if (el.textContent.trim() === name) {
            el.closest('.gridShow_item__cpdxP')
              .querySelector('.videoTool_control__ybx2m span:nth-last-child(2) .SVG_cs-wrapper__3Cu4D')
              ?.click();
            return true;
          }
        }
        return false;
      }, cameraName);

      await browser.close();
      return { success: clicked, camera: cameraName, action: 'fullscreen' };

    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return { success: false, error: error.message };
    }
  }

  // ————————————————————————
  // PTZ Control (up/down/left/right/zoom)
  // ————————————————————————
  async controlPTZ(panelRow = 1, direction = 'up', durationMs = 800) {
    let browser = null;
    try {
      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      await this.loadSession();
      await page.setCookie(...Object.entries(this.session.cookies).map(([n, v]) => ({
        name: n, value: v, domain: 'ipc.bardi.co.id', path: '/', secure: true
      })));

      await page.goto('https://ipc.bardi.co.id/playback', { waitUntil: 'networkidle2' });
      await this.expandAllDevices(page);
      await this.clickCameraByRow(page, panelRow);
      await page.waitForTimeout(4000);

      const result = await page.evaluate((dir, duration) => {
        const panel = document.querySelector('.gridShow_item__cpdxP') ||
                      document.querySelector('.rtcVideo_rtc-wrapper__12Rdu').closest('.gridShow_item__cpdxP');

        if (!panel) return false;

        const ptz = panel.querySelector('.ptzPanel_panel__1ApBZ');
        if (!ptz) return false;

        const buttons = {
          up: ptz.querySelector('svg:nth-child(1)'),
          right: ptz.querySelector('svg:nth-child(2)'),
          down: ptz.querySelector('svg:nth-child(3)'),
          left: ptz.querySelector('svg:nth-child(4)'),
          zoomIn: ptz.querySelector('.ptzPanel_inc__jUlSj'),
          zoomOut: ptz.querySelector('.ptzPanel_dec__29KQ9'),
        };

        const btn = buttons[dir];
        if (!btn) return false;

        // Mouse down → hold → mouse up
        const down = new MouseEvent('mousedown', { bubbles: true });
        const up = new MouseEvent('mouseup', { bubbles: true });
        btn.dispatchEvent(down);
        setTimeout(() => btn.dispatchEvent(up), duration);

        return true;
      }, direction.toLowerCase(), durationMs);

      await page.waitForTimeout(durationMs + 500);
      await browser.close();

      return { success: result, direction, durationMs };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return { success: false, error: error.message };
    }
  }

  // ————————————————————————
  // Improved: Click Camera by Row (uses real sidebar order)
  // ————————————————————————
  async clickCameraByRow(page, row) {
    try {
      const cameraNodes = await page.$$('.ant-tree-treenode .deviceItem_box__3ZdcA');
      if (cameraNodes.length === 0) return false;

      const index = Math.min(row - 1, cameraNodes.length - 1);
      const target = cameraNodes[index];
      const name = await target.evaluate(el => el.textContent.trim());
      console.log(`Clicking camera row ${row}: "${name}"`);
      await target.click({ delay: 100 });
      return true;
    } catch (err) {
      console.error('clickCameraByRow failed:', err);
      return false;
    }
  }

  async expandAllDevices(page) {
    try {
      await page.click('.ant-tree-switcher, [class*="ant-tree-switcher"]', { delay: 100 });
      await page.waitForTimeout(1000);
    } catch (e) { /* ignore if already open */ }
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
   * Capture screenshot from specific panel using the real BARDI sidebar order
   * @param {number} panelRow - 1-based row/order of the camera in the "All Devices" list
   * @param {number} panelColumn - IGNORED (kept for backward compatibility)
   * @param {string} deviceId - Optional device ID (still works if you have it)
   * @returns {Promise<Object>}>} Screenshot result with image buffer
   */
  async capturePanelScreenshot(panelRow, panelColumn, deviceId = null) {
    const puppeteer = require('puppeteer');
    let browser = null;

    try {
      // --------------------------------------------------------------
      // 1. Normalize row – user gives the order in the sidebar list
      // --------------------------------------------------------------
      const targetRow = (panelRow && !isNaN(panelRow) && panelRow > 0) ? parseInt(panelRow, 10) : 1;
      console.log(`[BARDI] Capturing camera at ROW ${targetRow} (sidebar position)`);

      // --------------------------------------------------------------
      // 2. Launch browser
      // --------------------------------------------------------------
      console.log('[BARDI] Launching headless browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: null,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // --------------------------------------------------------------
      // 3. Load session cookies
      // --------------------------------------------------------------
      const session = await this.loadSession();
      const cookies = Object.entries(session.cookies || {}).map(([name, value]) => ({
        name,
        value: String(value),
        domain: 'ipc.bardi.co.id',
        path: '/',
        secure: true,
        sameSite: 'None',
      }));

      await page.setCookie(...cookies);
      console.log(`[BARDI] Set ${cookies.length} cookies`);

      // --------------------------------------------------------------
      // 4. Go to playback page
      // --------------------------------------------------------------
      await page.goto('https://ipc.bardi.co.id/playback', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      if (page.url().includes('/login')) {
        throw new Error('BARDI session expired – redirect to login');
      }

      // --------------------------------------------------------------
      // 5. Expand "All Devices"
      // --------------------------------------------------------------
      console.log('[BARDI] Expanding All Devices and waiting for camera list...');

      await this.expandAllDevices(page);

      // NEW: Smart wait — keep checking until we see real camera entries
      const maxWaitMs = 30_000; // max 30 seconds
      const checkIntervalMs = 1000;
      let attempts = 0;

      while (attempts < maxWaitMs / checkIntervalMs) {
        const cameraCount = await page.evaluate(() => {
          // Look for actual camera items in the sidebar (these have device name + thumbnail)
          return document.querySelectorAll('div[class*="deviceItem"], div[class*="device-item"], [data-testid="device-item"]').length;
        });

        if (cameraCount > 0) {
          console.log(`[BARDI] Found ${cameraCount} camera(s) in sidebar – ready!`);
          break;
        }

        attempts++;
        await new Promise(r => setTimeout(r, checkIntervalMs));
      }

      if (attempts >= maxWaitMs / checkIntervalMs) {
        console.warn('[BARDI] Timeout: No cameras loaded after 30s – proceeding anyway (might get black screen)');
      } else {
        // Extra 3 seconds for streams to start rendering
        await new Promise(r => setTimeout(r, 3000));
      }

      // --------------------------------------------------------------
      // 6. Click the correct camera by row index
      // --------------------------------------------------------------
      const clicked = await this.clickCameraByRow(page, targetRow, deviceId);
      if (!clicked) {
        console.warn(`[BARDI] Could not click camera at row ${targetRow} – capturing current view`);
      }

      await new Promise(r => setTimeout(r, 5000)); // Wait for stream to load

      // --------------------------------------------------------------
      // 7. GO TRUE FULLSCREEN (8th button) — THIS IS THE MAGIC
      // --------------------------------------------------------------
      console.log('[BARDI] Entering true fullscreen mode...');
      await page.evaluate(() => {
        const fullscreenBtn =
          document.querySelector('.videoTool_control__ybx2m > span:nth-child(8) .SVG_cs-wrapper__3Cu4D') ||
          document.querySelector('.videoTool_control__ybx2m span:nth-of-type(8) svg') ||
          document.querySelectorAll('.videoTool_control__ybx2m span')[7];

        if (fullscreenBtn && typeof fullscreenBtn.click === 'function') {
          fullscreenBtn.click();
        } else {
          // Fallback: press 'f' key (BARDI supports it)
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
        }
      });

      await new Promise(r => setTimeout(r, 1500));

      // --------------------------------------------------------------
      // 8. Hide cursor + toolbar completely
      // --------------------------------------------------------------
      await page.addStyleTag({
        content: `
          * { cursor: none !important; }
          .videoTool_control__ybx2m { 
            opacity: 0 !important; 
            transition: opacity 0.3s !important; 
          }
          .videoTool_control__ybx2m:hover { opacity: 0.8 !important; }
        `
      });

      await new Promise(r => setTimeout(r, 500));

      // --------------------------------------------------------------
      // 9. TAKE PERFECT FULLSCREEN SCREENSHOT
      // --------------------------------------------------------------
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 95,
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
        omitBackground: true,
      });

      console.log(`[BARDI] Screenshot captured: ${screenshotBuffer.length} bytes – PERFECT fullscreen`);

      await browser.close();
      browser = null;

      return {
        success: true,
        imageBuffer: Buffer.from(screenshotBuffer),
        contentType: 'image/jpeg',
        size: screenshotBuffer.length,
        panel: { row: targetRow, column: panelColumn || 1 },
      };

    } catch (error) {
      console.error('[BARDI] capturePanelScreenshot FAILED:', error.message);
      if (browser) await browser.close().catch(() => {});
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
  // async expandAllDevices(page) {
  //   try {
  //     const allDevicesSelectors = [
  //       '.ant-tree-switcher',
  //       '.ant-tree-switcher_open',
  //       '.anticon-caret-down',
  //       'span[aria-label="caret-down"]',
  //       '[class*="ant-tree-switcher"]',
  //       '[class*="caret-down"]'
  //     ];

  //     for (const selector of allDevicesSelectors) {
  //       try {
  //         const elements = await page.$$(selector);
          
  //         for (let i = 0; i < elements.length; i++) {
  //           const element = elements[i];
  //           const classes = await element.evaluate(el => el.className || '');
            
  //           const isAlreadyOpen = classes.includes('ant-tree-switcher_open');
  //           if (isAlreadyOpen) {
  //             console.log('✅ "All Devices" is already open');
  //             return true;
  //           }
            
  //           // Try to click to expand
  //           const needsClick = classes.includes('ant-tree-switcher') && !isAlreadyOpen;
  //           if (needsClick) {
  //             console.log(`✅ Clicking "All Devices" toggle: ${selector}[${i}]`);
  //             await element.click();
  //             await new Promise(resolve => setTimeout(resolve, 1000));
  //             return true;
  //           }
  //         }
  //       } catch (e) {
  //         // Continue
  //       }
  //     }
      
  //     console.log('⚠️ Could not find "All Devices" toggle');
  //     return false;
  //   } catch (error) {
  //     console.error('Error expanding All Devices:', error);
  //     return false;
  //   }
  // }

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
   * Click camera by its position (row) in the device list under "All Devices"
   * @param {Page} page 
   * @param {number} row 1-based row in the list
   * @param {string|null} deviceId optional exact device id
   * @returns {Promise<boolean>}
   */
  async clickCameraByRow(page, row, deviceId = null) {
    try {
      // Prefer exact deviceId if supplied
      if (deviceId) {
        const sel = `[data-device-id="${deviceId}"], [device-id="${deviceId}"], .device-${deviceId}`;
        const el = await page.$(sel);
        if (el) {
          console.log(`Clicking camera by deviceId ${deviceId}`);
          await el.click({ delay: 100 });
          return true;
        }
      }

      // Otherwise click by row order inside the tree
      const cameraNodes = await page.$$(
        '.ant-tree-treenode .deviceItem_box__3ZdcA' // the actual camera rows
      );

      console.log(`Found ${cameraNodes.length} camera entries in sidebar`);

      if (cameraNodes.length === 0) return false;

      const indexToClick = Math.min(row - 1, cameraNodes.length - 1); // 0-based, safe fallback
      const target = cameraNodes[indexToClick];

      const text = await target.evaluate(el => el.textContent.trim());
      console.log(`Clicking row ${row} (index ${indexToClick}): "${text}"`);

      await target.click({ delay: 150 });
      return true;
    } catch (err) {
      console.error('clickCameraByRow error:', err);
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

