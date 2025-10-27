/**
 * Bardi Browser with Login Support
 * 
 * Opens browser and either uses session cookies or allows manual login
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
    
    // Load session if available
    let sessionLoaded = false;
    try {
      console.log('📁 Loading session from session.json...');
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

      console.log('🍪 Setting session cookies...');
      console.log(`Setting ${cookies.length} cookies:`, cookies.map(c => c.name).join(', '));
      await page.setCookie(...cookies);
      sessionLoaded = true;
      
    } catch (error) {
      console.log('⚠️ Could not load session.json:', error.message);
      console.log('💡 Will proceed with manual login');
    }

    // Navigate to Bardi
    console.log('🌐 Navigating to Bardi website...');
    await page.goto('https://ipc.bardi.co.id/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we're logged in
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Page title: ${pageTitle}`);
    
    if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
      console.log('\n🔐 LOGIN REQUIRED');
      console.log('================');
      console.log('The session cookies may be expired or invalid.');
      console.log('Please manually log in to your Bardi account:');
      console.log('');
      console.log('1. Enter your username and password');
      console.log('2. Click Login');
      console.log('3. Wait for the camera interface to load');
      console.log('4. Navigate to your camera view');
      console.log('5. Click the camera/screenshot button');
      console.log('');
      console.log('💡 To update your session cookies:');
      console.log('   - After logging in, press F12');
      console.log('   - Go to Application/Storage tab');
      console.log('   - Copy the cookies and update session.json');
      console.log('');
      console.log('⏳ Waiting for you to log in...');
      
      // Wait for user to log in (check URL changes)
      let attempts = 0;
      while (attempts < 60) { // Wait up to 5 minutes
        await new Promise(resolve => setTimeout(resolve, 5000));
        const newUrl = page.url();
        const newTitle = await page.title();
        
        if (!newUrl.includes('login') && !newTitle.toLowerCase().includes('login')) {
          console.log('✅ Login detected! Welcome to Bardi!');
          break;
        }
        
        attempts++;
        if (attempts % 12 === 0) { // Every minute
          console.log(`⏳ Still waiting for login... (${Math.floor(attempts/12)} minutes)`);
        }
      }
      
    } else {
      console.log('✅ Successfully logged in with session cookies!');
    }
    
    console.log('\n🎉 BARDI BROWSER READY!');
    console.log('=======================');
    console.log('📹 Navigate to your camera interface');
    console.log('📸 Click the camera icon in the bottom bar to take screenshots');
    console.log('🔍 Open DevTools (F12) → Network tab to see API calls');
    console.log('❌ Close this browser window when done');
    console.log('');
    console.log('💡 To capture screenshots:');
    console.log('   1. Find your camera in the interface');
    console.log('   2. Click the camera/screenshot button');
    console.log('   3. The screenshot should download automatically');
    console.log('   4. Check the Network tab for the API endpoint');
    
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
