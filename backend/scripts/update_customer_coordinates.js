// Update existing customers with coordinates using the existing geocoding system
const { Customer } = require('../src/models');
const { scrapeLocationCoordinates } = require('../src/utils/locationScraper');

async function updateCustomersWithCoordinates() {
  try {
    console.log('🔍 Starting coordinate update for existing customers...');
    
    // Get customers without coordinates
    const customers = await Customer.findAll({
      where: {
        latitude: null,
        longitude: null
      },
      order: [['customer_name', 'ASC']]
    });

    if (customers.length === 0) {
      console.log('✅ No customers need coordinate updates');
      return { success: true, updated: 0, message: 'All customers already have coordinates' };
    }

    console.log(`📊 Found ${customers.length} customers without coordinates`);
    
    let updated = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        console.log(`🔍 Geocoding: ${customer.customer_name} - ${customer.location}`);
        
        // Use existing geocoding function
        const coords = await scrapeLocationCoordinates(customer.location);
        
        if (coords && coords.lat && coords.lng) {
          // Update customer with coordinates
          await customer.update({
            latitude: coords.lat,
            longitude: coords.lng
          });
          
          console.log(`✅ Updated ${customer.customer_name}: ${coords.lat}, ${coords.lng}`);
          updated++;
        } else {
          console.log(`❌ No coordinates found for ${customer.customer_name}: ${customer.location}`);
          failed++;
        }
        
        // Add delay to be respectful to the geocoding service
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error geocoding ${customer.customer_name}:`, error.message);
        failed++;
      }
    }

    const result = {
      success: true,
      total: customers.length,
      updated,
      failed,
      message: `Updated ${updated} customers with coordinates, ${failed} failed`
    };

    console.log('🎯 Coordinate update completed:', result);
    return result;

  } catch (error) {
    console.error('❌ Error updating customer coordinates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  updateCustomersWithCoordinates()
    .then(result => {
      console.log('Final result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

module.exports = { updateCustomersWithCoordinates };
