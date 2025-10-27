/**
 * Bardi Targeted Screenshot - Click the specific camera icon
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function takeTargetedScreenshot() {
  let browser = null;
  
  try {
    console.log('🎯 Bardi Targeted Screenshot Test');
    console.log('=================================');
    
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
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('screenshot') || url.includes('capture') || url.includes('snapshot') || url.includes('image')) {
        console.log(`📤 SCREENSHOT API: ${request.method()} ${url}`);
      }
      request.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const contentLength = response.headers()['content-length'] || '0';
      
      if (url.includes('screenshot') || url.includes('capture') || url.includes('snapshot') || 
          contentType.includes('image') || parseInt(contentLength) > 10000) {
        console.log(`📥 SCREENSHOT RESPONSE: ${response.status()} ${url}`);
        console.log(`   Content-Type: ${contentType}, Length: ${contentLength}`);
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
    await page.click('.ant-tree-switcher');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Opened "All Devices"');

    // Click camera device
    await page.click('.deviceItem_box__3ZdcA');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Clicked camera device');
    
    console.log('🔍 Looking for camera icon in control bar...');
    
    // Wait for the camera interface to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look specifically for camera icon in the control bar (bottom area)
    const cameraIconSelectors = [
      // Look for the camera icon path specifically
      'svg path[d*="M618.666667 128c123.221333"]',
      // Look for SVG elements in the control bar area
      'div[class*="control"] svg path[d*="M618.666667 128c123.221333"]',
      'div[class*="bottom"] svg path[d*="M618.666667 128c123.221333"]',
      'div[class*="toolbar"] svg path[d*="M618.666667 128c123.221333"]',
      // Look for the specific SVG wrapper
      '.SVG_cs-wrapper__3Cu4D.SVG_content-bottom__2CsQt svg path[d*="M618.666667 128c123.221333"]'
    ];
    
    let cameraIconClicked = false;
    
    for (const selector of cameraIconSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        if (elements.length > 0) {
          // Click the first camera icon found
          console.log(`🎯 Clicking camera icon: ${selector}`);
          await elements[0].click();
          
          // Wait for any network activity or download
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          cameraIconClicked = true;
          console.log('✅ Camera icon clicked!');
          break;
        }
      } catch (error) {
        console.log(`Error with selector ${selector}: ${error.message}`);
      }
    }
    
    if (!cameraIconClicked) {
      console.log('⚠️ Camera icon not found with specific selectors');
      console.log('💡 Trying to find any clickable camera-related element...');
      
      // Fallback: look for any element with the camera icon path
      const fallbackElements = await page.$$('svg path[d*="M618.666667 128c123.221333"]');
      console.log(`Found ${fallbackElements.length} fallback camera icon elements`);
      
      if (fallbackElements.length > 0) {
        // Try clicking each one until we find the right one
        for (let i = 0; i < fallbackElements.length; i++) {
          try {
            console.log(`🎯 Trying fallback camera icon ${i + 1}/${fallbackElements.length}`);
            await fallbackElements[i].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if this was the right one by looking for downloads or network calls
            console.log('✅ Clicked fallback camera icon!');
            cameraIconClicked = true;
            break;
          } catch (error) {
            console.log(`Error clicking fallback element ${i}: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n📊 RESULTS:');
    console.log('===========');
    if (cameraIconClicked) {
      console.log('✅ Camera icon clicked successfully!');
      console.log('💡 Check your Downloads folder for the screenshot');
      console.log('💡 Watch the network logs above for any API calls');
    } else {
      console.log('⚠️ Could not find or click the camera icon');
      console.log('💡 You may need to manually click the camera icon');
    }
    
    console.log('\n⏳ Browser will stay open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeTargetedScreenshot();
