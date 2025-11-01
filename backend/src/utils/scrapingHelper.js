const { chromium } = require('playwright');

/**
 * Helper tool to test different CSS selectors on Inovatracks
 * This helps you find the right selectors without affecting the main scraper
 */
class ScrapingHelper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🧪 Starting scraping helper...');
    
    this.browser = await chromium.launch({
      headless: true, // Headless mode for server environments
      slowMo: 1000, // Slow down for visibility
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--memory-pressure-off',
        '--max_old_space_size=2048'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    return true;
  }

  async loginToInovatracks() {
    try {
      console.log('🔑 Logging into Inovatracks...');
      
      // Navigate to login page
      await this.page.goto(process.env.INOVATRACKS_LOGIN_URL || 'https://inovatracks.com/login');
      
      // Wait for page to load
      await this.page.waitForTimeout(2000);
      
      // Try different login form patterns
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]', 
        'input[type="email"]',
        'input[id="username"]',
        'input[id="email"]',
        '#username',
        '#email',
        '.username',
        '.email'
      ];
      
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[id="password"]',
        '#password',
        '.password'
      ];

      // Try to find username field
      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.page.$(selector);
          if (usernameField) {
            console.log(`✅ Found username field: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }

      // Try to find password field
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            console.log(`✅ Found password field: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }

      if (usernameField && passwordField) {
        // Fill in credentials
        await usernameField.fill(process.env.INOVATRACKS_USERNAME || 'gaspol');
        await passwordField.fill(process.env.INOVATRACKS_PASSWORD || 'admin123');
        
        // Try to find and click submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          '.login-btn',
          '.btn-login',
          '.submit',
          'button:has-text("Login")',
          'button:has-text("Sign In")'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const submitBtn = await this.page.$(selector);
            if (submitBtn) {
              console.log(`✅ Found submit button: ${selector}`);
              await submitBtn.click();
              submitted = true;
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }

        if (!submitted) {
          console.log('⚠️ Could not find submit button, trying Enter key...');
          await passwordField.press('Enter');
        }

        // Wait for navigation
        await this.page.waitForTimeout(3000);
        
        console.log('✅ Login attempt completed');
        console.log(`📍 Current URL: ${this.page.url()}`);
        
        return true;
      } else {
        console.log('❌ Could not find login fields');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      return false;
    }
  }

  async testSelectors(selectors) {
    console.log('🔍 Testing selectors...');
    
    const results = await this.page.evaluate((testSelectors) => {
      const findings = {};
      
      testSelectors.forEach((selector, index) => {
        try {
          const elements = document.querySelectorAll(selector);
          findings[`test_${index + 1}`] = {
            selector: selector,
            count: elements.length,
            samples: Array.from(elements).slice(0, 3).map(el => ({
              tagName: el.tagName,
              className: el.className,
              textContent: el.textContent?.trim().substring(0, 100),
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {})
            }))
          };
        } catch (error) {
          findings[`test_${index + 1}`] = {
            selector: selector,
            error: error.message
          };
        }
      });
      
      return findings;
    }, selectors);

    console.log('📊 Selector test results:');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
  }

  async extractAllPageData() {
    console.log('📄 Extracting all page data...');
    
    const pageData = await this.page.evaluate(() => {
      // Get all text content that might contain coordinates
      const allText = document.body.innerText;
      
      // Look for coordinate patterns
      const coordinatePatterns = [
        /-?\d+\.\d+/g, // Decimal numbers (coordinates)
        /-?\d+°\d+'\d+"/g, // DMS coordinates
      ];
      
      const foundCoordinates = [];
      coordinatePatterns.forEach(pattern => {
        const matches = allText.match(pattern);
        if (matches) {
          foundCoordinates.push(...matches);
        }
      });

      // Get all elements with data attributes
      const elementsWithData = Array.from(document.querySelectorAll('[data-lat], [data-lng], [data-latitude], [data-longitude]')).map(el => ({
        tagName: el.tagName,
        className: el.className,
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      }));

      // Get tables (GPS data often in tables)
      const tables = Array.from(document.querySelectorAll('table')).map(table => ({
        rowCount: table.rows.length,
        columnCount: table.rows[0]?.cells.length || 0,
        headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
        firstRowData: table.rows[1] ? Array.from(table.rows[1].cells).map(cell => cell.textContent?.trim()) : []
      }));

      return {
        url: window.location.href,
        title: document.title,
        foundCoordinates: foundCoordinates.slice(0, 20), // First 20 coordinate-like numbers
        elementsWithData,
        tables,
        allClassNames: Array.from(new Set(Array.from(document.querySelectorAll('*')).map(el => el.className).filter(Boolean))).slice(0, 50)
      };
    });

    console.log('📊 Page data extracted:');
    console.log(JSON.stringify(pageData, null, 2));
    
    return pageData;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Helper cleanup completed');
    }
  }
}

module.exports = ScrapingHelper; 