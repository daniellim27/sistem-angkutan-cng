const cron = require('node-cron');
const ExchangeRateService = require('./exchangeRateService');

class ExchangeRateScheduler {
  constructor(models) {
    this.exchangeRateService = new ExchangeRateService(models);
    this.job = null;
  }

  /**
   * Start the automated scheduler
   */
  start() {
    console.log('🚀 Starting Exchange Rate Scheduler...');
    
    // Schedule job to run every 2 days at 9:00 AM WIB
    // Cron format: '0 9 */2 * *' = Every 2 days at 9:00 AM
    this.job = cron.schedule('0 9 */2 * *', async () => {
      try {
        console.log('⏰ Scheduled exchange rate update triggered');
        await this.updateExchangeRate();
      } catch (error) {
        console.error('❌ Scheduled update failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta" // WIB timezone
    });

    console.log('✅ Exchange Rate Scheduler started successfully');
    console.log('📅 Next run: Every 2 days at 9:00 AM WIB');
    
    // Also run once immediately on startup to ensure we have a rate
    this.runInitialUpdate();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('⏹️ Exchange Rate Scheduler stopped');
    }
  }

  /**
   * Run initial update on startup
   */
  async runInitialUpdate() {
    try {
      console.log('🔄 Running initial exchange rate update...');
      
      // Check if we already have a recent rate (within last 24 hours)
      const currentRate = await this.exchangeRateService.getCurrentRate('USD');
      
      if (currentRate) {
        const hoursSinceUpdate = (new Date() - new Date(currentRate.scraped_at)) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          console.log(`✅ Recent rate already exists (${hoursSinceUpdate.toFixed(1)} hours ago), skipping initial update`);
          return;
        }
      }
      
      // No recent rate, run update
      await this.updateExchangeRate();
    } catch (error) {
      console.error('❌ Initial update failed:', error.message);
    }
  }

  /**
   * Update exchange rate manually
   */
  async updateExchangeRate() {
    try {
      console.log('🔄 Starting exchange rate update...');
      
      const rate = await this.exchangeRateService.scrapeBIRate();
      
      console.log(`✅ Exchange rate updated successfully: 1 USD = Rp ${rate.toLocaleString('id-ID')}`);
      
      return rate;
    } catch (error) {
      console.error('❌ Exchange rate update failed:', error.message);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    if (!this.job) {
      return { running: false, message: 'Scheduler not started' };
    }

    const nextRun = this.job.nextDate();
    const isRunning = this.job.running;

    return {
      running: isRunning,
      nextRun: nextRun ? nextRun.toISOString() : null,
      message: isRunning ? 'Scheduler is running' : 'Scheduler is stopped'
    };
  }
}

module.exports = ExchangeRateScheduler;
