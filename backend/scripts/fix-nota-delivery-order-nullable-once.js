// One-off script to drop NOT NULL from nota_kecils.delivery_order_id
const db = require('../src/utils/db');

(async () => {
  try {
    console.log('🔄 Dropping NOT NULL constraint on nota_kecils.delivery_order_id...');
    await db.pool.query(
      'ALTER TABLE nota_kecils ALTER COLUMN delivery_order_id DROP NOT NULL;'
    );
    console.log('✅ delivery_order_id is now NULLABLE in nota_kecils');
  } catch (e) {
    console.error('❌ Failed to drop NOT NULL on nota_kecils.delivery_order_id:', e);
  } finally {
    process.exit(0);
  }
})();


