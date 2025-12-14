// One-off script to drop NOT NULL from cctv_sessions.delivery_order_id
const db = require('../src/utils/db');

(async () => {
  try {
    console.log('🔄 Dropping NOT NULL constraint on cctv_sessions.delivery_order_id...');
    await db.pool.query(
      'ALTER TABLE cctv_sessions ALTER COLUMN delivery_order_id DROP NOT NULL;'
    );
    console.log('✅ delivery_order_id is now NULLABLE in cctv_sessions');
  } catch (e) {
    console.error('❌ Failed to drop NOT NULL on cctv_sessions.delivery_order_id:', e);
  } finally {
    process.exit(0);
  }
})();


