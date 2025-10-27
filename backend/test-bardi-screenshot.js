/**
 * Bardi Screenshot Automation Script
 * 
 * This script uses Puppeteer to:
 * 1. Open Bardi Smart Home website
 * 2. Login using session cookies
 * 3. Navigate to camera interface
 * 4. Take screenshots automatically
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BardiScreenshotService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionPath = path.join(__dirname, 'session.json');
    this.screenshotsDir = path.join(__dirname, 'screenshots');
  }

  /**
   * Load session data from session.json
   */
  async loadSession() {
    try {
      const sessionData = await fs.readFile(this.sessionPath, 'utf-8');
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Error loading session:', error.message);
      throw new Error('Failed to load session file. Please ensure session.json exists.');
    }
  }

  /**
   * Create screenshots directory if it doesn't exist
   */
  async createScreenshotsDir() {
    try {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      console.log('✅ Screenshots directory ready');
    } catch (error) {
      console.error('Error creating screenshots directory:', error);
    }
  }

  /**
   * Initialize browser and page
   */
  async initializeBrowser() {
    console.log('🚀 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Browser initialized');
  }

  /**
   * Navigate to Bardi website and inject session cookies
   */
  async loginWithSession() {
    console.log('🌐 Navigating to Bardi website...');
    
    const session = await this.loadSession();
    
    // Navigate to Bardi website
    await this.page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Inject session cookies
    console.log('🍪 Injecting session cookies...');
    const cookies = Object.entries(session.cookies).map(([name, value]) => ({
      name,
      value,
      domain: '.bardi.co.id',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'None'
    }));

    await this.page.setCookie(...cookies);
    
    // Reload page to apply cookies
    await this.page.reload({ waitUntil: 'networkidle2' });
    
    console.log('✅ Session cookies injected');
    
    // Wait a bit for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Check if login was successful
   */
  async checkLoginStatus() {
    try {
      // Look for elements that indicate successful login
      await this.page.waitForSelector('[data-testid="user-menu"], .user-avatar, .profile-icon, [class*="user"], [class*="profile"]', { 
        timeout: 10000 
      });
      console.log('✅ Login successful - user interface detected');
      return true;
    } catch (error) {
      console.log('⚠️ Login status unclear - proceeding anyway');
      return false;
    }
  }

  /**
   * Navigate to camera interface
   */
  async navigateToCameraInterface() {
    console.log('📹 Navigating to camera interface...');
    
    try {
      // Look for camera-related elements or navigation
      await this.page.waitForSelector('.camera-feed, [class*="camera"], [class*="device"], .device-list', { 
        timeout: 15000 
      });
      
      // Take a screenshot of the current page
      await this.takeScreenshot('01_camera_interface.png');
      
      console.log('✅ Camera interface loaded');
      return true;
    } catch (error) {
      console.log('⚠️ Camera interface not automatically detected - taking screenshot anyway');
      await this.takeScreenshot('01_current_page.png');
      return false;
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(filename) {
    try {
      const screenshotPath = path.join(this.screenshotsDir, filename);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        type: 'png'
      });
      console.log(`📸 Screenshot saved: ${filename}`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Look for screenshot/camera controls and simulate clicking them
   */
  async findAndClickScreenshotButton() {
    console.log('🔍 Looking for screenshot button...');
    
    try {
      // Look for various possible screenshot button selectors
      const screenshotSelectors = [
        '[class*="camera"]', // Camera icon
        '[class*="screenshot"]', // Screenshot button
        '[class*="capture"]', // Capture button
        'button[title*="camera"]', // Button with camera in title
        'button[title*="screenshot"]', // Button with screenshot in title
        '.camera-icon', // Camera icon class
        'svg[class*="camera"]', // SVG camera icon
        '[data-testid*="camera"]', // Camera test id
      ];

      for (const selector of screenshotSelectors) {
        try {
          const elements = await this.page.$$(selector);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = await this.page.evaluate(el => el.textContent || el.title || el.alt || '', element);
            const classes = await this.page.evaluate(el => el.className, element);
            
            console.log(`  Element ${i}: text="${text}", classes="${classes}"`);
            
            // If it looks like a camera/screenshot button, click it
            if (text.toLowerCase().includes('camera') || 
                text.toLowerCase().includes('screenshot') ||
                classes.toLowerCase().includes('camera') ||
                classes.toLowerCase().includes('screenshot')) {
              
              console.log(`🎯 Clicking potential screenshot button: ${selector}[${i}]`);
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for any modal or action
              
              // Take screenshot after clicking
              await this.takeScreenshot(`02_after_click_${i}.png`);
              return true;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log('⚠️ No obvious screenshot button found');
      return false;
    } catch (error) {
      console.error('❌ Error looking for screenshot button:', error.message);
      return false;
    }
  }

  /**
   * Wait for user interaction (manual mode)
   */
  async waitForUserInteraction() {
    console.log('\n🎮 MANUAL MODE ACTIVATED');
    console.log('=====================================');
    console.log('The browser is now open and ready.');
    console.log('Please manually:');
    console.log('1. Navigate to your camera interface');
    console.log('2. Click the camera/screenshot button');
    console.log('3. Press ENTER in this console when done');
    console.log('=====================================\n');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    // Take final screenshot
    await this.takeScreenshot('03_final_screenshot.png');
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      console.log('🎬 Starting Bardi Screenshot Automation');
      console.log('========================================');
      
      // Setup
      await this.createScreenshotsDir();
      await this.initializeBrowser();
      
      // Login
      await this.loginWithSession();
      await this.takeScreenshot('00_after_login.png');
      
      // Check login status
      const loginSuccess = await this.checkLoginStatus();
      
      // Navigate to camera interface
      const cameraLoaded = await this.navigateToCameraInterface();
      
      // Try to find and click screenshot button automatically
      const buttonClicked = await this.findAndClickScreenshotButton();
      
      if (!buttonClicked) {
        // If automatic screenshot button clicking failed, wait for manual interaction
        await this.waitForUserInteraction();
      }
      
      console.log('\n✅ Screenshot automation completed!');
      console.log('📁 Check the screenshots folder for captured images.');
      
    } catch (error) {
      console.error('❌ Error during automation:', error.message);
      
      // Take error screenshot
      if (this.page) {
        await this.takeScreenshot('error_screenshot.png');
      }
    } finally {
      // Cleanup
      if (this.browser) {
        console.log('\n⏳ Browser will close in 5 seconds...');
        console.log('   (Press Ctrl+C to close immediately)');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.browser.close();
      }
    }
  }
}

// Run the automation
async function main() {
  const automation = new BardiScreenshotService();
  await automation.run();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

main().catch(console.error);
