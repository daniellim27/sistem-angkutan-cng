// Load environment variables
require('dotenv').config();

const { sequelize, NotaKecil } = require('./src/models');

async function checkPhotoStructure() {
  console.log('🔍 Checking nota kecils photo structure in database...\n');

  try {
    // Get the latest 3 nota kecils
    const notaKecils = await NotaKecil.findAll({
      order: [['created_at', 'DESC']],
      limit: 3,
      attributes: [
        'id',
        'delivery_order_id', 
        'pressure_bar_photos',
        'temperature_photos',
        'stan_awal_photos',
        'stan_akhir_photos'
      ]
    });

    console.log(`Found ${notaKecils.length} nota kecils:\n`);

    notaKecils.forEach((nota, index) => {
      console.log(`📋 Nota Kecil ${index + 1} (ID: ${nota.id}):`);
      console.log(`   Delivery Order ID: ${nota.delivery_order_id}`);
      console.log(`   Pressure Bar Photos:`, JSON.stringify(nota.pressure_bar_photos, null, 2));
      console.log(`   Temperature Photos:`, JSON.stringify(nota.temperature_photos, null, 2));
      console.log(`   Stan Awal Photos:`, JSON.stringify(nota.stan_awal_photos, null, 2));
      console.log(`   Stan Akhir Photos:`, JSON.stringify(nota.stan_akhir_photos, null, 2));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking photo structure:', error);
  } finally {
    await sequelize.close();
  }
}

checkPhotoStructure();
