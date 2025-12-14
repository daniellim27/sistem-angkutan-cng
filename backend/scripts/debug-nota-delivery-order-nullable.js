// Simple debug script to inspect nullability of nota_kecils.delivery_order_id
const db = require('../src/utils/db');

(async () => {
  try {
    const res = await db.pool.query(
      "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'nota_kecils' AND column_name = 'delivery_order_id'"
    );
    console.log('nota_kecils.delivery_order_id:', res.rows);
  } catch (e) {
    console.error('Error checking column definition:', e);
  } finally {
    process.exit(0);
  }
})();


