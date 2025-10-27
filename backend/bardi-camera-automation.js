/**
 * Bardi Camera Automation - Follows the exact user flow
 * 
 * Flow:
 * 1. Login to dashboard ✅
 * 2. Open "All Devices" toggle
 * 3. Click the camera
 * 4. CCTV feed shows up
 * 5. Take screenshot
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BardiCameraAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotsDir = path.join(__dirname, 'screenshots');
  }

  async createScreenshotsDir() {
    try {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      console.log('✅ Screenshots directory ready');
    } catch (error) {
      console.error('Error creating screenshots directory:', error);
    }
  }

  async initializeBrowser() {
    console.log('🚀 Launching browser in headless mode...');
    
    this.browser = await puppeteer.launch({
      headless: true,  // Run without visual interface
      defaultViewport: {
        width: 1920,  // Standard Full HD width
        height: 1080  // Standard Full HD height
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport size (controls the screenshot dimensions)
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Browser initialized in headless mode with 1920x1080 viewport');
  }

  async loginWithSession() {
    console.log('🍪 Logging in with session cookies...');
    
    try {
      const sessionPath = path.join(__dirname, 'session.json');
      const sessionData = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(sessionData);
      
      // Set cookies BEFORE navigating
      const cookies = Object.entries(session.cookies).map(([name, value]) => ({
        name,
        value,
        domain: 'ipc.bardi.co.id',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'None'
      }));

      await this.page.setCookie(...cookies);
      
      // Navigate to Bardi
      await this.page.goto('https://ipc.bardi.co.id/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentUrl = this.page.url();
      const pageTitle = await this.page.title();
      
      if (!currentUrl.includes('login') && !pageTitle.toLowerCase().includes('login')) {
        console.log('✅ Successfully logged in!');
        return true;
      } else {
        console.log('⚠️ Still on login page - will wait for manual login');
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error.message);
      return false;
    }
  }

  async takeScreenshot(filename) {
    try {
      const screenshotPath = path.join(this.screenshotsDir, filename);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: false,  // Only capture visible viewport (1920x1080)
        type: 'png'
      });
      console.log(`📸 Screenshot saved: ${filename} (1920x1080)`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${filename}:`, error.message);
      return null;
    }
  }

  async takeCameraFeedScreenshot(filename) {
    try {
      console.log('🎯 Taking targeted camera feed screenshot...');
      
      // Wait longer for camera feed to load and render
      console.log('⏳ Waiting for camera feed to load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Look for the camera feed container/panel - more specific selectors
      const cameraFeedSelectors = [
        // Look for video elements first (actual camera feed)
        'video',
        'canvas',
        'iframe[src*="camera"]',
        'iframe[src*="video"]',
        'iframe[src*="stream"]',
        // Look for the main content area (right side, not sidebar)
        '[class*="main-content"]',
        '[class*="content-main"]',
        '[class*="dashboard"]',
        '[class*="camera-dashboard"]',
        '[class*="video-container"]',
        '[class*="feed-container"]',
        // Look for grid panels specifically
        '[class*="grid"] > div',
        '[class*="panel"]',
        '[class*="camera-panel"]',
        '[class*="video-panel"]',
        // Look for elements with blue border (active panel)
        'div[style*="border: 1px solid"]',
        'div[style*="border: 2px solid"]',
        // Look for larger containers that might hold the video
        'div[style*="background"]',
        'div[class*="container"]'
      ];

      let cameraFeedElement = null;
      let largestElement = null;
      let largestSize = 0;
      
      for (const selector of cameraFeedSelectors) {
        try {
          const elements = await this.page.$$(selector);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = await this.page.evaluate(el => el.textContent || '', element);
            const classes = await this.page.evaluate(el => el.className, element);
            const boundingBox = await this.page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0
              };
            }, element);
            
            console.log(`  Element ${i}: classes="${classes}", size=${boundingBox.width}x${boundingBox.height}, visible=${boundingBox.visible}`);
            
            // Skip if not visible or too small
            if (!boundingBox.visible || boundingBox.width < 300 || boundingBox.height < 200) {
              continue;
            }
            
            // Look for video elements (highest priority)
            if (selector === 'video' || selector === 'canvas') {
              cameraFeedElement = element;
              console.log(`🎯 Found video element: ${selector}[${i}] (${boundingBox.width}x${boundingBox.height})`);
              break;
            }
            
            // Look for elements that contain video or camera-related content
            const hasVideoContent = (
              text.includes('BARDI') && text.includes('2025') || // Timestamp pattern
              classes.toLowerCase().includes('video') ||
              classes.toLowerCase().includes('feed') ||
              classes.toLowerCase().includes('camera') ||
              classes.toLowerCase().includes('stream') ||
              boundingBox.width > 400 && boundingBox.height > 300 // Large enough for video
            );
            
            if (hasVideoContent) {
              cameraFeedElement = element;
              console.log(`🎯 Found camera feed container: ${selector}[${i}] (${boundingBox.width}x${boundingBox.height})`);
              break;
            }
            
            // Track the largest element as fallback
            const size = boundingBox.width * boundingBox.height;
            if (size > largestSize && boundingBox.width > 400 && boundingBox.height > 300) {
              largestElement = element;
              largestSize = size;
            }
          }
          
          if (cameraFeedElement) break;
        } catch (e) {
          console.log(`  Error with selector ${selector}:`, e.message);
        }
      }

      // Use largest element if no specific camera feed found
      if (!cameraFeedElement && largestElement) {
        cameraFeedElement = largestElement;
        console.log(`🎯 Using largest element as fallback (${largestSize} pixels)`);
      }

      if (cameraFeedElement) {
        const screenshotPath = path.join(this.screenshotsDir, filename);
        await cameraFeedElement.screenshot({ 
          path: screenshotPath,
          type: 'png'
        });
        console.log(`📸 Camera feed screenshot saved: ${filename}`);
        return screenshotPath;
      } else {
        console.log('⚠️ Camera feed panel not found, taking main content area screenshot instead');
        // Try to screenshot just the main content area (right side, excluding sidebar)
        try {
          const screenshotPath = path.join(this.screenshotsDir, filename);
          await this.page.screenshot({ 
            path: screenshotPath,
            clip: {
              x: 300, // Start after sidebar (approximately)
              y: 100, // Start after header
              width: 1200, // Main content width
              height: 800  // Main content height
            },
            type: 'png'
          });
          console.log(`📸 Main content area screenshot saved: ${filename}`);
          return screenshotPath;
        } catch (e) {
          console.log('⚠️ Clipped screenshot failed, taking full screenshot');
          return await this.takeScreenshot(filename);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to take camera feed screenshot ${filename}:`, error.message);
      return await this.takeScreenshot(filename); // Fallback to full screenshot
    }
  }

  async findAndClickAllDevices() {
    console.log('🔍 Looking for "All Devices" toggle...');
    
    try {
      // Wait for the page to be ready
      await this.page.waitForLoadState?.('networkidle') || await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for various possible selectors for "All Devices" toggle
      const allDevicesSelectors = [
        // Based on actual HTML structure
        '.ant-tree-switcher',
        '.ant-tree-switcher_open',
        '.anticon-caret-down',
        'span[aria-label="caret-down"]',
        '[class*="ant-tree-switcher"]',
        '[class*="caret-down"]',
        // Original selectors
        '[data-testid*="all-devices"]',
        '[class*="all-devices"]',
        '[class*="allDevices"]',
        'button:has-text("All Devices")',
        'div:has-text("All Devices")',
        'span:has-text("All Devices")',
        '[title*="All Devices"]',
        '[aria-label*="All Devices"]',
        '.device-list-toggle',
        '.toggle-all-devices',
        '[class*="device-toggle"]',
        '[class*="expand"]',
        '[class*="collapse"]'
      ];

      for (const selector of allDevicesSelectors) {
        try {
          const elements = await this.page.$$(selector);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = await this.page.evaluate(el => el.textContent || el.title || el.alt || '', element);
            const classes = await this.page.evaluate(el => el.className, element);
            
            console.log(`  Element ${i}: text="${text}", classes="${classes}"`);
            
            // Check if "All Devices" is already open or needs to be clicked
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
              
              // Take screenshot after clicking
              await this.takeScreenshot('02_after_all_devices_click.png');
              return true;
            } else if (isAlreadyOpen) {
              console.log(`✅ "All Devices" is already open: ${selector}[${i}]`);
              await this.takeScreenshot('02_all_devices_already_open.png');
              return true;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log('⚠️ "All Devices" toggle not found automatically');
      return false;
    } catch (error) {
      console.error('❌ Error looking for "All Devices" toggle:', error.message);
      return false;
    }
  }

  async findAndClickCamera() {
    console.log('📹 Looking for camera device...');
    
    try {
      // Look for camera-related elements
      const cameraSelectors = [
        // Based on actual HTML structure
        '.ant-tree-treenode-selected',
        '.deviceItem_box__3ZdcA',
        'span:has-text("BARDI Smart IP Camera PTZ Indoor Syno")',
        'div:has-text("BARDI Smart IP Camera PTZ Indoor Syno")',
        '[class*="deviceItem"]',
        '[class*="device_online"]',
        // Original selectors
        '[class*="camera"]',
        '[class*="device"]',
        '[data-testid*="camera"]',
        '[data-testid*="device"]',
        'button:has-text("Camera")',
        'div:has-text("Camera")',
        '[title*="Camera"]',
        '[title*="PTZ"]',
        '[class*="ptz"]',
        '.device-item',
        '.camera-item'
      ];

      for (const selector of cameraSelectors) {
        try {
          const elements = await this.page.$$(selector);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = await this.page.evaluate(el => el.textContent || el.title || el.alt || '', element);
            const classes = await this.page.evaluate(el => el.className, element);
            
            console.log(`  Element ${i}: text="${text}", classes="${classes}"`);
            
            // If it looks like a camera device, click it
            if (text.toLowerCase().includes('camera') || 
                text.toLowerCase().includes('ptz') ||
                text.toLowerCase().includes('bardi') ||
                classes.toLowerCase().includes('camera') ||
                classes.toLowerCase().includes('device')) {
              
              console.log(`🎯 Clicking camera device: ${selector}[${i}]`);
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Take screenshot after clicking camera
              await this.takeScreenshot('03_after_camera_click.png');
              return true;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log('⚠️ Camera device not found automatically');
      return false;
    } catch (error) {
      console.error('❌ Error looking for camera device:', error.message);
      return false;
    }
  }

  async findAndClickScreenshotButton() {
    console.log('📸 Looking for screenshot/camera button...');
    
    try {
      // Look for screenshot button in bottom bar (based on the actual interface)
      const screenshotSelectors = [
        // Based on the HTML you provided - the actual screenshot button
        '.SVG_cs-wrapper__3Cu4D',
        '.SVG_content-right__3SFwG',
        'svg[viewBox="0 0 1024 1024"]',
        'svg[width="18"][height="18"]',
        'path[fill="#E1E1E1"]',
        // Look for SVG camera icons (the path you provided looks like a camera icon)
        'svg path[d*="M618.666667 128c123.221333"]',
        'svg path[d*="camera"]',
        // Look for camera icon in the control bar below video feed
        '[class*="camera-icon"]',
        '[class*="capture-icon"]',
        '[class*="screenshot-icon"]',
        // Look for any button with camera-related icons
        'button svg[class*="camera"]',
        'button svg[class*="capture"]',
        'button svg[class*="photo"]',
        'button svg[class*="image"]',
        // Look for buttons in control areas
        '[class*="control"] button',
        '[class*="toolbar"] button',
        '[class*="bottom-bar"] button',
        '[class*="panel"] button',
        // Look for camera-related classes
        '[class*="camera"]',
        '[class*="screenshot"]',
        '[class*="capture"]',
        // Look for buttons with specific titles or attributes
        'button[title*="camera"]',
        'button[title*="screenshot"]',
        'button[title*="capture"]',
        'button[title*="photo"]',
        'button[title*="image"]',
        'button[aria-label*="camera"]',
        'button[aria-label*="screenshot"]',
        'button[aria-label*="capture"]',
        // Look for SVG icons that might be camera icons
        'svg[class*="camera"]',
        'svg[class*="capture"]',
        'svg[class*="photo"]',
        'svg[class*="image"]',
        // Look for any clickable elements with camera-related content
        '[role="button"][class*="camera"]',
        '[role="button"][class*="capture"]',
        '[role="button"][class*="screenshot"]'
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
            
            // Check if this looks like a screenshot/camera button
            const isCameraButton = (
              text.toLowerCase().includes('camera') || 
              text.toLowerCase().includes('screenshot') ||
              text.toLowerCase().includes('capture') ||
              text.toLowerCase().includes('photo') ||
              text.toLowerCase().includes('image') ||
              classes.toLowerCase().includes('camera') ||
              classes.toLowerCase().includes('screenshot') ||
              classes.toLowerCase().includes('capture') ||
              classes.toLowerCase().includes('photo') ||
              classes.toLowerCase().includes('image') ||
              // Check for common camera icon patterns
              (selector.includes('svg') && classes.includes('camera')) ||
              (selector.includes('button') && (classes.includes('camera') || classes.includes('capture')))
            );
            
            // Special logic for SVG camera buttons - look for the camera icon path
            const isCameraIconButton = (
              selector.includes('svg path[d*="M618.666667 128c123.221333"]') ||
              (classes.includes('SVG_content-bottom') && !text.includes('Select device'))
            );
            
            if (isCameraButton || isCameraIconButton) {
              console.log(`🎯 Clicking screenshot button: ${selector}[${i}]`);
              console.log(`  Text: "${text}", Classes: "${classes}"`);
              
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Take screenshot after clicking
              await this.takeScreenshot('04_after_screenshot_click.png');
              return true;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log('⚠️ Screenshot button not found automatically');
      return false;
    } catch (error) {
      console.error('❌ Error looking for screenshot button:', error.message);
      return false;
    }
  }

  async runAutomation() {
    try {
      console.log('🎬 Starting Bardi Camera Automation');
      console.log('===================================');
      
      // Setup
      await this.createScreenshotsDir();
      await this.initializeBrowser();
      
      // Login
      const loginSuccess = await this.loginWithSession();
      await this.takeScreenshot('01_after_login.png');
      
      if (!loginSuccess) {
        console.log('\n🔐 MANUAL LOGIN REQUIRED');
        console.log('========================');
        console.log('Please log in manually, then press ENTER to continue...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        await this.takeScreenshot('01_after_manual_login.png');
      }
      
      console.log('\n🎯 AUTOMATION PHASE');
      console.log('==================');
      
      // Step 1: Open "All Devices" toggle
      console.log('\n📋 Step 1: Opening "All Devices" toggle...');
      const allDevicesClicked = await this.findAndClickAllDevices();
      
      if (!allDevicesClicked) {
        console.log('⚠️ Could not find "All Devices" toggle automatically');
        console.log('💡 Please manually open "All Devices" and press ENTER...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        await this.takeScreenshot('02_after_manual_all_devices.png');
      }
      
      // Step 2: Click camera device
      console.log('\n📋 Step 2: Clicking camera device...');
      const cameraClicked = await this.findAndClickCamera();
      
      if (!cameraClicked) {
        console.log('⚠️ Could not find camera device automatically');
        console.log('💡 Please manually click your camera device and press ENTER...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        await this.takeScreenshot('03_after_manual_camera_click.png');
      }
      
      // Step 3: Take camera feed screenshot
      console.log('\n📋 Step 3: Taking camera feed screenshot...');
      const screenshotClicked = await this.findAndClickScreenshotButton();
      
      if (!screenshotClicked) {
        console.log('⚠️ Could not find screenshot button automatically');
        console.log('💡 Please manually click the camera/screenshot button and press ENTER...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }
      
      // Take targeted camera feed screenshot (this is the main goal)
      console.log('\n🎯 Taking targeted camera feed screenshot...');
      await this.takeCameraFeedScreenshot('05_camera_feed_only.png');
      
      console.log('\n✅ AUTOMATION COMPLETED!');
      console.log('========================');
      console.log('📁 Check the screenshots folder for captured images');
      
    } catch (error) {
      console.error('❌ Error during automation:', error.message);
      
      // Take error screenshot
      if (this.page) {
        await this.takeScreenshot('error_screenshot.png');
      }
    } finally {
      // Close browser automatically in headless mode
      if (this.browser) {
        await this.browser.close();
        console.log('🔒 Browser closed automatically');
      }
    }
  }
}

// Run the automation
async function main() {
  const automation = new BardiCameraAutomation();
  await automation.runAutomation();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
