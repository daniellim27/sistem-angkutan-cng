/**
 * Simple Bardi Browser - Minimal Version
 * 
 * Just opens a browser with your Bardi session logged in
 * for manual screenshot capture.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function openBardiBrowser() {
  let browser = null;
  
  try {
    console.log('🚀 Opening Bardi Browser...');
    
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
    
    console.log('🌐 Loading session...');
    
    // Load session
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

    console.log('🍪 Setting cookies...');
    console.log(`Setting ${cookies.length} cookies:`, cookies.map(c => c.name).join(', '));
    await page.setCookie(...cookies);

    // Navigate to Bardi with cookies already set
    console.log('🌐 Navigating to Bardi website...');
    await page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait a moment for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we're still on login page
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Page title: ${pageTitle}`);
    
    if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
      console.log('⚠️ Still on login page - cookies may not be working');
      console.log('💡 Try manually logging in, or check your session.json file');
    } else {
      console.log('✅ Successfully logged in!');
    }
    
    console.log('✅ Ready! Your Bardi session is loaded.');
    console.log('📹 Navigate to your camera interface');
    console.log('📸 Click the camera icon to take screenshots');
    console.log('❌ Close this browser window when done');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Closing browser...');
  process.exit(0);
});

openBardiBrowser();
