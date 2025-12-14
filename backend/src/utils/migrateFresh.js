// backend/src/utils/migrateFresh.js
const fs = require("fs");
const path = require("path");
const db = require("./db"); // Pastikan path ini benar
const MigrationRunner = require("./migrationRunner");

/**
 * Menjalankan migrasi "fresh": Menghapus seluruh skema database
 * dan membangunnya kembali dari file SQL.
 * Ini adalah tindakan destruktif dan hanya untuk lingkungan pengembangan.
 */
const run = async () => {
  const client = await db.pool.connect(); // Gunakan client untuk transaksi

  try {
    console.log("🗑️  Wiping the public schema... (This will delete EVERYTHING)");

    // Pendekatan yang lebih andal: Hapus dan buat ulang seluruh skema 'public'.
    // Ini secara otomatis menangani semua dependensi (tabel, tipe ENUM, sekuens, dll.)
    // Anda tidak perlu lagi mengelola urutan DROP TABLE secara manual.
    const wipeSQL = `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      COMMENT ON SCHEMA public IS 'standard public schema';
    `;

    await client.query(wipeSQL);
    console.log("✅ Schema wiped and recreated successfully");

    console.log("🔄 Running full JS/SQL migrations via MigrationRunner...");

    // Use the centralized MigrationRunner so schema matches production (including SPBG columns)
    const runner = new MigrationRunner();
    await runner.runMigrations();
    await runner.close();

    console.log("✅ All migrations executed successfully");

    console.log("🌱 Running seeders from seeder.sql...");
    const seederSQL = fs
      .readFileSync(path.resolve(__dirname, "../migrations/seeder.sql"), "utf-8");
    await client.query(seederSQL);
    console.log("✅ Seeders executed successfully");

    console.log("🎉 Fresh migration with seed completed successfully!");
    console.log("🔐 Now you may need to run 'npm run hash-passwords' to hash any plaintext passwords in the seeder.");
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration fresh error:", err.stack);
    process.exit(1);
  } finally {
    client.release(); // Selalu lepaskan client kembali ke pool
  }
};

run();
