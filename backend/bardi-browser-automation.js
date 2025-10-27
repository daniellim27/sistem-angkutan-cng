/**
 * Bardi Browser Automation - Simple Version
 * 
 * This script opens a browser with your Bardi session already logged in
 * so you can manually take screenshots from the camera interface.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SimpleBardiBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionPath = path.join(__dirname, 'session.json');
  }

  /**
   * Load session data
   */
  async loadSession() {
    try {
      const sessionData = await fs.readFile(this.sessionPath, 'utf-8');
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('❌ Error loading session:', error.message);
      throw new Error('Failed to load session.json');
    }
  }

  /**
   * Initialize browser
   */
  async start() {
    console.log('🚀 Starting Bardi Browser Automation');
    console.log('====================================');
    
    try {
      // Launch browser
      console.log('🌐 Launching browser...');
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Load session and login
      await this.login();
      
      // Keep browser open for manual use
      await this.keepOpen();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  /**
   * Login with session cookies
   */
  async login() {
    console.log('🍪 Logging in with session cookies...');
    
    const session = await this.loadSession();
    
    // Navigate to Bardi
    await this.page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Set cookies
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
    
    // Reload to apply cookies
    await this.page.reload({ waitUntil: 'networkidle2' });
    
    console.log('✅ Login complete!');
    console.log('📹 You should now see your camera interface');
    console.log('📸 Click the camera icon in the bottom bar to take screenshots');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Keep browser open and provide instructions
   */
  async keepOpen() {
    console.log('\n🎮 MANUAL SCREENSHOT MODE');
    console.log('==========================');
    console.log('✅ Browser is now open with your Bardi session');
    console.log('📹 Navigate to your camera interface');
    console.log('📸 Click the camera icon in the bottom bar to take screenshots');
    console.log('🔄 The browser will stay open until you close it manually');
    console.log('❌ Press Ctrl+C in this terminal to close the browser');
    console.log('==========================\n');

    // Keep the process alive
    await new Promise(() => {});
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Closing browser...');
  if (global.bardiBrowser) {
    await global.bardiBrowser.close();
  }
  process.exit(0);
});

// Start the automation
async function main() {
  const automation = new SimpleBardiBrowser();
  global.bardiBrowser = automation; // Store reference for cleanup
  
  await automation.start();
}

main().catch(console.error);
