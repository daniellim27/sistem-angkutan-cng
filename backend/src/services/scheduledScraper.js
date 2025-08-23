const cron = require('node-cron');
const InovatracksScraper = require('./inovatracksScraper');
const { DriverLocation } = require('../models');

class ScheduledScrapingService {
  constructor() {
    this.scraper = new InovatracksScraper();
    this.isRunning = false;
    this.lastRunTime = null;
    this.nextRunTime = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastError: null
    };
  }

  /**
   * Start the scheduled scraping service
   */
  start() {
    // Get scraping interval from environment (default: 1 minute)
    const intervalMinutes = Math.max(1, parseInt(process.env.INOVATRACKS_SCRAPE_INTERVAL) / 60000 || 1);
    const cronExpression = `*/${intervalMinutes} * * * *`; // Every N minutes

    console.log(`🚀 Starting GPS tracking service - scraping every ${intervalMinutes} minute(s)`);

    // Schedule the scraping task
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.runScrapingTask();
    }, {
      scheduled: false // Don't start immediately
    });

    // Start the cron job
    this.cronJob.start();
    this.isRunning = true;

    // Calculate next run time
    this.updateNextRunTime(intervalMinutes);

    console.log('✅ GPS tracking service started successfully');
    console.log(`📅 Next scraping scheduled for: ${this.nextRunTime}`);

    // Run initial scraping after a short delay
    setTimeout(() => {
      this.runScrapingTask();
    }, 10000); // 10 seconds delay

    return true;
  }

  /**
   * Stop the scheduled scraping service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
    }

    this.isRunning = false;
    console.log('🛑 GPS tracking service stopped');

    return true;
  }

  /**
   * Run a single scraping task
   */
  async runScrapingTask() {
    if (this.isScrapingInProgress) {
      console.log('⏳ Previous scraping still in progress, skipping...');
      return;
    }

    try {
      this.isScrapingInProgress = true;
      this.lastRunTime = new Date();
      this.stats.totalRuns++;

      // Check if concurrent scraping is enabled
      const enableConcurrent = process.env.ENABLE_CONCURRENT_SCRAPING === 'true';
      const maxTabs = parseInt(process.env.MAX_CONCURRENT_TABS) || 3;
      
      console.log(`🔄 Starting scheduled GPS scraping cycle #${this.stats.totalRuns}`);
      console.log(`🚀 Using ${enableConcurrent ? `concurrent mode (${maxTabs} tabs)` : 'sequential mode'}`);
      
      const gpsData = await this.scraper.runScrapingCycle(enableConcurrent);
      
      this.stats.successfulRuns++;
      this.stats.lastError = null;

      console.log(`✅ Scraping cycle #${this.stats.totalRuns} completed successfully`);
      console.log(`📊 Scraped ${gpsData.length} GPS records`);
      
      if (enableConcurrent) {
        console.log(`🚀 Performance: Concurrent processing with ${maxTabs} tabs completed`);
      }

      // Update next run time
      const intervalMinutes = Math.max(1, parseInt(process.env.INOVATRACKS_SCRAPE_INTERVAL) / 60000 || 1);
      this.updateNextRunTime(intervalMinutes);

    } catch (error) {
      this.stats.failedRuns++;
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date(),
        stack: error.stack
      };

      console.error(`❌ Scraping cycle #${this.stats.totalRuns} failed:`, error.message);
      
      // Clean up browser resources if error occurred
      try {
        await this.scraper.cleanup();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

    } finally {
      this.isScrapingInProgress = false;
    }
  }

  /**
   * Update next run time calculation
   */
  updateNextRunTime(intervalMinutes) {
    this.nextRunTime = new Date(Date.now() + intervalMinutes * 60000);
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScrapingInProgress: this.isScrapingInProgress || false,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      stats: this.stats,
      configuration: {
        intervalMinutes: Math.max(1, parseInt(process.env.INOVATRACKS_SCRAPE_INTERVAL) / 60000 || 1),
        loginUrl: process.env.INOVATRACKS_LOGIN_URL,
        dashboardUrl: process.env.INOVATRACKS_DASHBOARD_URL,
        username: process.env.INOVATRACKS_USERNAME ? '***' : 'Not configured',
      }
    };
  }

  /**
   * Manual trigger (for testing or immediate scraping)
   */
  async triggerManual() {
    console.log('🔧 Manual GPS scraping triggered');
    return await this.runScrapingTask();
  }

  /**
   * Clean up old location data (run weekly)
   */
  startCleanupSchedule() {
    // Run cleanup every Sunday at 2 AM
    this.cleanupJob = cron.schedule('0 2 * * 0', async () => {
      try {
        console.log('🧹 Starting weekly cleanup of old GPS data...');
        const deletedCount = await DriverLocation.cleanup();
        console.log(`✅ Cleanup completed - removed ${deletedCount} old records`);
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
      }
    });

    console.log('📅 Weekly cleanup scheduled for Sundays at 2:00 AM');
  }

  /**
   * Get recent location statistics
   */
  async getLocationStats() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [recentLocations, activeVehicles, totalRecords] = await Promise.all([
        DriverLocation.count({
          where: {
            timestamp: { [require('sequelize').Op.gte]: thirtyMinutesAgo }
          }
        }),
        DriverLocation.count({
          where: {
            timestamp: { [require('sequelize').Op.gte]: thirtyMinutesAgo }
          },
          distinct: true,
          col: 'vehicle_id'
        }),
        DriverLocation.count()
      ]);

      return {
        recentLocations,
        activeVehicles,
        totalRecords,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting location stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const scrapingService = new ScheduledScrapingService();

module.exports = scrapingService; 