/**
 * Bardi Login Test - Extract Session ID
 * 
 * This script tests login to BARDI system and extracts the session ID
 * for use in other automation scripts.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BardiLoginTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.credentials = {
      email: 'swakarsadigital@gmail.com',
      password: '8====D'
    };
  }

  async initializeBrowser() {
    console.log('🚀 Launching browser with stealth mode...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible to see what's happening
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport size
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Remove webdriver property
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // Override the plugins property to use a custom getter
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });
    
    // Override the languages property to use a custom getter
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
    
    // Override the permissions property to use a custom getter
    await this.page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      return window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    console.log('✅ Browser initialized with stealth mode');
  }

  async navigateToLogin() {
    console.log('🌐 Navigating to BARDI login page...');
    
    try {
      await this.page.goto('https://ipc.bardi.co.id/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page to fully load and any dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if there are any loading indicators and wait for them to disappear
      try {
        await this.page.waitForFunction(() => {
          const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], .loading, .spinner');
          return loadingElements.length === 0;
        }, { timeout: 10000 });
      } catch (e) {
        console.log('⏳ No loading indicators found or timeout reached');
      }
      
      const currentUrl = this.page.url();
      const pageTitle = await this.page.title();
      
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`📄 Page Title: ${pageTitle}`);
      
      // Check if we're on login page
      if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
        console.log('✅ Successfully navigated to login page');
        return true;
      } else {
        console.log('⚠️ Not on login page, checking for login form...');
        return await this.findLoginForm();
      }
    } catch (error) {
      console.error('❌ Error navigating to login page:', error.message);
      return false;
    }
  }

  async findLoginForm() {
    console.log('🔍 Looking for login form...');
    
    try {
      // First, look for "Switch to account and password login" button
      const switchLoginSelectors = [
        'button:has-text("Switch to account and password login")',
        'a:has-text("Switch to account and password login")',
        'span:has-text("Switch to account and password login")',
        'div:has-text("Switch to account and password login")',
        '[class*="switch"]:has-text("account")',
        '[class*="switch"]:has-text("password")',
        'button[title*="Switch"]',
        'a[title*="Switch"]'
      ];

      let switchButton = null;
      for (const selector of switchLoginSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            const text = await this.page.evaluate(el => el.textContent || '', element);
            if (text.toLowerCase().includes('switch') && 
                (text.toLowerCase().includes('account') || text.toLowerCase().includes('password'))) {
              switchButton = element;
              console.log(`✅ Found switch login button: "${text}"`);
              break;
            }
          }
          if (switchButton) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (switchButton) {
        console.log('🔄 Clicking "Switch to account and password login"...');
        await switchButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.takeScreenshot('02_after_switch_login.png');
      }

      // Now look for email/password fields
      const loginSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        'input[placeholder*="Email"]',
        '#email',
        '.email',
        '[class*="email"]',
        'input[type="text"]',
        'input[name="username"]',
        'input[name="user"]',
        'input[placeholder*="username"]',
        'input[placeholder*="Username"]'
      ];

      let emailField = null;
      
      for (const selector of loginSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            emailField = elements[0];
            console.log(`✅ Found email field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (emailField) {
        console.log('✅ Login form found');
        return true;
      } else {
        console.log('⚠️ Login form not found - might need manual intervention');
        console.log('💡 Please manually switch to account/password login and press ENTER...');
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        await this.takeScreenshot('02_after_manual_switch.png');
        return true; // Assume user handled it manually
      }
    } catch (error) {
      console.error('❌ Error finding login form:', error.message);
      return false;
    }
  }

  async performLogin() {
    console.log('🔐 Attempting to login...');
    console.log(`📧 Email: ${this.credentials.email}`);
    console.log(`🔑 Password: ${'*'.repeat(this.credentials.password.length)}`);
    
    try {
      // Find and fill email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        'input[placeholder*="Email"]',
        '#email',
        '.email',
        '[class*="email"]',
        'input[type="text"]'
      ];

      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            emailField = elements[0];
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (!emailField) {
        throw new Error('Email field not found');
      }

      // Clear and type email
      await emailField.click();
      await emailField.evaluate(el => el.value = '');
      await emailField.type(this.credentials.email);
      console.log('✅ Email entered');

      // Find and fill password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password"]',
        'input[placeholder*="Password"]',
        '#password',
        '.password',
        '[class*="password"]'
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            passwordField = elements[0];
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (!passwordField) {
        throw new Error('Password field not found');
      }

      // Clear and type password
      await passwordField.click();
      await passwordField.evaluate(el => el.value = '');
      await passwordField.type(this.credentials.password);
      console.log('✅ Password entered');

      // Find and click login button
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        '.login-button',
        '[class*="login"]',
        '[class*="submit"]'
      ];

      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            const text = await this.page.evaluate(el => el.textContent || '', element);
            if (text.toLowerCase().includes('login') || 
                text.toLowerCase().includes('sign in') ||
                text.toLowerCase().includes('submit')) {
              loginButton = element;
              break;
            }
          }
          if (loginButton) break;
        } catch (e) {
          // Continue
        }
      }

      if (!loginButton) {
        throw new Error('Login button not found');
      }

      console.log('🎯 Clicking login button...');
      await loginButton.click();
      
      // Wait for login to process
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('✅ Login attempt completed');
      return true;
    } catch (error) {
      console.error('❌ Error during login:', error.message);
      return false;
    }
  }

  async extractSessionData() {
    console.log('🍪 Extracting session data...');
    
    try {
      // Wait for page to load after login
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentUrl = this.page.url();
      const pageTitle = await this.page.title();
      
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`📄 Page Title: ${pageTitle}`);
      
      // Get all cookies
      const cookies = await this.page.cookies();
      console.log(`🍪 Found ${cookies.length} cookies`);
      
      // Look for session-related cookies
      const sessionCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('sid') ||
        cookie.name.toLowerCase().includes('token') ||
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('jwt')
      );
      
      console.log('🔍 Session-related cookies:');
      sessionCookies.forEach(cookie => {
        console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      });
      
      // Get localStorage
      const localStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          storage[key] = window.localStorage.getItem(key);
        }
        return storage;
      });
      
      console.log('💾 LocalStorage items:');
      Object.keys(localStorage).forEach(key => {
        console.log(`  - ${key}: ${localStorage[key].substring(0, 50)}...`);
      });
      
      // Get sessionStorage
      const sessionStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          storage[key] = window.sessionStorage.getItem(key);
        }
        return storage;
      });
      
      console.log('🗂️ SessionStorage items:');
      Object.keys(sessionStorage).forEach(key => {
        console.log(`  - ${key}: ${sessionStorage[key].substring(0, 50)}...`);
      });
      
      // Check if login was successful
      const isLoggedIn = !currentUrl.includes('login') && 
                        !pageTitle.toLowerCase().includes('login') &&
                        (sessionCookies.length > 0 || Object.keys(sessionStorage).length > 0);
      
      if (isLoggedIn) {
        console.log('✅ Login appears to be successful!');
        
        // Save session data to file
        const sessionData = {
          url: currentUrl,
          title: pageTitle,
          cookies: cookies,
          localStorage: localStorage,
          sessionStorage: sessionStorage,
          timestamp: new Date().toISOString(),
          credentials: {
            email: this.credentials.email,
            // Don't save password for security
          }
        };
        
        const sessionPath = path.join(__dirname, 'session.json');
        await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
        console.log(`💾 Session data saved to: ${sessionPath}`);
        
        return sessionData;
      } else {
        console.log('⚠️ Login may have failed - still on login page or no session data found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error extracting session data:', error.message);
      return null;
    }
  }

  async takeScreenshot(filename) {
    try {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });
      
      const screenshotPath = path.join(screenshotsDir, filename);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: false,
        type: 'png'
      });
      console.log(`📸 Screenshot saved: ${filename}`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${filename}:`, error.message);
      return null;
    }
  }

  async runLoginTest() {
    try {
      console.log('🎬 Starting BARDI Login Test');
      console.log('=============================');
      
      await this.initializeBrowser();
      await this.takeScreenshot('01_initial_page.png');
      
      const loginPageFound = await this.navigateToLogin();
      if (!loginPageFound) {
        console.log('❌ Could not find login page');
        return;
      }
      
      await this.takeScreenshot('02_login_page.png');
      
      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        console.log('❌ Login failed');
        return;
      }
      
      await this.takeScreenshot('03_after_login.png');
      
      const sessionData = await this.extractSessionData();
      
      if (sessionData) {
        console.log('\n✅ LOGIN TEST COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('📁 Check session.json for session data');
        console.log('📸 Check screenshots folder for images');
      } else {
        console.log('\n⚠️ LOGIN TEST COMPLETED WITH ISSUES');
        console.log('===================================');
        console.log('📸 Check screenshots folder for debugging');
      }
      
    } catch (error) {
      console.error('❌ Error during login test:', error.message);
      
      // Take error screenshot
      if (this.page) {
        await this.takeScreenshot('error_screenshot.png');
      }
    } finally {
      // Keep browser open for inspection
      console.log('\n⏳ Browser will stay open for inspection...');
      console.log('   Press Ctrl+C to close');
      await new Promise(() => {});
    }
  }
}

// Run the login test
async function main() {
  const loginTest = new BardiLoginTest();
  await loginTest.runLoginTest();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
