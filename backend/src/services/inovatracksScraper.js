const { chromium } = require('playwright');
const { DriverLocation } = require('../models');
const { Op } = require('sequelize');

class InovatracksScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.loginUrl = process.env.INOVATRACKS_LOGIN_URL || 'https://vts.inovatrack.com/';
    this.dashboardUrl = process.env.INOVATRACKS_DASHBOARD_URL || 'https://vts.inovatrack.com/Map';
    this.username = process.env.INOVATRACKS_USERNAME;
    this.memberCode = process.env.INOVATRACKS_MEMBER_CODE;
    this.password = process.env.INOVATRACKS_PASSWORD;
    // Configuration for parallel processing
    this.maxConcurrentTabs = parseInt(process.env.MAX_CONCURRENT_TABS) || 3;
    this.tabProcessingDelay = parseInt(process.env.TAB_PROCESSING_DELAY) || 1000;
  }

  /**
   * Initialize browser and navigate to login page
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Inovatracks scraper...');
      
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production', // Show browser in development
        slowMo: 100, // Slow down actions for stability
      });

      // Create browser context with user agent
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });

      this.page = await this.context.newPage();
      
      console.log('✅ Browser initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Login to Inovatracks website
   */
  async login() {
    try {
      if (!this.username || !this.password || !this.memberCode) {
        throw new Error('Inovatracks credentials (username, password, member code) not provided in environment variables');
      }

      console.log('🔑 Attempting to login to Inovatracks...');
      
      await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });
      
      // Wait for login form to load - using exact field names from the website
      await this.page.waitForSelector('input[name="MemberCode"]', { timeout: 10000 });
      
      console.log('📝 Filling login form...');
      // Fill form fields with exact names
      await this.page.fill('input[name="MemberCode"]', this.memberCode);
      await this.page.fill('input[name="UserName"]', this.username);
      await this.page.fill('input[name="Password"]', this.password);
      
      console.log('🔐 Submitting login form...');
      // Click login button and wait for any response
      await Promise.all([
        this.page.click('input[type="submit"]'),
        this.page.waitForTimeout(2000) // Short wait for form submission
      ]);
      
      // Check immediate response after form submission
      const currentUrl = this.page.url();
      console.log(`📍 Current URL after login attempt: ${currentUrl}`);
      
      // Directly navigate to Map page without waiting for automatic redirect
      console.log('🗺️ Navigating directly to Map page...');
      await this.page.goto(this.dashboardUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Short wait for page elements to load
      await this.page.waitForTimeout(3000);
      
      const finalUrl = this.page.url();
      console.log(`📍 Final URL: ${finalUrl}`);
      
      // Check if we're on the Map page and not redirected back to login
      const isOnMapPage = finalUrl.includes('/Map') || finalUrl.includes('vts.inovatrack.com') && !finalUrl.includes('Login');
      
      // Additional check: look for map-related elements or vehicle list
      let hasMapElements = false;
      try {
        // Check for common map page elements
        hasMapElements = await this.page.locator('table.k-selectable, #map, .map-container, .leaflet-container, .vehicle-list').count() > 0;
        console.log(`🔍 Map elements found: ${hasMapElements}`);
      } catch (e) {
        console.log('⚠️ Could not check for map elements, but proceeding...');
      }
      
      // Verify login success
      if (isOnMapPage || hasMapElements) {
        this.isLoggedIn = true;
        console.log('✅ Successfully logged in to Inovatracks and reached Map page');
        console.log(`⏱️ Login process completed in ~5 seconds`);
        return true;
      } else {
        // Check if we got redirected back to login page
        const pageContent = await this.page.content();
        if (pageContent.includes('Member Code') && pageContent.includes('User Name') && pageContent.includes('Password')) {
          throw new Error('Login failed - redirected back to login page. Please check credentials.');
        } else {
          throw new Error(`Login uncertain - unexpected page state. URL: ${finalUrl}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Create and authenticate a new browser context/page
   */
  async createAuthenticatedPage() {
    try {
      console.log('🔄 Creating new authenticated page...');
      
      if (!this.browser) {
        await this.initialize();
      }

      // Create new context
      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });

      const page = await context.newPage();
      
      // Login to this page
      await this.loginToPage(page);
      
      console.log('✅ New authenticated page created successfully');
      return { context, page };
      
    } catch (error) {
      console.error('❌ Failed to create authenticated page:', error);
      throw error;
    }
  }

  /**
   * Login to a specific page (optimized for concurrent processing)
   */
  async loginToPage(page) {
    try {
      if (!this.username || !this.password || !this.memberCode) {
        throw new Error('Inovatracks credentials not provided');
      }

      console.log('🔑 Logging in to new page...');
      
      await page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="MemberCode"]', { timeout: 10000 });
      
      // Fill login form
      await page.fill('input[name="MemberCode"]', this.memberCode);
      await page.fill('input[name="UserName"]', this.username);
      await page.fill('input[name="Password"]', this.password);
      
      // Submit and wait briefly
      await Promise.all([
        page.click('input[type="submit"]'),
        page.waitForTimeout(2000)
      ]);
      
      // Navigate directly to Map page
      await page.goto(this.dashboardUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await page.waitForTimeout(3000); // Let map initialize
      console.log('✅ Page login successful');
      
    } catch (error) {
      console.error('❌ Page login failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of vehicles on a single page
   */
  async processVehicleBatch(page, vehicleIndices, totalVehicles, tabId = '') {
    const batchResults = [];
    
    try {
      const logPrefix = tabId ? `Tab ${tabId}` : 'Batch';
      console.log(`🔄 ${logPrefix}: Processing ${vehicleIndices.length} vehicles`);
      
      for (let i = 0; i < vehicleIndices.length; i++) {
        const vehicleIndex = vehicleIndices[i];
        const progress = `${i + 1}/${vehicleIndices.length}`;
        
        try {
          console.log(`🔄 ${logPrefix}: Processing vehicle ${vehicleIndex + 1} (${progress})`);
          
          // Get current vehicle list to avoid stale elements
          const currentVehicleRows = await page.$$('table.k-selectable tbody tr');
          if (vehicleIndex >= currentVehicleRows.length) {
            console.log(`⚠️ ${logPrefix}: Vehicle ${vehicleIndex + 1} no longer available, skipping...`);
            continue;
          }
          
          const vehicleElement = currentVehicleRows[vehicleIndex];
          let vehiclePlate = '';
          
          // Get vehicle identifier with improved selectors
          try {
            vehiclePlate = await vehicleElement.$eval('td:first-child, .vehicle-name, .plate, td', el => el.textContent?.trim()) || `Vehicle_${vehicleIndex + 1}`;
          } catch (e) {
            vehiclePlate = `Vehicle_${vehicleIndex + 1}`;
          }
          
          console.log(`📋 ${logPrefix}: Processing ${vehiclePlate}`);
          
          // Click on vehicle and wait for details with optimized timing
          await vehicleElement.click();
          await page.waitForTimeout(Math.max(500, this.tabProcessingDelay / 2)); // Faster processing
          
          // Extract coordinates
          let coordinates = null;
          const coordSelectors = [
            '#txtCoordinate',
            '.coordinates', 
            '.lat-lng',
            '[data-coordinates]'
          ];
          
          for (const selector of coordSelectors) {
            try {
              const coordElement = await page.waitForSelector(selector, { timeout: 3000 });
              coordinates = await coordElement.textContent();
              if (coordinates && coordinates.includes(',')) {
                break;
              }
            } catch (e) {
              // Try next selector
            }
          }
          
          // Fallback: search page text for coordinates
          if (!coordinates) {
            const pageText = await page.textContent('body');
            const coordMatch = pageText.match(/-?\d+\.\d+,\s*-?\d+\.\d+/);
            if (coordMatch) {
              coordinates = coordMatch[0];
            }
          }
          
          // Parse and store coordinates
          if (coordinates) {
            const coordParts = coordinates.split(',').map(c => c.trim());
            if (coordParts.length === 2) {
              const latitude = parseFloat(coordParts[0]);
              const longitude = parseFloat(coordParts[1]);
              
              if (!isNaN(latitude) && !isNaN(longitude)) {
                batchResults.push({
                  deviceId: vehiclePlate,
                  deviceName: vehiclePlate,
                  latitude: latitude,
                  longitude: longitude,
                  speed: null,
                  timestamp: new Date().toISOString(),
                  status: 'active',
                  location: ''
                });
                
                console.log(`✅ ${logPrefix}: Successfully processed ${vehiclePlate}: ${coordinates}`);
              }
            }
          } else {
            console.log(`⚠️ ${logPrefix}: No coordinates found for ${vehiclePlate}`);
          }
          
        } catch (error) {
          console.error(`❌ ${logPrefix}: Error processing vehicle ${vehicleIndex + 1}:`, error.message);
          continue;
        }
      }
      
    } catch (error) {
      console.error('❌ Error in vehicle batch processing:', error);
    }
    
    return batchResults;
  }

  /**
   * Distribute vehicles optimally across the specified number of tabs
   */
  distributeVehiclesAcrossTabs(totalVehicles, numTabs) {
    const batches = Array.from({ length: numTabs }, () => []);
    
    // Distribute vehicles round-robin style for better balance
    for (let i = 0; i < totalVehicles; i++) {
      const tabIndex = i % numTabs;
      batches[tabIndex].push(i);
    }
    
    return batches;
  }

  /**
   * Process a batch of vehicles with retry mechanism
   */
  async processVehicleBatchWithRetry(page, vehicleIndices, totalVehicles, tabId) {
    const maxRetries = 2;
    let attempt = 1;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`🔄 Tab ${tabId} attempt ${attempt}/${maxRetries}`);
        return await this.processVehicleBatch(page, vehicleIndices, totalVehicles, tabId);
      } catch (error) {
        console.error(`❌ Tab ${tabId} attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await page.waitForTimeout(2000 * attempt);
        attempt++;
      }
    }
  }

  /**
   * Simplified vehicle processing for error recovery
   */
  async processVehicleBatchSimple(page, vehicleIndices) {
    const results = [];
    
    for (const vehicleIndex of vehicleIndices.slice(0, 3)) { // Only try first 3 for recovery
      try {
        // Very basic processing with minimal selectors
        const vehicleRows = await page.$$('table.k-selectable tbody tr');
        if (vehicleIndex < vehicleRows.length) {
          const vehicleElement = vehicleRows[vehicleIndex];
          await vehicleElement.click();
          await page.waitForTimeout(1000);
          
          // Simple coordinate extraction
          const pageText = await page.textContent('body');
          const coordMatch = pageText.match(/-?\d+\.\d+,\s*-?\d+\.\d+/);
          
          if (coordMatch) {
            const [lat, lng] = coordMatch[0].split(',').map(c => parseFloat(c.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
              results.push({
                deviceId: `Vehicle_${vehicleIndex + 1}`,
                deviceName: `Vehicle_${vehicleIndex + 1}`,
                latitude: lat,
                longitude: lng,
                speed: null,
                timestamp: new Date().toISOString(),
                status: 'active',
                location: ''
              });
            }
          }
        }
      } catch (e) {
        // Silently continue with next vehicle
      }
    }
    
    return results;
  }

  /**
   * Scrape GPS data using exactly 3 concurrent tabs with optimized load balancing
   */
  async scrapeGPSDataConcurrent() {
    try {
      console.log('📍 Starting optimized 3-tab concurrent GPS data scraping...');
      
      // Ensure we have a main page for vehicle discovery
      if (!this.page || !this.isLoggedIn) {
        await this.initialize();
        await this.login();
      }
      
      // Get vehicle list from main page
      const vehicleRows = await this.page.$$('table.k-selectable tbody tr');
      if (vehicleRows.length === 0) {
        console.log('⚠️ No vehicles found on main page');
        return [];
      }
      
      // Remove testing limit - process all vehicles for maximum efficiency
      const totalVehicles = vehicleRows.length;
      console.log(`🚗 Found ${totalVehicles} vehicles to process with 3 concurrent tabs`);
      
      // Optimize vehicle distribution across exactly 3 tabs
      const vehicleBatches = this.distributeVehiclesAcrossTabs(totalVehicles, 3);
      
      console.log(`📊 Optimally distributed ${totalVehicles} vehicles across 3 tabs:`);
      vehicleBatches.forEach((batch, index) => {
        console.log(`   Tab ${index + 1}: ${batch.length} vehicles [${batch.slice(0, 3).join(',')}${batch.length > 3 ? '...' : ''}]`);
      });
      
      const startTime = Date.now();
      
      // Create exactly 3 concurrent processing promises
      const processingPromises = vehicleBatches.map(async (batchIndices, batchIndex) => {
        let pageContext = null;
        const tabId = batchIndex + 1;
        
        try {
          console.log(`🚀 Tab ${tabId} starting: processing ${batchIndices.length} vehicles`);
          
          // Use main page for first tab, create new authenticated pages for others
          if (batchIndex === 0) {
            return await this.processVehicleBatchWithRetry(this.page, batchIndices, totalVehicles, tabId);
          } else {
            pageContext = await this.createAuthenticatedPage();
            return await this.processVehicleBatchWithRetry(pageContext.page, batchIndices, totalVehicles, tabId);
          }
          
        } catch (error) {
          console.error(`❌ Tab ${tabId} failed:`, error.message);
          // Try to salvage what we can with a simpler approach
          try {
            console.log(`🔄 Tab ${tabId} attempting recovery with fallback method...`);
            return await this.processVehicleBatchSimple(pageContext?.page || this.page, batchIndices.slice(0, 5)); // Limit to 5 for recovery
          } catch (recoveryError) {
            console.error(`❌ Tab ${tabId} recovery also failed:`, recoveryError.message);
            return [];
          }
        } finally {
          // Clean up additional contexts (keep main page)
          if (pageContext && batchIndex > 0) {
            try {
              await pageContext.context.close();
              console.log(`🧹 Tab ${tabId} context cleaned up`);
            } catch (cleanupError) {
              console.error(`⚠️ Tab ${tabId} cleanup error:`, cleanupError.message);
            }
          }
        }
      });
      
      // Wait for all 3 tabs to complete with progress tracking
      console.log('⏳ Processing vehicles across 3 tabs simultaneously...');
      
      const batchResults = await Promise.allSettled(processingPromises);
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();
      
      const failedTabs = batchResults
        .filter(result => result.status === 'rejected')
        .length;
      
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ 3-tab concurrent scraping completed in ${processingTime}s`);
      console.log(`📊 Results: ${successfulResults.length} GPS records from ${totalVehicles} vehicles`);
      console.log(`🚀 Performance: ${3 - failedTabs}/3 tabs successful`);
      if (failedTabs > 0) {
        console.log(`⚠️ ${failedTabs} tabs encountered errors but scraping continued`);
      }
      
      return successfulResults;
      
    } catch (error) {
      console.error('❌ Failed to scrape GPS data concurrently:', error);
      throw error;
    }
  }

  /**
   * Original sequential scraping method (kept for fallback)
   */
  async scrapeGPSData() {
    try {
      // Check if we're already on a valid page (Map or dashboard)
      const currentUrl = this.page ? this.page.url() : '';
      const isOnValidPage = currentUrl.includes('vts.inovatrack.com') && 
                           (currentUrl.includes('/Map') || currentUrl.includes('/Dashboard') || 
                            currentUrl === 'https://vts.inovatrack.com/');
      
      if (!this.isLoggedIn && !isOnValidPage) {
        console.log('🔑 Not logged in, attempting login...');
        await this.login();
      } else if (isOnValidPage && !this.isLoggedIn) {
        console.log('✅ Already on valid page, updating login status...');
        this.isLoggedIn = true;
      }

      console.log('📍 Scraping GPS data from Inovatracks Map (sequential mode)...');
      
      // Navigate to Map page if not already there
      const pageUrl = this.page.url();
      if (!pageUrl.includes('/Map')) {
        console.log('🗺️ Navigating to Map page...');
        await this.page.goto(this.dashboardUrl, { waitUntil: 'networkidle' });
        console.log(`✅ Navigated to: ${this.page.url()}`);
      } else {
        console.log('✅ Already on Map page');
      }
      
      // Wait for map and vehicle list to load
      await this.page.waitForTimeout(3000); // Give map time to initialize
      
      let vehicleRows = []; // Declare outside the try block
      
      // Try to find vehicle list or fleet elements on the Map page
      try {
        // Look for various possible selectors on the Map page
        const vehicleListSelectors = [
          'table.k-selectable tbody tr',
          '.vehicle-list tbody tr',
          '.fleet-list tbody tr',
          '[data-vehicle]',
          '.vehicle-row'
        ];
        
        for (const selector of vehicleListSelectors) {
          vehicleRows = await this.page.$$(selector);
          if (vehicleRows.length > 0) {
            console.log(`✅ Found ${vehicleRows.length} vehicles using selector: ${selector}`);
            break;
          }
        }
        
        if (vehicleRows.length === 0) {
          console.log('⚠️ No vehicles found, trying alternative approach...');
          
          // Try to find any clickable vehicle elements
          const clickableElements = await this.page.$$('[onclick*="vehicle"], [data-id], .clickable-vehicle');
          if (clickableElements.length > 0) {
            vehicleRows = clickableElements;
            console.log(`✅ Found ${vehicleRows.length} clickable vehicle elements`);
          }
        }
        
        if (vehicleRows.length === 0) {
          throw new Error('No vehicle elements found on Map page');
        }
        
      } catch (error) {
        console.log('⚠️ Could not find vehicle list, continuing with map exploration...');
        
        // If we can't find the vehicle list, try to inspect the page structure
        const pageContent = await this.page.content();
        console.log('📄 Page title:', await this.page.title());
        
        // Look for any GPS coordinates directly in the page
        const coordMatches = pageContent.match(/-?\d+\.\d+,\s*-?\d+\.\d+/g);
        if (coordMatches && coordMatches.length > 0) {
          console.log(`🎯 Found potential coordinates in page: ${coordMatches.slice(0, 3).join(', ')}...`);
        }
        
        return []; // Return empty array if no vehicles found
      }
      
      console.log(`🚗 Found ${vehicleRows.length} vehicles to process`);
      
      const gpsData = [];
      
      // Process each vehicle row - refresh vehicle list each iteration to avoid DOM detachment
      for (let i = 0; i < Math.min(vehicleRows.length, 10); i++) { // Limit to 10 for testing
        try {
          console.log(`🔄 Processing vehicle ${i + 1}/${vehicleRows.length}`);
          
          // Refresh vehicle list to get current DOM elements
          const currentVehicleRows = await this.page.$$('table.k-selectable tbody tr');
          if (i >= currentVehicleRows.length) {
            console.log(`⚠️ Vehicle ${i + 1} no longer available, skipping...`);
            continue;
          }
          
          // Get the current vehicle element
          const vehicleElement = currentVehicleRows[i];
          let vehiclePlate = '';
          
          // Try different ways to get vehicle identifier
          try {
            vehiclePlate = await vehicleElement.$eval('td:first-child, .vehicle-name, .plate', el => el.textContent?.trim()) || `Vehicle_${i + 1}`;
          } catch (e) {
            vehiclePlate = `Vehicle_${i + 1}`;
          }
          
          console.log(`📋 Processing vehicle: ${vehiclePlate}`);
          
          // Click on the vehicle
          await vehicleElement.click();
          await this.page.waitForTimeout(2000); // Wait for details to load
          
          // Try to find coordinates in various places
          let coordinates = null;
          const coordSelectors = [
            '#txtCoordinate',
            '.coordinates',
            '.lat-lng',
            '[data-coordinates]'
          ];
          
          for (const selector of coordSelectors) {
            try {
              const coordElement = await this.page.waitForSelector(selector, { timeout: 3000 });
              coordinates = await coordElement.textContent();
              if (coordinates && coordinates.includes(',')) {
                console.log(`📍 Found coordinates for ${vehiclePlate}: ${coordinates}`);
                break;
              }
            } catch (e) {
              // Try next selector
            }
          }
          
          // If no coordinates found in specific elements, try to find them in the page
          if (!coordinates) {
            const pageText = await this.page.textContent('body');
            const coordMatch = pageText.match(/-?\d+\.\d+,\s*-?\d+\.\d+/g);
            if (coordMatch) {
              coordinates = coordMatch[0];
              console.log(`📍 Found coordinates in page text for ${vehiclePlate}: ${coordinates}`);
            }
          }
          
          // Parse coordinates
          if (coordinates) {
            const coordParts = coordinates.split(',').map(c => c.trim());
            if (coordParts.length === 2) {
              const latitude = parseFloat(coordParts[0]);
              const longitude = parseFloat(coordParts[1]);
              
              if (!isNaN(latitude) && !isNaN(longitude)) {
                gpsData.push({
                  deviceId: vehiclePlate,
                  deviceName: vehiclePlate,
                  latitude: latitude,
                  longitude: longitude,
                  speed: null,
                  timestamp: new Date().toISOString(),
                  status: 'active',
                  location: ''
                });
                
                console.log(`✅ Successfully processed ${vehiclePlate}`);
              } else {
                console.log(`⚠️ Invalid coordinates for ${vehiclePlate}: ${coordinates}`);
              }
            }
          } else {
            console.log(`⚠️ No coordinates found for ${vehiclePlate}`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing vehicle ${i + 1}:`, error.message);
          continue;
        }
      }
      
      console.log(`📊 Successfully scraped ${gpsData.length} GPS records from ${vehicleRows.length} vehicles`);
      return gpsData;
      
    } catch (error) {
      console.error('❌ Failed to scrape GPS data:', error);
      throw error;
    }
  }

  /**
   * Save GPS data to database and update/create vehicles
   */
  async saveGPSData(gpsData) {
    try {
      console.log('💾 Saving GPS data to database...');
      
      for (const data of gpsData) {
        // Find the driver/vehicle based on device ID
        let vehicle = await this.findVehicleByDeviceId(data.deviceId);
        
        // Extract clean plate number from device ID
        const cleanPlateNumber = this.extractPlateNumber(data.deviceId);
        
        if (!vehicle && cleanPlateNumber) {
          // Try to create or update vehicle record with the plate number
          vehicle = await this.createOrUpdateVehicleFromGPS(data.deviceId, cleanPlateNumber);
        }
        
        if (vehicle) {
          // Update vehicle's GPS timestamp and device_id if needed
          await vehicle.update({
            device_id: data.deviceId,
            last_gps_update: new Date(data.timestamp)
          });
          
          await DriverLocation.create({
            driver_id: vehicle.driver_id,
            vehicle_id: vehicle.id,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            device_id: data.deviceId,
            timestamp: new Date(data.timestamp),
            status: data.status
          });
          
          console.log(`✅ Saved location for vehicle ${data.deviceName || data.deviceId} (ID: ${vehicle.id})`);
        } else {
          // Save GPS data even without vehicle match for tracking purposes
          console.log(`⚠️ Vehicle not found for device ID: ${data.deviceId}, saving GPS data anyway...`);
          
          await DriverLocation.create({
            driver_id: null, // No driver match
            vehicle_id: null, // No vehicle match
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            device_id: data.deviceId,
            timestamp: new Date(data.timestamp),
            status: data.status
          });
          
          console.log(`✅ Saved GPS location for unmatched device: ${data.deviceName || data.deviceId}`);
        }
      }
      
      console.log(`💾 Successfully saved ${gpsData.length} GPS records to database`);
      
    } catch (error) {
      console.error('❌ Failed to save GPS data:', error);
      throw error;
    }
  }

  /**
   * Extract clean plate number from device ID
   */
  extractPlateNumber(deviceId) {
    try {
      // Extract license plate from device ID (e.g., "BE8408AADWarunggunung, Kabupaten Lebak" -> "BE8408AAD")
      // Common Indonesian plate formats: AA 1234 ABC, A 1234 ABC, AA 123 A, etc.
      const licensePlateMatch = deviceId.match(/^([A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3})/);
      
      if (licensePlateMatch) {
        // Remove spaces and return clean plate number
        return licensePlateMatch[1].replace(/\s/g, '');
      }
      
      // Fallback: try to extract any alphanumeric sequence at the beginning
      const alphaNumMatch = deviceId.match(/^([A-Z0-9]+)/);
      return alphaNumMatch ? alphaNumMatch[1] : null;
    } catch (error) {
      console.error('Error extracting plate number:', error);
      return null;
    }
  }

  /**
   * Create or update vehicle from GPS data
   */
  async createOrUpdateVehicleFromGPS(deviceId, plateNumber) {
    try {
      const { Vehicle } = require('../models');
      
      console.log(`🚗 Attempting to create/update vehicle with plate: ${plateNumber} (device: ${deviceId})`);
      
      // Check if vehicle already exists with this plate number
      let vehicle = await Vehicle.findOne({
        where: {
          [Op.or]: [
            { license_plate: { [Op.iLike]: `%${plateNumber}%` } },
            { device_id: deviceId }
          ]
        }
      });
      
      if (vehicle) {
        // Update existing vehicle with device_id if not set
        if (!vehicle.device_id) {
          await vehicle.update({ device_id: deviceId });
          console.log(`✅ Updated existing vehicle ${vehicle.license_plate} with device ID: ${deviceId}`);
        }
        return vehicle;
      } else {
        // Create new vehicle record
        vehicle = await Vehicle.create({
          license_plate: plateNumber,
          device_id: deviceId,
          type: 'Unknown', // Default type
          status: 'available',
          capacity: null,
          tire_count: 6, // Default tire count
          spare_tire_count: 2, // Default spare count
          last_gps_update: new Date()
        });
        
        console.log(`✅ Created new vehicle from GPS data: ${plateNumber} (ID: ${vehicle.id})`);
        return vehicle;
      }
    } catch (error) {
      console.error(`❌ Error creating/updating vehicle for plate ${plateNumber}:`, error);
      return null;
    }
  }

  /**
   * Find vehicle by device ID (you'll need to add device_id field to vehicles table)
   */
  async findVehicleByDeviceId(deviceId) {
    try {
      const { Vehicle } = require('../models');
      
      // First try to find by device_id field
      let vehicle = await Vehicle.findOne({
        where: { device_id: deviceId },
        include: ['driver']
      });
      
      // If not found, try to find by license plate
      if (!vehicle) {
        // Extract license plate from device ID
        const extractedPlate = this.extractPlateNumber(deviceId);
        
        if (extractedPlate) {
          vehicle = await Vehicle.findOne({
            where: {
              [Op.or]: [
                { license_plate: { [Op.iLike]: `%${extractedPlate}%` } },
                { license_plate: { [Op.iLike]: `%${deviceId}%` } }
              ]
            },
            include: ['driver']
          });
        }
      }
      
      return vehicle;
    } catch (error) {
      console.error('Error finding vehicle:', error);
      return null;
    }
  }

  /**
   * Run complete scraping cycle with option for concurrent processing
   */
  async runScrapingCycle(useConcurrent = true) {
    try {
      console.log(`🔄 Starting scraping cycle... (${useConcurrent ? 'concurrent' : 'sequential'} mode)`);
      
      if (!this.browser) {
        await this.initialize();
      }
      
      // Use concurrent or sequential processing based on parameter
      const gpsData = useConcurrent 
        ? await this.scrapeGPSDataConcurrent()
        : await this.scrapeGPSData();
        
      await this.saveGPSData(gpsData);
      
      console.log('✅ Scraping cycle completed successfully');
      return gpsData;
      
    } catch (error) {
      console.error('❌ Scraping cycle failed:', error);
      throw error;
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('🧹 Browser cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get latest GPS data for a specific vehicle
   */
  async getLatestLocation(vehicleId) {
    try {
      const location = await DriverLocation.findOne({
        where: { vehicle_id: vehicleId },
        order: [['timestamp', 'DESC']]
      });
      
      return location;
    } catch (error) {
      console.error('Error getting latest location:', error);
      return null;
    }
  }
}

module.exports = InovatracksScraper; 