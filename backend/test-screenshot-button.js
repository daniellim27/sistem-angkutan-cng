/**
 * Test Screenshot Button - Click the specific screenshot button you found
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testScreenshotButton() {
  let browser = null;
  
  try {
    console.log('🚀 Testing Screenshot Button Click');
    console.log('==================================');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable request interception to monitor network calls
    await page.setRequestInterception(true);
    
    let screenshotApiFound = false;
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('screenshot') || url.includes('capture') || url.includes('snapshot') || url.includes('image')) {
        console.log(`📤 SCREENSHOT API REQUEST: ${request.method()} ${url}`);
        screenshotApiFound = true;
      }
      request.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const contentLength = response.headers()['content-length'] || '0';
      
      if (url.includes('screenshot') || url.includes('capture') || url.includes('snapshot') || 
          contentType.includes('image') || parseInt(contentLength) > 10000) {
        console.log(`📥 SCREENSHOT API RESPONSE: ${response.status()} ${url}`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength}`);
      }
    });
    
    console.log('🍪 Logging in...');
    
    // Load session
    const sessionPath = path.join(__dirname, 'session.json');
    const sessionData = await fs.readFile(sessionPath, 'utf-8');
    const session = JSON.parse(sessionData);
    
    // Set cookies
    const cookies = Object.entries(session.cookies).map(([name, value]) => ({
      name,
      value,
      domain: 'ipc.bardi.co.id',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'None'
    }));

    await page.setCookie(...cookies);
    
    // Navigate to Bardi
    await page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Logged in successfully!');
    
    console.log('📹 Navigating to camera...');
    
    // Click "All Devices" toggle
    try {
      await page.click('.ant-tree-switcher');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Opened "All Devices"');
    } catch (error) {
      console.log('⚠️ Could not click "All Devices" toggle');
    }

    // Click camera device
    try {
      await page.click('.deviceItem_box__3ZdcA');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Clicked camera device');
    } catch (error) {
      console.log('⚠️ Could not click camera device');
    }
    
    console.log('🔍 Looking for screenshot button...');
    
    // Try to find the screenshot button using the HTML you provided
    const screenshotSelectors = [
      '.SVG_cs-wrapper__3Cu4D',
      '.SVG_content-right__3SFwG',
      'svg[viewBox="0 0 1024 1024"]',
      'svg[width="18"][height="18"]',
      'path[fill="#E1E1E1"]',
      'svg path[d*="M618.666667 128c123.221333"]'
    ];
    
    let buttonFound = false;
    for (const selector of screenshotSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        if (elements.length > 0) {
          console.log(`🎯 Clicking screenshot button: ${selector}`);
          
          // Click the first matching element
          await elements[0].click();
          
          // Wait for any network activity
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          buttonFound = true;
          break;
        }
      } catch (error) {
        console.log(`Error with selector ${selector}: ${error.message}`);
      }
    }
    
    if (!buttonFound) {
      console.log('⚠️ Screenshot button not found with selectors');
      console.log('💡 Please manually click the camera/screenshot button');
      console.log('⏳ Waiting 10 seconds for manual click...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('\n📊 RESULTS:');
    console.log('===========');
    if (screenshotApiFound) {
      console.log('✅ Screenshot API call detected!');
      console.log('📝 Check the network logs above for the API endpoint');
    } else {
      console.log('⚠️ No screenshot API call detected');
      console.log('💡 The screenshot might be downloaded directly to your computer');
      console.log('💡 Check your Downloads folder for image files');
    }
    
    console.log('\n⏳ Browser will stay open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScreenshotButton();
