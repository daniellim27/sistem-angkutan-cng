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
const host = argv.host || process.env.HOST || '0.0.0.0';

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
const userRoutes = require("./routes/user.routes");
const driverExpenseRoutes = require("./routes/driverExpense.routes");
const instantBudgetRequestRoutes = require("./routes/instantBudgetRequest.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const driverRoutes = require("./routes/driver.routes");
const ocrRoutes = require("./routes/ocr.routes");
const webOcrRoutes = require("./routes/web/ocr.routes");
const notaBesarRoutes = require("./routes/notaBesar.routes");
const notaKecilRoutes = require("./routes/notaKecil.routes");
const webNotaKecilRoutes = require("./routes/web/notaKecil.routes");
const webNotaBesarRoutes = require("./routes/web/notaBesar.routes");
const imageUploadRoutes = require("./routes/imageUpload.routes");
const webImageUploadRoutes = require("./routes/web/imageUpload.routes");
const simpleImageUploadRoutes = require("./routes/simpleImageUpload.routes");

// === Import Exchange Rate Routes ===
const webExchangeRateRoutes = require("./routes/web/exchangeRates.routes");

// === Import Web Routes (NEW) ===
const webPurchaseOrderRoutes = require("./routes/web/purchaseOrder.routes");
const webDeliveryOrderRoutes = require("./routes/web/deliveryOrder.routes");
const webVehicleRoutes = require("./routes/web/vehicle.routes");
const webDriverRoutes = require("./routes/web/driver.routes");
const webUserRoutes = require("./routes/web/user.routes");
const webStockRoutes = require("./routes/web/stock.routes");
const webServiceRoutes = require("./routes/web/service.routes");
const webTireRoutes = require("./routes/web/tire.routes");
const webCashRoutes = require("./routes/web/cash.routes");
const webCashCoordinatorRoutes = require("./routes/web/cash-coordinator.routes");
const webRitaseRoutes = require("./routes/web/ritase.routes");
const webBukuKasRoutes = require("./routes/web/bukuKas.routes");
const webPaymentsRoutes = require("./routes/web/payments.routes");
const webExpenseRoutes = require("./routes/web/expense.routes");
const webInstantBudgetRequestRoutes = require("./routes/web/instantBudgetRequest.routes");
const webInfrastructureRoutes = require("./routes/web/infrastructure.routes");
const webVehicleExpenseRoutes = require("./routes/vehicleExpenseRoutes");
const legacyRitasePaymentsRoutes = require("./routes/web/ritase.payments.legacy.route");
const utilsRoutes = require("./routes/utils.routes");
const webDepositGroupRoutes = require("./routes/web/depositGroup.routes");
const trackingRoutes = require("./routes/tracking.routes");
const gasStationRoutes = require("./routes/gasStation.routes");
const customerRoutes = require("./routes/customer.routes");
const bardiScrapingRoutes = require("./routes/bardiScraping");
const receiptOcrRoutes = require("./routes/receiptOcr");
const cctvMonitoringRoutes = require("./routes/cctvMonitoring.routes");
console.log('✓ CCTV monitoring routes module loaded:', typeof cctvMonitoringRoutes);
const scheduledScrapingService = require("./services/scheduledScraper");
const cctvScheduler = require("./services/cctvScheduler");
const { scheduleDailyCleanup, initCloudinaryFromEnv, cleanupCloudinaryScreenshotsOnce } = require("./services/cctvScreenshotRetention");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: Allow specific origins and all origins for development
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000', 
  'https://frontend-angkutan.onrender.com',
  'https://backend-angkutan.onrender.com'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Check allowed origins in production
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow all origins for now (can be restricted later)
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'ngrok-skip-browser-warning'
    ],
    exposedHeaders: ['X-Total-Count', 'Content-Range']
  })
);

// Setup middleware (json parsing, etc - but skip CORS since we handle it above)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('❌ Invalid JSON received:', error.body);
    console.error('❌ JSON Error:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      details: error.message
    });
  }
  next(error);
});

