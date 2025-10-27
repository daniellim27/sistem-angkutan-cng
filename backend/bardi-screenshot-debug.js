/**
 * Bardi Screenshot Debug - Find the real screenshot functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BardiScreenshotDebug {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initializeBrowser() {
    console.log('🚀 Launching browser for debugging...');
    
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
    
    // Enable request interception to monitor network calls
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
      request.continue();
    });

    this.page.on('response', (response) => {
      if (response.url().includes('screenshot') || 
          response.url().includes('capture') || 
          response.url().includes('snapshot') ||
          response.url().includes('image') ||
          response.headers()['content-type']?.includes('image')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        console.log(`   Content-Type: ${response.headers()['content-type']}`);
        console.log(`   Content-Length: ${response.headers()['content-length']}`);
      }
    });
    
    console.log('✅ Browser initialized with network monitoring');
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
      console.log('✅ Successfully logged in!');
      return true;
    } catch (error) {
      console.error('Error during login:', error.message);
      return false;
    }
  }

  async navigateToCamera() {
    console.log('📹 Navigating to camera interface...');
    
    // Click "All Devices" toggle
    try {
      await this.page.click('.ant-tree-switcher');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Opened "All Devices"');
    } catch (error) {
      console.log('⚠️ Could not click "All Devices" toggle');
    }

    // Click camera device
    try {
      await this.page.click('.deviceItem_box__3ZdcA');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Clicked camera device');
    } catch (error) {
      console.log('⚠️ Could not click camera device');
    }
  }

  async debugScreenshotButton() {
    console.log('🔍 Debugging screenshot button...');
    
    // Get all buttons and clickable elements
    const allButtons = await this.page.$$('button, [role="button"], [onclick], [class*="click"]');
    console.log(`Found ${allButtons.length} clickable elements`);
    
    // Look for elements that might be screenshot buttons
    const potentialScreenshotElements = await this.page.evaluate(() => {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((el, index) => {
        const text = el.textContent?.toLowerCase() || '';
        const className = (el.className || '').toLowerCase();
        const id = el.id?.toLowerCase() || '';
        const title = el.getAttribute('title')?.toLowerCase() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        
        // Check if element might be a screenshot button
        if (text.includes('camera') || text.includes('screenshot') || text.includes('capture') ||
            className.includes('camera') || className.includes('screenshot') || className.includes('capture') ||
            id.includes('camera') || id.includes('screenshot') || id.includes('capture') ||
            title.includes('camera') || title.includes('screenshot') || title.includes('capture') ||
            ariaLabel.includes('camera') || ariaLabel.includes('screenshot') || ariaLabel.includes('capture')) {
          
          elements.push({
            index,
            tagName: el.tagName,
            text: el.textContent?.substring(0, 50),
            className: el.className,
            id: el.id,
            title: el.getAttribute('title'),
            ariaLabel: el.getAttribute('aria-label'),
            onClick: el.getAttribute('onclick'),
            role: el.getAttribute('role')
          });
        }
      });
      
      return elements;
    });
    
    console.log(`\n📋 Found ${potentialScreenshotElements.length} potential screenshot elements:`);
    potentialScreenshotElements.forEach((el, i) => {
      console.log(`\n${i + 1}. ${el.tagName} - ${el.text || 'No text'}`);
      console.log(`   Class: ${el.className || 'No class'}`);
      console.log(`   ID: ${el.id || 'No ID'}`);
      console.log(`   Title: ${el.title || 'No title'}`);
      console.log(`   Aria-Label: ${el.ariaLabel || 'No aria-label'}`);
      console.log(`   OnClick: ${el.onClick || 'No onClick'}`);
      console.log(`   Role: ${el.role || 'No role'}`);
    });
    
    return potentialScreenshotElements;
  }

  async testClickElement(elementIndex) {
    console.log(`\n🎯 Testing click on element ${elementIndex + 1}...`);
    
    try {
      // Get all elements again and click the specific one
      const allElements = await this.page.$$('*');
      if (elementIndex < allElements.length) {
        console.log('📸 Clicking element and monitoring network...');
        await allElements[elementIndex].click();
        
        // Wait for any network activity
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Click completed - check network logs above for screenshot API calls');
        return true;
      }
    } catch (error) {
      console.error(`❌ Error clicking element: ${error.message}`);
      return false;
    }
  }

  async runDebug() {
    try {
      console.log('🔍 Starting Bardi Screenshot Debug Session');
      console.log('==========================================');
      
      await this.initializeBrowser();
      await this.loginWithSession();
      await this.navigateToCamera();
      
      console.log('\n🎯 DEBUG PHASE');
      console.log('==============');
      
      const screenshotElements = await this.debugScreenshotButton();
      
      if (screenshotElements.length > 0) {
        console.log('\n💡 INSTRUCTIONS:');
        console.log('1. Try clicking each element manually to see which one triggers screenshot');
        console.log('2. Watch the network logs above for API calls');
        console.log('3. Look for calls that return image data');
        console.log('4. Press ENTER to test the first element automatically');
        
        // Wait for user input
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        
        // Test clicking the first potential screenshot element
        await this.testClickElement(0);
      } else {
        console.log('\n⚠️ No obvious screenshot elements found');
        console.log('💡 Try clicking the camera icon manually and watch for network calls');
      }
      
      console.log('\n⏳ Browser will stay open for manual testing...');
      console.log('   Press Ctrl+C to close');
      await new Promise(() => {});
      
    } catch (error) {
      console.error('❌ Error during debug:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the debug session
async function main() {
  const debug = new BardiScreenshotDebug();
  await debug.runDebug();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
