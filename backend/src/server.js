// server.js
require("dotenv").config();

// Polyfill for File API to fix undici compatibility issues
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this._chunks = chunks;
    }
    
    stream() {
      return new ReadableStream({
        start(controller) {
          for (const chunk of this._chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        }
      });
    }
    
    arrayBuffer() {
      return Promise.resolve(Buffer.concat(this._chunks));
    }
    
    text() {
      return Promise.resolve(Buffer.concat(this._chunks).toString());
    }
  };
}

const minimist = require("minimist");

const admin = require("./services/firebase");
const argv = minimist(process.argv.slice(2));
const host = argv.host || process.env.HOST || (process.env.NODE_ENV === 'development' ? '0.0.0.0' : 'localhost');

const express = require("express");
const setupMiddleware = require("./middlewares/setup.middleware");
const errorHandler = require("./middlewares/error.middleware");
const { sequelize } = require("./models");
const path = require("path");
const cors = require("cors");

// === Import Existing Routes (MOBILE) ===
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const purchaseOrderRoutes = require("./routes/purchaseOrder.routes");
const deliveryOrderRoutes = require("./routes/deliveryOrder.routes");
const bigDeliveryOrderRoutes = require("./routes/bigDeliveryOrder.routes");
const userRoutes = require("./routes/user.routes");
const driverExpenseRoutes = require("./routes/driverExpense.routes");
const budgetRequestRoutes = require("./routes/budgetRequest.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const driverRoutes = require("./routes/driver.routes");

// === Import IoT Routes ===
const iotRoutes = require("./routes/iot.routes");

// === Import Exchange Rate Routes ===
const webExchangeRateRoutes = require("./routes/web/exchangeRates.routes");

// === Import Web Routes (NEW) ===
const webPurchaseOrderRoutes = require("./routes/web/purchaseOrder.routes");
const webDeliveryOrderRoutes = require("./routes/web/deliveryOrder.routes");
const webBigDeliveryOrderRoutes = require("./routes/web/bigDeliveryOrder.routes");
const webVehicleRoutes = require("./routes/web/vehicle.routes");
const webDriverRoutes = require("./routes/web/driver.routes");
const webStockRoutes = require("./routes/web/stock.routes");
const webServiceRoutes = require("./routes/web/service.routes");
const webTireRoutes = require("./routes/web/tire.routes");
const webCashRoutes = require("./routes/web/cash.routes");
const webCashCoordinatorRoutes = require("./routes/web/cash-coordinator.routes");
const webRitaseRoutes = require("./routes/web/ritase.routes");
const webBukuKasRoutes = require("./routes/web/bukuKas.routes");
const webPaymentsRoutes = require("./routes/web/payments.routes");
const webExpenseRoutes = require("./routes/web/expense.routes");
const webBudgetRequestRoutes = require("./routes/web/budgetRequest.routes");
const webInfrastructureRoutes = require("./routes/web/infrastructure.routes");
const webVehicleExpenseRoutes = require("./routes/vehicleExpenseRoutes");
const legacyRitasePaymentsRoutes = require("./routes/web/ritase.payments.legacy.route");
const utilsRoutes = require("./routes/utils.routes");
const webDepositGroupRoutes = require("./routes/web/depositGroup.routes");
const trackingRoutes = require("./routes/tracking.routes");
const gasStationRoutes = require("./routes/gasStation.routes");
const scheduledScrapingService = require("./services/scheduledScraper");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: Allow all origins for debugging
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Setup middleware (cors, json, etc)
setupMiddleware(app);

// Test database connection and run migrations
const MigrationRunner = require('./utils/migrationRunner');

async function initializeDatabase() {
  try {
    // Test basic connection
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
    
    // Check and run migrations automatically
    if (process.env.AUTO_MIGRATE !== 'false') {
      const migrationRunner = new MigrationRunner();
      try {
        await migrationRunner.runMigrations();
      } finally {
        await migrationRunner.close();
      }
    } else {
      console.log("⚠️ Auto-migration disabled. Run 'npm run migrate' manually if needed.");
    }
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
    console.log("💡 Try running 'npm run migrate' manually to fix database issues");
    process.exit(1);
  }
}

// Initialize database before starting server
initializeDatabase().then(() => {
  // Basic route
  app.get("/", (req, res) => {
    res.json({
      message: "Angkutan API (Sequelize) is running!",
      endpoints: {
        mobile: {
          purchase_orders: "/api/purchase-orders",
          delivery_orders: "/api/delivery-orders",
          vehicles: "/api/vehicles",
        },
        web: {
          purchase_orders: "/api/web/purchase-orders",
          delivery_orders: "/api/web/delivery-orders",
          big_delivery_orders: "/api/web/big-delivery-orders",
          vehicles: "/api/web/vehicles",
          stock: "/api/web/stock",
          infrastructure: "/api/web/infrastructure",
          services: "/api/web/services",
          tires: "/api/web/tires",
          cash: "/api/web/cash",
          ritase: "/api/web/ritase",
          buku_kas: "/api/web/buku-kas",
          payments: "/api/web/payments",
        },
        exchange_rates: "/api/web/exchange-rates",
        tracking: "/api/web/tracking",
      },
      iot: {
        data: "/api/v1/iot/data",
        latest: "/api/v1/iot/data/:delivery_order_id/latest",
        history: "/api/v1/iot/data/:delivery_order_id/history",
        sensor_data: "/api/web/delivery-orders/:id/sensordata",
      },
      tracking: {
        api: "/api/tracking",
        web: "/api/web/tracking",
      },
    })
  });

  // === Existing Mobile Routes (UNCHANGED) ===
  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/purchase-orders", purchaseOrderRoutes);
  app.use("/api/delivery-orders", deliveryOrderRoutes);
  app.use("/api/big-delivery-orders", bigDeliveryOrderRoutes);
  app.use("/api/driver-expenses", driverExpenseRoutes);
  app.use("/api/budget-requests", budgetRequestRoutes);
  app.use("/api/drivers", driverRoutes);

  // === IoT Routes ===
  app.use("/api/v1/iot", iotRoutes);

  // Static uploads
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // === New Web Routes (ADDED) ===
  app.use("/api/web/purchase-orders", webPurchaseOrderRoutes);
  app.use("/api/web/delivery-orders", webDeliveryOrderRoutes);
  app.use("/api/web/big-delivery-orders", webBigDeliveryOrderRoutes);
  app.use("/api/web/vehicles", webVehicleRoutes);
  app.use("/api/web/drivers", webDriverRoutes);
  app.use("/api/web/stock", webStockRoutes);
  app.use("/api/web/services", webServiceRoutes);
  app.use("/api/web/tires", webTireRoutes);
  app.use("/api/web/cash", webCashRoutes);
  app.use("/api/web/cash-coordinator", webCashCoordinatorRoutes);
  app.use("/api/web/ritase", webRitaseRoutes);
  app.use("/api/web/buku-kas", webBukuKasRoutes);
  app.use("/api/web/payments", webPaymentsRoutes);
  app.use("/api/web/expenses", webExpenseRoutes);
  app.use("/api/web/budget-requests", webBudgetRequestRoutes);
  app.use("/api/web/infrastructure", webInfrastructureRoutes);
  app.use("/api/web/vehicle-expense-cash", webVehicleExpenseRoutes);
  app.use("/api/web/ritase-payments", legacyRitasePaymentsRoutes);
  app.use("/api/web/deposit-groups", webDepositGroupRoutes);
  app.use("/api/web/utils", utilsRoutes);
  app.use("/api/web/exchange-rates", webExchangeRateRoutes);

  // Add tracking routes for both web and mobile access
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/web/tracking", trackingRoutes);

  // Add gas station routes
  app.use("/api/gas-stations", gasStationRoutes);
  app.use("/api/web/gas-stations", gasStationRoutes);

  app.use("/api/utils", utilsRoutes);

  // Error handling middleware
  app.use(errorHandler);

  // Start HTTP server
  app.listen(PORT, host, () => {
    console.log(`🚀 Server running on http://${host}:${PORT}`);
    console.log(`📋 Environment: PORT=${process.env.PORT || 'not set'}, Using port: ${PORT}`);
    console.log(`🌐 CORS enabled for: localhost:3001, localhost:3000, and all origins`);
    console.log(
      `📱 Mobile API: /api/purchase-orders, /api/delivery-orders, /api/vehicles`
    );
    console.log(
      "🌐 Web API: /api/web/purchase-orders, /api/web/delivery-orders, /api/web/vehicles, " +
        "/api/web/stock, /api/web/infrastructure, /api/web/services, /api/web/tires, /api/web/payments, /api/web/tracking"
    );
    console.log("📍 GPS Tracking API: /api/tracking, /api/web/tracking");
    console.log("🔗 IoT API: /api/v1/iot/data, /api/web/delivery-orders/:id/sensordata");
    
    // Start GPS tracking service
    if (process.env.INOVATRACKS_USERNAME && process.env.INOVATRACKS_PASSWORD) {
      scheduledScrapingService.start();
      scheduledScrapingService.startCleanupSchedule();
      console.log("🗺️ GPS tracking service initialized");
    } else {
      console.log("⚠️ GPS tracking service not started - missing Inovatracks credentials");
    }
  });
}).catch(err => {
  console.error("💥 Server startup failed:", err);
  process.exit(1);
});