// Test database connection and run migrations
const MigrationRunner = require('./utils/migrationRunner');

async function initializeDatabase() {
  try {
    // Test basic connection
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
    
    // Check and run migrations automatically
    if (process.env.AUTO_MIGRATE !== 'false') {
      console.log("🔄 Starting database migrations...");
      const migrationRunner = new MigrationRunner();
      try {
        await migrationRunner.runMigrations();
        console.log("✅ Database migrations completed successfully.");
      } catch (migrationError) {
        console.error("⚠️ Migration failed, but continuing with server startup:", migrationError.message);
        // Don't exit, just log the error and continue
      } finally {
        await migrationRunner.close();
      }
    } else {
      console.log("⚠️ Auto-migration disabled. Run 'npm run migrate' manually if needed.");
    }
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
    console.log("💡 Server will start anyway, but database features may not work properly");
    // Don't exit, let the server start anyway
  }
}

  // Basic health check route (works even if database fails)
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Admin user creation endpoint
app.post("/api/admin/create-admin", async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const { User } = require('./models');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.json({ 
        success: true, 
        message: 'Admin user already exists',
        adminId: existingAdmin.id 
      });
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('awak1234', 10);
    const adminUser = await User.create({
      username: 'admin',
      password_hash: hashedPassword,
      role: 'admin'
    });
    
    res.json({ 
      success: true, 
      message: 'Admin user created successfully',
      adminId: adminUser.id 
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

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
          vehicles: "/api/web/vehicles",
          users: "/api/web/users",
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
      tracking: {
        api: "/api/tracking",
        web: "/api/web/tracking",
      },
      bardi_scraping: {
        test_session: "/api/bardi/test-session",
        devices: "/api/bardi/devices",
        user_info: "/api/bardi/user-info",
      },
    })
  });

  // Test endpoint for CORS debugging
  app.get("/api/test-cors", (req, res) => {
    res.json({
      success: true,
      message: "CORS is working!",
      origin: req.headers.origin,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  });

  // === Existing Mobile Routes (UNCHANGED) ===
  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/purchase-orders", purchaseOrderRoutes);
  app.use("/api/delivery-orders", deliveryOrderRoutes);
  app.use("/api/driver-expenses", driverExpenseRoutes);
  app.use("/api/budget-requests", instantBudgetRequestRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/ocr", ocrRoutes);
  app.use("/api", notaBesarRoutes);
  app.use("/api", notaKecilRoutes);
  app.use("/api/image-upload", imageUploadRoutes);
  app.use("/api/simple-upload", simpleImageUploadRoutes);

  // Static uploads
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // === New Web Routes (ADDED) ===
  app.use("/api/web/purchase-orders", webPurchaseOrderRoutes);
  app.use("/api/web/delivery-orders", webDeliveryOrderRoutes);
  app.use("/api/web/vehicles", webVehicleRoutes);
  app.use("/api/web/drivers", webDriverRoutes);
  app.use("/api/web/users", webUserRoutes);
  app.use("/api/web/stock", webStockRoutes);
  app.use("/api/web/services", webServiceRoutes);
  app.use("/api/web/tires", webTireRoutes);
  app.use("/api/web/cash", webCashRoutes);
  app.use("/api/web/cash-coordinator", webCashCoordinatorRoutes);
  app.use("/api/web/ritase", webRitaseRoutes);
  app.use("/api/web/buku-kas", webBukuKasRoutes);
  app.use("/api/web/payments", webPaymentsRoutes);
  app.use("/api/web/expenses", webExpenseRoutes);
  app.use("/api/web/budget-requests", webInstantBudgetRequestRoutes);
  app.use("/api/web/infrastructure", webInfrastructureRoutes);
  app.use("/api/web/vehicle-expense-cash", webVehicleExpenseRoutes);
  app.use("/api/web/ritase-payments", legacyRitasePaymentsRoutes);
  app.use("/api/web/deposit-groups", webDepositGroupRoutes);
  app.use("/api/web/utils", utilsRoutes);
  app.use("/api/web/exchange-rates", webExchangeRateRoutes);
  app.use("/api/web/ocr", webOcrRoutes);

  // Add tracking routes for both web and mobile access
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/web/tracking", trackingRoutes);

  // Add gas station routes
  app.use("/api/gas-stations", gasStationRoutes);
  app.use("/api/web/gas-stations", gasStationRoutes);

  // Add customer routes
  app.use("/api/customers", customerRoutes);
  app.use("/api/web/customers", customerRoutes);
  app.use("/api/web/nota-kecils", webNotaKecilRoutes);
  app.use("/api/web", webNotaBesarRoutes);
  app.use("/api/web/image-upload", webImageUploadRoutes);

  // Test routes (only in development)
  if (process.env.NODE_ENV === 'development') {
    const ocrTestRoutes = require("./routes/test/ocrTest.routes");
    app.use("/api/test/ocr", ocrTestRoutes);
  }

  // Add Bardi scraping routes
  app.use("/api/bardi", bardiScrapingRoutes);
  app.use("/api/web/bardi", bardiScrapingRoutes);

  // Add receipt OCR routes (for mobile app)
  app.use("/api/receipt-ocr", receiptOcrRoutes);
  // Also register for web admin interface
  app.use("/api/web/receipt-ocr", receiptOcrRoutes);

  // Add CCTV monitoring routes
  console.log('📹 Registering CCTV monitoring routes...');
  app.use("/api/cctv-monitoring", cctvMonitoringRoutes);
  app.use("/api/web/cctv-monitoring", cctvMonitoringRoutes);
  console.log('✓ CCTV routes registered at /api/cctv-monitoring and /api/web/cctv-monitoring');

  app.use("/api/utils", utilsRoutes);

  // Error handling middleware
  app.use(errorHandler);

  // Start HTTP server
  startServer();
}).catch(err => {
  console.error("💥 Database initialization failed, but starting server anyway:", err);
  // Don't exit, start the server even if database fails
  startServer();
});

// Function to start the server
function startServer() {
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
    
    // Start GPS tracking service
    if (process.env.INOVATRACKS_USERNAME && process.env.INOVATRACKS_PASSWORD) {
      scheduledScrapingService.start();
      scheduledScrapingService.startCleanupSchedule();
      console.log("🗺️ GPS tracking service initialized");
    } else {
      console.log("⚠️ GPS tracking service not started - missing Inovatracks credentials");
    }

    // Start CCTV Auto-Capture Scheduler (enabled by default)
    if (process.env.ENABLE_CCTV_SCHEDULER !== 'false') {
      console.log("🎬 Starting CCTV Auto-Capture Scheduler...");
      cctvScheduler.start();
    } else {
      console.log("ℹ️ CCTV Scheduler disabled (ENABLE_CCTV_SCHEDULER set to 'false')");
    }

    // Start daily Cloudinary cleanup schedule and one immediate run on startup
    try {
      initCloudinaryFromEnv();
      scheduleDailyCleanup();
      // Do an initial cleanup asynchronously (non-blocking)
      setTimeout(() => {
        cleanupCloudinaryScreenshotsOnce().catch(e => {
          console.error('Initial Cloudinary cleanup failed:', e?.message || e);
        });
      }, 5000);
      console.log("🧹 CCTV Cloudinary cleanup scheduling initialized");
    } catch (e) {
      console.error("⚠️ Failed to initialize Cloudinary cleanup:", e?.message || e);
    }
  });
}

// Add process-level error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Handle busboy errors specifically
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('Unexpected end of form')) {
    console.error('📸 Busboy error caught at process level:', error.message);
    // Don't exit, this is a known issue
    return;
  }
  console.error('❌ Uncaught Exception:', error);
});
