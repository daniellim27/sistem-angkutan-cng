const cron = require('node-cron');
const InovatracksScraper = require('./inovatracksScraper');
const { DriverLocation } = require('../models');
const logger = require('../utils/logger');

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

    logger.info(`Starting GPS tracking service - scraping every ${intervalMinutes} minute(s)`);

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

    logger.info('GPS tracking service started successfully');
    logger.info(`Next scraping scheduled for: ${this.nextRunTime}`);

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
    logger.warn('GPS tracking service stopped');

    return true;
  }

  /**
   * Run a single scraping task
   */
  async runScrapingTask() {
    if (this.isScrapingInProgress) {
      logger.warn('Previous scraping still in progress, skipping this run');
      return;
    }

    try {
      this.isScrapingInProgress = true;
      this.lastRunTime = new Date();
      this.stats.totalRuns++;

      // Check if concurrent scraping is enabled
      const enableConcurrent = process.env.ENABLE_CONCURRENT_SCRAPING === 'true';
      const maxTabs = parseInt(process.env.MAX_CONCURRENT_TABS) || 3;
      
      logger.info(`Starting scheduled GPS scraping cycle #${this.stats.totalRuns}`);
      logger.info(`Mode: ${enableConcurrent ? `concurrent (${maxTabs} tabs)` : 'sequential'}`);
      
      const gpsData = await this.scraper.runScrapingCycle(enableConcurrent);
      
      this.stats.successfulRuns++;
      this.stats.lastError = null;

      logger.info(`Scraping cycle #${this.stats.totalRuns} completed successfully with ${gpsData.length} GPS records`);
      
      if (enableConcurrent) {
        logger.debug(`Concurrent processing with ${maxTabs} tabs completed`);
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

      logger.error(`Scraping cycle #${this.stats.totalRuns} failed: ${error.message}`);
      
      // Clean up browser resources if error occurred
      try {
        logger.warn('Performing cleanup after scraping failure...');
        await this.scraper.cleanup();
      } catch (cleanupError) {
        logger.error(`Error during cleanup: ${cleanupError.message}`);
      }

      // If we've had multiple consecutive failures, increase delay before next attempt
      if (this.stats.failedRuns >= 3 && this.stats.successfulRuns === 0) {
        logger.warn('Multiple consecutive failures detected, extending next run delay...');
        const intervalMinutes = Math.max(5, parseInt(process.env.INOVATRACKS_SCRAPE_INTERVAL) / 60000 || 1);
        this.updateNextRunTime(intervalMinutes * 2); // Double the delay
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
    logger.info('Manual GPS scraping triggered');
    return await this.runScrapingTask();
  }

  /**
   * Clean up old location data (run weekly)
   */
  startCleanupSchedule() {
    // Run cleanup every Sunday at 2 AM
    this.cleanupJob = cron.schedule('0 2 * * 0', async () => {
      try {
        logger.info('Starting weekly cleanup of old GPS data...');
        const deletedCount = await DriverLocation.cleanup();
        logger.info(`Cleanup completed - removed ${deletedCount} old records`);
      } catch (error) {
        logger.error('Cleanup failed:', error);
      }
    });

    logger.info('Weekly cleanup scheduled for Sundays at 2:00 AM');
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
      logger.error('Error getting location stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const scrapingService = new ScheduledScrapingService();

module.exports = scrapingService; 