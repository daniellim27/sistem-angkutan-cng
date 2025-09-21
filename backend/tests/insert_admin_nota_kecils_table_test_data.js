// Script to insert additional nota kecils for admin delivery order JACK-2025-001
// This will populate the nota kecils table with more data for testing the admin interface
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Check if required environment variables are set
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these variables or create a .env file in the backend directory');
  process.exit(1);
}

const db = require(path.join(__dirname, '../src/utils/db'));

const insertAdminNotaKecilsTestData = async () => {
  try {
    console.log("🚀 Starting Admin Nota Kecils Test Data insertion...");
    console.log("📋 This will populate nota kecils for delivery order JACK-2025-001");
    console.log("👨‍💼 To make the admin table more populated for testing");

    // 1. Get the delivery order ID for JACK-2025-001
    console.log("📦 Getting delivery order JACK-2025-001...");
    const doResult = await db.pool.query(`
      SELECT id, do_number, driver_id, status 
      FROM delivery_orders 
      WHERE do_number = 'JACK-2025-001'
    `);

    if (doResult.rows.length === 0) {
      throw new Error("Delivery order JACK-2025-001 not found. Please run insert_jack_driver_admin_test_data.js first.");
    }

    const deliveryOrder = doResult.rows[0];
    console.log(`✅ Found delivery order: ID ${deliveryOrder.id}, DO Number: ${deliveryOrder.do_number}, Status: ${deliveryOrder.status}`);

    // 2. Clean up existing nota kecils for this delivery order
    console.log("🧹 Cleaning up existing nota kecils for this delivery order...");
    await db.pool.query(`
      DELETE FROM nota_kecils 
      WHERE delivery_order_id = $1
    `, [deliveryOrder.id]);
    console.log("✅ Cleaned up existing nota kecils");

    // 3. Create multiple nota kecils with realistic data
    console.log("📄 Creating multiple nota kecils with realistic test data...");
    
    const notaKecilsData = [
      // Morning delivery - Customer 1
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 0,
        customer_name: "PT. Energi Mandiri",
        customer_address: "Jl. Raya Industri No. 15, Jakarta Utara",
        stan_awal: 1250.500,
        stan_akhir: 1258.750,
        tekanan_operasi: 4.2,
        temperatur_operasi: 28.5,
        Vt: 8.250,
        k: 0.987654,
        V: 8.148,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_001.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_001.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_001.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_001.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.95,
          stan_akhir: 0.92,
          tekanan_operasi: 0.88,
          temperatur_operasi: 0.90
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        driver_notes: "Delivery completed successfully",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      // Afternoon delivery - Customer 2
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 1,
        customer_name: "CV. Gas Sejahtera",
        customer_address: "Jl. Perdagangan No. 42, Jakarta Timur",
        stan_awal: 1258.750,
        stan_akhir: 1265.200,
        tekanan_operasi: 4.1,
        temperatur_operasi: 29.2,
        Vt: 6.450,
        k: 0.985432,
        V: 6.356,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_002.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_002.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_002.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_002.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.93,
          stan_akhir: 0.89,
          tekanan_operasi: 0.91,
          temperatur_operasi: 0.87
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        driver_notes: "Smooth delivery, no issues",
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      },
      // Evening delivery - Customer 3
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 2,
        customer_name: "UD. Bahan Bakar Jaya",
        customer_address: "Jl. Pasar Minggu No. 88, Jakarta Selatan",
        stan_awal: 1265.200,
        stan_akhir: 1270.800,
        tekanan_operasi: 4.3,
        temperatur_operasi: 27.8,
        Vt: 5.600,
        k: 0.989123,
        V: 5.539,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_003.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_003.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_003.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_003.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.96,
          stan_akhir: 0.94,
          tekanan_operasi: 0.90,
          temperatur_operasi: 0.92
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        driver_notes: "Customer requested early delivery",
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      // Night delivery - Customer 4
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 3,
        customer_name: "PT. Distribusi Gas Indonesia",
        customer_address: "Jl. Cakung Raya No. 156, Jakarta Timur",
        stan_awal: 1270.800,
        stan_akhir: 1278.150,
        tekanan_operasi: 4.0,
        temperatur_operasi: 26.5,
        Vt: 7.350,
        k: 0.991234,
        V: 7.295,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_004.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_004.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_004.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_004.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.91,
          stan_akhir: 0.88,
          tekanan_operasi: 0.89,
          temperatur_operasi: 0.93
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        driver_notes: "Night delivery completed",
        created_at: new Date(Date.now() - 30 * 60 * 1000)
      },
      // Additional delivery - Customer 5
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 4,
        customer_name: "CV. Sumber Energi",
        customer_address: "Jl. Kemang Raya No. 77, Jakarta Selatan",
        stan_awal: 1278.150,
        stan_akhir: 1282.900,
        tekanan_operasi: 4.4,
        temperatur_operasi: 28.0,
        Vt: 4.750,
        k: 0.986789,
        V: 4.687,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_005.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_005.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_005.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_005.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.94,
          stan_akhir: 0.91,
          tekanan_operasi: 0.92,
          temperatur_operasi: 0.89
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        driver_notes: "Final delivery of the day",
        created_at: new Date(Date.now() - 15 * 60 * 1000)
      },
      // Another delivery - Customer 6
      {
        delivery_order_id: deliveryOrder.id,
        customer_location_index: 5,
        customer_name: "PT. Gas Mandiri Sejahtera",
        customer_address: "Jl. Gatot Subroto No. 234, Jakarta Pusat",
        stan_awal: 1282.900,
        stan_akhir: 1287.300,
        tekanan_operasi: 4.2,
        temperatur_operasi: 27.5,
        Vt: 4.400,
        k: 0.988456,
        V: 4.349,
        pressure_bar_photos: ['/uploads/nota_kecil/pressure_006.jpg'],
        temperature_photos: ['/uploads/nota_kecil/temp_006.jpg'],
        stan_awal_photos: ['/uploads/nota_kecil/stan_awal_006.jpg'],
        stan_akhir_photos: ['/uploads/nota_kecil/stan_akhir_006.jpg'],
        ocr_confidence_scores: {
          stan_awal: 0.92,
          stan_akhir: 0.90,
          tekanan_operasi: 0.87,
          temperatur_operasi: 0.91
        },
        ocr_processing_status: 'completed',
        ocr_processed_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        driver_confirmed: true,
        driver_confirmed_at: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        driver_notes: "Quick delivery, customer was ready",
        created_at: new Date(Date.now() - 10 * 60 * 1000)
      }
    ];

    // Insert all nota kecils
    for (let i = 0; i < notaKecilsData.length; i++) {
      const notaKecil = notaKecilsData[i];
      console.log(`📄 Inserting nota kecil ${i + 1}/${notaKecilsData.length} for ${notaKecil.customer_name}...`);
      
      await db.pool.query(`
        INSERT INTO nota_kecils (
          delivery_order_id, customer_location_index, customer_name, customer_address,
          stan_awal, stan_akhir, tekanan_operasi, temperatur_operasi,
          "Vt", "k", "V",
          pressure_bar_photos, temperature_photos, stan_awal_photos, stan_akhir_photos,
          ocr_confidence_scores, ocr_processing_status, ocr_processed_at,
          driver_confirmed, driver_confirmed_at, driver_notes,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        notaKecil.delivery_order_id,
        notaKecil.customer_location_index,
        notaKecil.customer_name,
        notaKecil.customer_address,
        notaKecil.stan_awal,
        notaKecil.stan_akhir,
        notaKecil.tekanan_operasi,
        notaKecil.temperatur_operasi,
        notaKecil.Vt,
        notaKecil.k,
        notaKecil.V,
        JSON.stringify(notaKecil.pressure_bar_photos),
        JSON.stringify(notaKecil.temperature_photos),
        JSON.stringify(notaKecil.stan_awal_photos),
        JSON.stringify(notaKecil.stan_akhir_photos),
        JSON.stringify(notaKecil.ocr_confidence_scores),
        notaKecil.ocr_processing_status,
        notaKecil.ocr_processed_at,
        notaKecil.driver_confirmed,
        notaKecil.driver_confirmed_at,
        notaKecil.driver_notes,
        notaKecil.created_at,
        new Date()
      ]);
      
      console.log(`✅ Inserted nota kecil for ${notaKecil.customer_name} (Vt: ${notaKecil.Vt}, V: ${notaKecil.V})`);
    }

    // 4. Verify the insertion
    console.log("🔍 Verifying nota kecils insertion...");
    const verifyResult = await db.pool.query(`
      SELECT 
        id, customer_name, customer_location_index,
        stan_awal, stan_akhir, "Vt", "k", "V",
        driver_confirmed, created_at
      FROM nota_kecils 
      WHERE delivery_order_id = $1 
      ORDER BY created_at ASC
    `, [deliveryOrder.id]);

    console.log(`✅ Successfully inserted ${verifyResult.rows.length} nota kecils for delivery order ${deliveryOrder.do_number}`);
    console.log("\n📊 Summary of inserted nota kecils:");
    console.log("=".repeat(80));
    
    verifyResult.rows.forEach((nota, index) => {
      const selisih = parseFloat(nota.stan_akhir) - parseFloat(nota.stan_awal);
      console.log(`${index + 1}. ${nota.customer_name} (Location ${nota.customer_location_index})`);
      console.log(`   Stan: ${nota.stan_awal} → ${nota.stan_akhir} (Selisih: ${selisih.toFixed(3)})`);
      console.log(`   Vt: ${nota.Vt}, k: ${nota.k}, V: ${nota.V}`);
      console.log(`   Confirmed: ${nota.driver_confirmed ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(nota.created_at).toLocaleString('id-ID')}`);
      console.log("-".repeat(60));
    });

    // Calculate totals
    const totalSelisih = verifyResult.rows.reduce((sum, nota) => {
      return sum + (parseFloat(nota.stan_akhir) - parseFloat(nota.stan_awal));
    }, 0);
    
    const totalV = verifyResult.rows.reduce((sum, nota) => {
      return sum + parseFloat(nota.V || 0);
    }, 0);

    console.log(`\n📈 TOTALS:`);
    console.log(`   Total Selisih: ${totalSelisih.toFixed(3)} m³`);
    console.log(`   Total V (Final Volume): ${totalV.toFixed(3)} m³`);
    console.log(`   Average k (Correction Factor): ${(verifyResult.rows.reduce((sum, nota) => sum + parseFloat(nota.k || 0), 0) / verifyResult.rows.length).toFixed(6)}`);

    console.log("\n🎉 Admin Nota Kecils Test Data insertion completed successfully!");
    console.log("💡 You can now view the populated table in the admin web interface");

  } catch (error) {
    console.error("❌ Error inserting admin nota kecils test data:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the script
insertAdminNotaKecilsTestData()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
