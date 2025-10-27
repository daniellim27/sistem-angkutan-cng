const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

class BardiFinalScreenshot {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.downloadsDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
    
    // Ensure screenshots directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async init() {
    console.log('🚀 Initializing Bardi Final Screenshot...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Set up network monitoring
    this.setupNetworkMonitoring();
    
    // Set up download monitoring
    this.setupDownloadMonitoring();
  }

  setupNetworkMonitoring() {
    this.page.on('request', request => {
      const url = request.url();
      if (url.includes('airtake-public-data.s3') || url.includes('screenshot') || url.includes('capture')) {
        console.log(`📤 SCREENSHOT API: ${request.method()} ${url}`);
      }
    });

    this.page.on('response', response => {
      const url = response.url();
      if (url.includes('airtake-public-data.s3') || url.includes('screenshot') || url.includes('capture')) {
        console.log(`📥 SCREENSHOT RESPONSE: ${response.status()} ${url}`);
        console.log(`   Content-Type: ${response.headers()['content-type']}, Length: ${response.headers()['content-length'] || 'unknown'}`);
      }
    });
  }

  setupDownloadMonitoring() {
    // Monitor for downloads
    this.page._client.on('Page.downloadWillBegin', (event) => {
      console.log(`📥 DOWNLOAD STARTED: ${event.suggestedFilename}`);
    });

    this.page._client.on('Page.downloadProgress', (event) => {
      if (event.state === 'completed') {
        console.log(`✅ DOWNLOAD COMPLETED: ${event.guid}`);
      }
    });
  }

  async loadSession() {
    console.log('🔐 Loading session data...');
    
    try {
      const sessionPath = path.join(__dirname, 'session.json');
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      
      // Set cookies before navigation
      const cookies = Object.entries(sessionData.cookies).map(([name, value]) => ({
        name,
        value,
        domain: 'ipc.bardi.co.id',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      }));

      await this.page.setCookie(...cookies);
      console.log(`✅ Set ${cookies.length} cookies`);
      
      return sessionData;
    } catch (error) {
      console.error('❌ Failed to load session:', error.message);
      throw error;
    }
  }

  async takeScreenshot(filename) {
    try {
      const screenshotPath = path.join(this.screenshotDir, filename);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${filename}:`, error.message);
    }
  }

  async navigateToBardi() {
    console.log('🌐 Navigating to Bardi...');
    await this.page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await this.takeScreenshot('01_bardi_homepage.png');
    
    // Check if we're logged in
    const currentUrl = this.page.url();
    const pageTitle = await this.page.title();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page Title: ${pageTitle}`);
    
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Still on login page, session might be invalid');
      return false;
    }
    
