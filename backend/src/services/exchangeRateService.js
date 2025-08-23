const axios = require('axios');
const cheerio = require('cheerio');

class ExchangeRateService {
  constructor(models) {
    this.ExchangeRate = models.ExchangeRate;
  }

  /**
   * Scrape USD exchange rate from Bank Indonesia website
   * @returns {Promise<number>} The scraped USD rate
   */
  async scrapeBIRate() {
    try {
      console.log('🔄 Starting BI rate scraping...');
      
      // Scrape BI website
      const response = await axios.get('https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/Default.aspx', {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract USD selling rate (Kurs Jual)
      // Look for table row containing USD and extract the 3rd column
      let usdRate = null;
      
      $('table tr').each((index, element) => {
        const rowText = $(element).text();
        if (rowText.includes('USD')) {
          const cells = $(element).find('td');
          if (cells.length >= 3) {
            // 3rd column (index 2) is Kurs Jual (Selling Rate)
            const rateText = $(cells[2]).text().trim();
            if (rateText) {
              // Clean the rate (remove dots, replace comma with dot)
              usdRate = parseFloat(rateText.replace(/\./g, '').replace(',', '.'));
              console.log(`📊 Found USD rate: ${rateText} -> ${usdRate}`);
            }
          }
        }
      });

      if (!usdRate || isNaN(usdRate)) {
        throw new Error('Could not extract USD rate from BI website');
      }

      // Validate rate is reasonable (15,000 - 20,000 IDR)
      if (usdRate < 15000 || usdRate > 20000) {
        throw new Error(`USD rate ${usdRate} is outside reasonable range (15,000 - 20,000)`);
      }

      console.log(`✅ Successfully scraped USD rate: ${usdRate}`);
      
      // Store in database
      await this.storeRate(usdRate);
      
      return usdRate;
    } catch (error) {
      console.error('❌ Failed to scrape BI rate:', error.message);
      throw error;
    }
  }

  /**
   * Store exchange rate in database
   * @param {number} rate - The exchange rate value
   * @returns {Promise<Object>} The stored rate record
   */
  async storeRate(rate) {
    try {
      const rateRecord = await this.ExchangeRate.create({
        currency_code: 'USD',
        rate: rate,
        source: 'Bank Indonesia',
        scraped_at: new Date()
      });

      console.log(`💾 Stored new rate: ${rate} at ${rateRecord.scraped_at}`);
      return rateRecord;
    } catch (error) {
      console.error('❌ Failed to store rate:', error.message);
      throw error;
    }
  }

  /**
   * Get current active exchange rate
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {Promise<Object|null>} The most recent rate record
   */
  async getCurrentRate(currency = 'USD') {
    try {
      const rate = await this.ExchangeRate.findOne({
        where: { currency_code: currency },
        order: [['scraped_at', 'DESC']]
      });

      if (rate) {
        console.log(`📈 Current ${currency} rate: ${rate.rate} (scraped at ${rate.scraped_at})`);
      } else {
        console.log(`⚠️ No ${currency} rate found in database`);
      }

      return rate;
    } catch (error) {
      console.error('❌ Failed to get current rate:', error.message);
      throw error;
    }
  }

  /**
   * Get historical exchange rates
   * @param {string} currency - Currency code (default: 'USD')
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Array>} Array of historical rates
   */
  async getHistoricalRates(currency = 'USD', days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const rates = await this.ExchangeRate.findAll({
        where: {
          currency_code: currency,
          scraped_at: {
            [require('sequelize').Op.gte]: cutoffDate
          }
        },
        order: [['scraped_at', 'ASC']]
      });

      console.log(`📊 Retrieved ${rates.length} historical ${currency} rates for last ${days} days`);
      return rates;
    } catch (error) {
      console.error('❌ Failed to get historical rates:', error.message);
      throw error;
    }
  }

  /**
   * Get the latest rate value (just the number)
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {Promise<number|null>} The latest rate value
   */
  async getLatestRateValue(currency = 'USD') {
    try {
      const rate = await this.getCurrentRate(currency);
      return rate ? parseFloat(rate.rate) : null;
    } catch (error) {
      console.error('❌ Failed to get latest rate value:', error.message);
      return null;
    }
  }
}

module.exports = ExchangeRateService;