    console.log('✅ Successfully logged in with session');
    return true;
  }

  async findAndClickAllDevicesToggle() {
    console.log('🔍 Looking for "All Devices" toggle...');
    await this.page.waitForLoadState?.('networkidle') || await new Promise(resolve => setTimeout(resolve, 2000));

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
        const elements = await this.page.$$(selector);
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = await element.evaluate(el => el.textContent || '');
          const classes = await element.evaluate(el => el.className || '');
          
          console.log(`   [${i}] Text: "${text}" | Classes: "${classes}"`);
          
          const isAlreadyOpen = classes.includes('ant-tree-switcher_open');
          const needsClick = !isAlreadyOpen && (
            text.toLowerCase().includes('all devices') ||
            text.toLowerCase().includes('devices') ||
            classes.toLowerCase().includes('device') ||
            classes.toLowerCase().includes('toggle') ||
            classes.toLowerCase().includes('expand') ||
            classes.includes('ant-tree-switcher')
          );

          if (needsClick) {
            console.log(`🎯 Clicking "All Devices" toggle: ${selector}[${i}]`);
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.takeScreenshot('02_after_all_devices_click.png');
            return true;
          } else if (isAlreadyOpen) {
            console.log(`✅ "All Devices" is already open: ${selector}[${i}]`);
            await this.takeScreenshot('02_all_devices_already_open.png');
            return true;
          }
        }
      } catch (e) {
        console.log(`   Error with selector ${selector}: ${e.message}`);
      }
    }
    
    console.log('❌ Could not find "All Devices" toggle');
    return false;
  }

  async findAndClickCamera() {
    console.log('📹 Looking for camera device...');
    await this.page.waitForLoadState?.('networkidle') || await new Promise(resolve => setTimeout(resolve, 2000));

    const cameraSelectors = [
      '.ant-tree-treenode-selected',
      '.deviceItem_box__3ZdcA',
      'span:has-text("BARDI Smart IP Camera PTZ Indoor Syno")',
      'div:has-text("BARDI Smart IP Camera PTZ Indoor Syno")',
      '[class*="deviceItem"]',
      '[class*="device_online"]'
    ];

    for (const selector of cameraSelectors) {
      try {
        const elements = await this.page.$$(selector);
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = await element.evaluate(el => el.textContent || '');
          const classes = await element.evaluate(el => el.className || '');
          
          console.log(`   [${i}] Text: "${text}" | Classes: "${classes}"`);
          
          if (text.includes('BARDI Smart IP Camera') || classes.includes('device_online')) {
            console.log(`🎯 Clicking camera device: ${selector}[${i}]`);
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.takeScreenshot('03_after_camera_click.png');
            return true;
          }
        }
      } catch (e) {
        console.log(`   Error with selector ${selector}: ${e.message}`);
      }
    }
    
    console.log('❌ Could not find camera device');
    return false;
  }

  async findAndClickScreenshotButton() {
    console.log('📸 Looking for screenshot button...');
    await this.page.waitForLoadState?.('networkidle') || await new Promise(resolve => setTimeout(resolve, 2000));

    // Target the specific screenshot button with the new SVG path
    const screenshotSelectors = [
      'svg path[d*="M643.989333 85.333333a85.333333 85.333333 0 0 1 80.426667 56.789334"]', // New specific path
      '.SVG_cs-wrapper__3Cu4D.SVG_content-right__3SFwG', // Specific wrapper class
      'div[class*="SVG_cs-wrapper"] div[class*="SVG_content-right"]', // Wrapper classes
      'svg[viewBox="0 0 1024 1024"][width="18"][height="18"]', // SVG attributes
      'path[fill="#E1E1E1"]' // Fill color
    ];

    for (const selector of screenshotSelectors) {
      try {
        const elements = await this.page.$$(selector);
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = await element.evaluate(el => el.textContent || '');
          const classes = await element.evaluate(el => el.className || '');
          
          console.log(`   [${i}] Text: "${text}" | Classes: "${classes}"`);
          
          // Check if this is the screenshot button
          const isScreenshotButton = (
            selector.includes('M643.989333 85.333333') || // Specific path
            classes.includes('SVG_content-right') || // Right content area
            (selector.includes('svg') && classes.includes('camera'))
          );

          if (isScreenshotButton) {
            console.log(`🎯 Clicking screenshot button: ${selector}[${i}]`);
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot('04_after_screenshot_click.png');
            return true;
          }
        }
      } catch (e) {
        console.log(`   Error with selector ${selector}: ${e.message}`);
      }
    }
    
    console.log('❌ Could not find screenshot button');
    return false;
  }

  async downloadScreenshotFromS3(s3Url) {
    console.log(`📥 Downloading screenshot from S3: ${s3Url}`);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(path.join(this.downloadsDir, `bardi_screenshot_${Date.now()}.jpg`));
      
      https.get(s3Url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Screenshot downloaded successfully`);
            resolve(true);
          });
        } else {
          console.log(`❌ Failed to download: ${response.statusCode}`);
          resolve(false);
        }
      }).on('error', (err) => {
        console.error(`❌ Download error: ${err.message}`);
        resolve(false);
      });
    });
  }

  async run() {
    try {
      await this.init();
      
      // Load session and navigate
      await this.loadSession();
      const isLoggedIn = await this.navigateToBardi();
      
      if (!isLoggedIn) {
        console.log('❌ Failed to log in, exiting...');
        return;
      }

      // Navigate to camera interface
      console.log('📹 Navigating to camera interface...');
      await this.page.goto('https://ipc.bardi.co.id/playback', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      await this.takeScreenshot('01_camera_interface.png');

      // Find and click "All Devices" toggle
      const allDevicesClicked = await this.findAndClickAllDevicesToggle();
      if (!allDevicesClicked) {
        console.log('⚠️ Could not find "All Devices" toggle, continuing...');
      }

      // Find and click camera device
      const cameraClicked = await this.findAndClickCamera();
      if (!cameraClicked) {
        console.log('⚠️ Could not find camera device, continuing...');
      }

      // Find and click screenshot button
      const screenshotClicked = await this.findAndClickScreenshotButton();
      if (!screenshotClicked) {
        console.log('❌ Could not find screenshot button');
        return;
      }

      // Wait for any S3 download to complete
      console.log('⏳ Waiting for screenshot download...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if any S3 URLs were captured
      const s3Urls = this.capturedS3Urls || [];
      if (s3Urls.length > 0) {
        console.log(`📥 Found ${s3Urls.length} S3 URLs, downloading...`);
        for (const url of s3Urls) {
          await this.downloadScreenshotFromS3(url);
        }
      } else {
        console.log('💡 No S3 URLs captured, check Downloads folder for any automatic downloads');
      }

      console.log('✅ Screenshot process completed!');
      console.log('📁 Check these locations:');
      console.log(`   - Automation screenshots: ${this.screenshotDir}`);
      console.log(`   - Downloaded screenshots: ${this.downloadsDir}`);

    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      if (this.browser) {
        console.log('⏳ Browser will stay open for 30 seconds for inspection...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        await this.browser.close();
      }
    }
  }
}

// Run the automation
const automation = new BardiFinalScreenshot();
automation.run().catch(console.error);
