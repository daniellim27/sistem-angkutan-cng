"use strict";

const { Sequelize } = require("sequelize");

// Load all model setup functions
const setupUserModel = require("./user.model");
const setupVehicleModel = require("./vehicle.model");
const setupDriverProfileModel = require("./driverProfile.model");
const setupAdminProfileModel = require("./adminProfile.model");
const setupPurchaseOrderModel = require("./purchaseOrder.model");
const setupDeliveryOrderModel = require("./deliveryOrder.model");
const setupDriverExpenseModel = require("./driverExpense.model");
const setupVehicleServiceModel = require("./vehicleService.model");
// NEW: Stock and Service Management Models
const setupStockCategoryModel = require("./stockCategory.model");
const setupStockItemModel = require("./stockItem.model");
const setupStockTransactionModel = require("./stockTransaction.model");
const setupStockBatchModel = require("./stockBatch.model");
const setupServiceItemModel = require("./serviceItem.model");

// Create model files for new Ritase tables
const setupDeliveryOrderPaymentsModel = require("./deliveryOrderPayments.model");
const setupDeliveryOrderInvoicesModel = require("./deliveryOrderInvoices.model");
const setupDeliveryOrderAdjustmentsModel = require("./deliveryOrderAdjustments.model");
const setupDeliveryOrderPaymentHistoryModel = require("./deliveryOrderPaymentHistory.model");
const setupSystemSettingsModel = require("./systemSettings.model");

const setupTireInventoryModel = require("./tireInventory.model");
const setupVehicleTireModel = require("./vehicleTire.model");
const setupTireInspectionModel = require("./tireInspection.model");
const setupTireInstanceModel = require("./tireInstance.model");

const setupCashCategoryModel = require("./cashCategory.model");
const setupCashTransactionModel = require("./cashTransaction.model");

const setupDepositGroupModel = require("./depositGroup.model");
const setupDepositGroupMemberModel = require("./depositGroupMember.model");

// GPS Tracking Model
const setupDriverLocationModel = require("./driverLocation.model");

// Gas Station Model
const setupGasStationModel = require("./gasStation.model");

// NEW: Exchange Rate Model for JISDOR scraping
const setupExchangeRateModel = require("./exchangeRate.model");

// NEW: Budget Request Model (re-added for instant approval)
const setupBudgetRequestModel = require("./budgetRequest.model");

// NEW: OCR Result Model
const setupOCRResultModel = require("./ocrResult.model");

// NEW: Nota Kecil Model
const setupNotaKecilModel = require("./notaKecil.model");
const setupNotaBesarModel = require("./notaBesar.model");
const setupNotaBesarItemModel = require("./notaBesarItem.model");

// NEW: Infrastructure Inventory Models
const setupInfrastructureCategoryModel = require("./infrastructureCategory.model");
const setupInfrastructureLocationModel = require("./infrastructureLocation.model");
const setupInfrastructureItemModel = require("./infrastructureItem.model");
const setupInfrastructureBatchModel = require("./infrastructureBatch.model");
const setupInfrastructureTransactionModel = require("./infrastructureTransaction.model");

// NEW: Customer Management Model
const setupCustomerModel = require("./customer.model");

// NEW: CCTV Monitoring Models
const setupCCTVSessionModel = require("./cctvSession.model");
const setupCCTVScreenshotModel = require("./cctvScreenshot.model");

// Initialize Sequelize connection using your .env variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  String(process.env.DB_PASSWORD),
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,  // Increased timeout for slow connections
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Load models into the db object
db.User = setupUserModel(sequelize);
db.Vehicle = setupVehicleModel(sequelize);
db.DriverProfile = setupDriverProfileModel(sequelize);
db.AdminProfile = setupAdminProfileModel(sequelize);
db.PurchaseOrder = setupPurchaseOrderModel(sequelize);
db.DeliveryOrder = setupDeliveryOrderModel(sequelize);
db.DriverExpense = setupDriverExpenseModel(sequelize);
db.VehicleService = setupVehicleServiceModel(sequelize);

db.StockCategory = setupStockCategoryModel(sequelize);
db.StockItem = setupStockItemModel(sequelize);
db.StockBatch = setupStockBatchModel(sequelize);
db.StockTransaction = setupStockTransactionModel(sequelize);
db.StockBatch = setupStockBatchModel(sequelize);
db.ServiceItem = setupServiceItemModel(sequelize);

db.DeliveryOrderPayments = setupDeliveryOrderPaymentsModel(sequelize);
db.DeliveryOrderInvoices = setupDeliveryOrderInvoicesModel(sequelize);
db.DeliveryOrderAdjustments = setupDeliveryOrderAdjustmentsModel(sequelize);
db.DeliveryOrderPaymentHistory =
  setupDeliveryOrderPaymentHistoryModel(sequelize);
db.SystemSettings = setupSystemSettingsModel(sequelize);

db.TireInventory = setupTireInventoryModel(sequelize);
db.VehicleTire = setupVehicleTireModel(sequelize);
db.TireInspection = setupTireInspectionModel(sequelize);
db.TireInstance = setupTireInstanceModel(sequelize);

db.CashCategory = setupCashCategoryModel(sequelize);
db.CashTransaction = setupCashTransactionModel(sequelize);

db.DepositGroup = setupDepositGroupModel(sequelize);
db.DepositGroupMember = setupDepositGroupMemberModel(sequelize);

// GPS Tracking Model
db.DriverLocation = setupDriverLocationModel(sequelize);

// Gas Station Model
db.GasStation = setupGasStationModel(sequelize);

// Exchange Rate model
db.ExchangeRate = setupExchangeRateModel(sequelize);

// Budget Request model (re-added for instant approval)
db.BudgetRequest = setupBudgetRequestModel(sequelize);

// OCR Result model
db.OCRResult = setupOCRResultModel(sequelize);

// Nota Kecil model
db.NotaKecil = setupNotaKecilModel(sequelize);

// Nota Besar models
db.NotaBesar = setupNotaBesarModel(sequelize);
db.NotaBesarItem = setupNotaBesarItemModel(sequelize);

// Infrastructure Inventory models
db.InfrastructureCategory = setupInfrastructureCategoryModel(sequelize);
db.InfrastructureLocation = setupInfrastructureLocationModel(sequelize);
db.InfrastructureItem = setupInfrastructureItemModel(sequelize);
db.InfrastructureBatch = setupInfrastructureBatchModel(sequelize);
db.InfrastructureTransaction = setupInfrastructureTransactionModel(sequelize);

// Customer Management model
db.Customer = setupCustomerModel(sequelize);

// CCTV Monitoring models
db.CCTVSession = setupCCTVSessionModel(sequelize);
db.CCTVScreenshot = setupCCTVScreenshotModel(sequelize);

const {
  User,
  DriverProfile,
  AdminProfile,
  PurchaseOrder,
  DeliveryOrder,
  Vehicle,
  DriverExpense,
  VehicleService,
  StockCategory,
  StockItem,
  StockTransaction,
  StockBatch,
  ServiceItem,
  TireInventory,
  VehicleTire,
  TireInspection,
  TireInstance,
  CashCategory,
  CashTransaction,
  DeliveryOrderPayments,
  DeliveryOrderInvoices,
  DeliveryOrderAdjustments,
  DeliveryOrderPaymentHistory,
  SystemSettings,
  DepositGroup,
  DepositGroupMember,
  DriverLocation,
  GasStation,
  ExchangeRate,
  BudgetRequest,
  OCRResult,
  NotaKecil,
  NotaBesar,
  NotaBesarItem,
  InfrastructureCategory,
  InfrastructureLocation,
  InfrastructureItem,
  InfrastructureBatch,
  InfrastructureTransaction,
  Customer,
  CCTVSession,
  CCTVScreenshot,
} = db;

// User <-> Profile Associations (One-to-One)
User.hasOne(DriverProfile, { foreignKey: "user_id", as: "driverProfile" });
DriverProfile.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasOne(AdminProfile, { foreignKey: "user_id", as: "adminProfile" });
AdminProfile.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Note: Removed PO-DO associations as DOs are now standalone entities

// User (as Driver) <-> DeliveryOrder
User.hasMany(DeliveryOrder, {
  foreignKey: "driver_id",
  as: "driverDeliveryOrders",
});
DeliveryOrder.belongsTo(User, { foreignKey: "driver_id", as: "driver" });

// Vehicle <-> DeliveryOrder
Vehicle.hasMany(DeliveryOrder, {
  foreignKey: "vehicle_id",
  as: "vehicleDeliveryOrders",
});
DeliveryOrder.belongsTo(Vehicle, { foreignKey: "vehicle_id", as: "vehicle" });

DeliveryOrder.belongsTo(User, {
  foreignKey: "payment_confirmed_by",
  as: "paymentConfirmedByUser",
});

// Vehicle <-> Driver (User) Assignments
User.hasMany(Vehicle, {
  foreignKey: "driver_id",
  as: "assignedVehicles",
});
Vehicle.belongsTo(User, {
  foreignKey: "driver_id",
  as: "driver",
});

// Vehicle <-> DriverProfile (through User)
Vehicle.belongsTo(DriverProfile, {
  foreignKey: "driver_id",
  targetKey: "user_id",
  as: "driverProfile",
});
DriverProfile.hasMany(Vehicle, {
  foreignKey: "driver_id",
  sourceKey: "user_id",
  as: "assignedVehicles",
});

// Expense-related Associations (One-to-Many)
DeliveryOrder.hasMany(DriverExpense, {
  foreignKey: "delivery_order_id",
  as: "expenses",
});
DriverExpense.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});
DriverExpense.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approvedBy",
});

// Budget Request Associations (re-added for instant approval)
User.hasMany(BudgetRequest, {
  foreignKey: "driver_id",
  as: "budgetRequests",
});
BudgetRequest.belongsTo(User, { foreignKey: "driver_id", as: "driver" });

User.hasMany(BudgetRequest, {
  foreignKey: "approved_by",
  as: "approvedBudgetRequests",
});
BudgetRequest.belongsTo(User, { foreignKey: "approved_by", as: "approver" });

DeliveryOrder.hasMany(BudgetRequest, {
  foreignKey: "delivery_order_id",
  as: "budgetRequests",
});
BudgetRequest.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});


// Vehicle Service Associations
Vehicle.hasMany(VehicleService, {
  foreignKey: "vehicle_id",
  as: "serviceHistory",
});
VehicleService.belongsTo(Vehicle, { foreignKey: "vehicle_id", as: "vehicle" });

// User (as Driver) <-> DriverExpense
User.hasMany(DriverExpense, { foreignKey: "driver_id", as: "driverExpenses" });
DriverExpense.belongsTo(User, { foreignKey: "driver_id", as: "driver" });

// === Stock Management Associations ===
StockCategory.hasMany(StockItem, {
  foreignKey: "category_id",
  as: "items",
});
StockItem.belongsTo(StockCategory, {
  foreignKey: "category_id",
  as: "category",
});

StockItem.hasMany(StockTransaction, {
  foreignKey: "item_id",
  as: "transactions",
});
StockItem.hasMany(StockBatch, {
  foreignKey: "item_id",
  as: "batches",
});

StockBatch.belongsTo(StockItem, {
  foreignKey: "item_id",
  as: "stockItem",
});

StockTransaction.belongsTo(StockBatch, {
  foreignKey: "batch_id",
  as: "batch",
});

StockBatch.hasMany(StockTransaction, {
  foreignKey: "batch_id",
  as: "transactions",
});
StockTransaction.belongsTo(StockItem, {
  foreignKey: "item_id",
  as: "stockItem",
});

// === Service Management Associations ===
VehicleService.hasMany(ServiceItem, {
  foreignKey: "service_id",
  as: "serviceItems",
});
ServiceItem.belongsTo(VehicleService, {
  foreignKey: "service_id",
  as: "service",
});

StockItem.hasMany(ServiceItem, {
  foreignKey: "stock_item_id",
  as: "usedInServices",
});
ServiceItem.belongsTo(StockItem, {
  foreignKey: "stock_item_id",
  as: "stockItem",
});

// === Payment-related Associations ===
DeliveryOrder.hasMany(DeliveryOrderPayments, {
  foreignKey: "delivery_order_id",
  as: "payments",
});
DeliveryOrderPayments.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

DeliveryOrder.hasMany(DeliveryOrderInvoices, {
  foreignKey: "delivery_order_id",
  as: "invoices",
});
DeliveryOrderInvoices.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

DeliveryOrder.hasMany(DeliveryOrderAdjustments, {
  foreignKey: "delivery_order_id",
  as: "adjustments",
});
DeliveryOrderAdjustments.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

DeliveryOrder.hasMany(DeliveryOrderPaymentHistory, {
  foreignKey: "delivery_order_id",
  as: "paymentHistory",
});
DeliveryOrderPaymentHistory.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});
DeliveryOrderPaymentHistory.belongsTo(User, {
  foreignKey: "changed_by",
  as: "changedBy",
});
User.hasMany(DeliveryOrderPaymentHistory, {
  foreignKey: "changed_by",
  as: "paymentHistoryChanges",
});


// Invoice to Payments relationship
DeliveryOrderInvoices.hasMany(DeliveryOrderPayments, {
  foreignKey: "invoice_id",
  as: "payments",
});
DeliveryOrderPayments.belongsTo(DeliveryOrderInvoices, {
  foreignKey: "invoice_id",
  as: "invoice",
});

// User relationships for audit fields
User.hasMany(DeliveryOrderPayments, {
  foreignKey: "created_by",
  as: "createdPayments",
});
User.hasMany(DeliveryOrderPayments, {
  foreignKey: "received_by",
  as: "receivedPayments",
});
User.hasMany(DeliveryOrderInvoices, {
  foreignKey: "created_by",
  as: "createdInvoices",
});
User.hasMany(DeliveryOrderAdjustments, {
  foreignKey: "created_by",
  as: "createdAdjustments",
});
User.hasMany(DeliveryOrderAdjustments, {
  foreignKey: "approved_by",
  as: "approvedAdjustments",
});
User.hasMany(SystemSettings, {
  foreignKey: "updated_by",
  as: "updatedSettings",
});

// === Tire Management Associations ===
Vehicle.hasMany(VehicleTire, {
  foreignKey: "vehicle_id",
  as: "tires",
});
VehicleTire.belongsTo(Vehicle, {
  foreignKey: "vehicle_id",
  as: "vehicle",
});

TireInventory.hasMany(VehicleTire, {
  foreignKey: "tire_inventory_id",
  as: "installedTires",
});
VehicleTire.belongsTo(TireInventory, {
  foreignKey: "tire_inventory_id",
  as: "tireInventory",
});

VehicleTire.hasMany(TireInspection, {
  foreignKey: "vehicle_tire_id",
  as: "inspections",
});
TireInspection.belongsTo(VehicleTire, {
  foreignKey: "vehicle_tire_id",
  as: "vehicleTire",
});

TireInventory.hasMany(TireInstance, {
  foreignKey: "tire_inventory_id",
  as: "instances",
});
TireInstance.belongsTo(TireInventory, {
  foreignKey: "tire_inventory_id",
  as: "tireInventory",
});

VehicleTire.belongsTo(TireInstance, {
  foreignKey: "tire_instance_id",
  as: "tireInstance",
});
TireInstance.hasMany(VehicleTire, {
  foreignKey: "tire_instance_id",
  as: "installations",
});

TireInspection.belongsTo(TireInstance, {
  foreignKey: "tire_instance_id",
  as: "tireInstance",
});
TireInstance.hasMany(TireInspection, {
  foreignKey: "tire_instance_id",
  as: "inspections",
});

// === Cash Management Associations ===
CashCategory.hasMany(CashTransaction, {
  foreignKey: "category_id",
  as: "transactions",
});
CashTransaction.belongsTo(CashCategory, {
  foreignKey: "category_id",
  as: "category",
});

// Vehicle to CashTransaction (One-to-Many) for vehicle expenses
Vehicle.hasMany(CashTransaction, {
  foreignKey: "vehicle_id",
  as: "expenseTransactions",
});
CashTransaction.belongsTo(Vehicle, {
  foreignKey: "vehicle_id",
  as: "vehicle",
});

// DepositGroup to DepositGroupMember (One-to-Many)
DepositGroup.hasMany(DepositGroupMember, {
  foreignKey: "group_id",
  as: "members",
});
DepositGroupMember.belongsTo(DepositGroup, {
  foreignKey: "group_id",
  as: "depositGroup",
});

// DeliveryOrder to DepositGroupMember (One-to-Many)
DeliveryOrder.hasMany(DepositGroupMember, {
  foreignKey: "delivery_order_id",
  as: "groupMemberships",
});
DepositGroupMember.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});
DeliveryOrder.hasMany(DeliveryOrderPayments, {
  foreignKey: 'delivery_order_id',
  as: 'payments_depositGroup',
});

PurchaseOrder.belongsTo(DepositGroup, {
  foreignKey: "deposit_group_id",
  as: "depositGroup",
});
DepositGroup.hasMany(PurchaseOrder, {
  foreignKey: "deposit_group_id",
  as: "purchaseOrders",
});

// DriverLocation Associations (GPS Tracking)
// User (Driver) to DriverLocation (One-to-Many)
User.hasMany(DriverLocation, {
  foreignKey: "driver_id",
  as: "locations",
});
DriverLocation.belongsTo(User, {
  foreignKey: "driver_id",
  as: "driver",
});

// Vehicle to DriverLocation (One-to-Many)
Vehicle.hasMany(DriverLocation, {
  foreignKey: "vehicle_id",
  as: "locations",
});
DriverLocation.belongsTo(Vehicle, {
  foreignKey: "vehicle_id",
  as: "vehicle",
});

// DeliveryOrder to DriverLocation (One-to-Many)
DeliveryOrder.hasMany(DriverLocation, {
  foreignKey: "delivery_order_id",
  as: "trackingData",
});
DriverLocation.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});


// === Infrastructure Inventory Associations ===
InfrastructureCategory.hasMany(InfrastructureItem, {
  foreignKey: "category_id",
  as: "items",
});
InfrastructureItem.belongsTo(InfrastructureCategory, {
  foreignKey: "category_id",
  as: "category",
});

InfrastructureLocation.hasMany(InfrastructureItem, {
  foreignKey: "location_id",
  as: "items",
});
InfrastructureItem.belongsTo(InfrastructureLocation, {
  foreignKey: "location_id",
  as: "location",
});

InfrastructureItem.hasMany(InfrastructureTransaction, {
  foreignKey: "item_id",
  as: "transactions",
});
InfrastructureItem.hasMany(InfrastructureBatch, {
  foreignKey: "item_id",
  as: "batches",
});

InfrastructureBatch.belongsTo(InfrastructureItem, {
  foreignKey: "item_id",
  as: "infrastructureItem",
});

InfrastructureTransaction.belongsTo(InfrastructureBatch, {
  foreignKey: "batch_id",
  as: "batch",
});

InfrastructureBatch.hasMany(InfrastructureTransaction, {
  foreignKey: "batch_id",
  as: "transactions",
});
InfrastructureTransaction.belongsTo(InfrastructureItem, {
  foreignKey: "item_id",
  as: "infrastructureItem",
});

// === Gas Station Associations ===
// Association with User (Creator)
GasStation.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
  onDelete: 'RESTRICT',
});

// Association with User (Updater)
GasStation.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updater',
  onDelete: 'SET NULL',
});

// User to GasStation (reverse associations)
User.hasMany(GasStation, {
  foreignKey: 'created_by',
  as: 'createdGasStations',
});

User.hasMany(GasStation, {
  foreignKey: 'updated_by',
  as: 'updatedGasStations',
});

// === OCR Result Associations ===
// DeliveryOrder to OCRResult (One-to-Many)
DeliveryOrder.hasMany(OCRResult, {
  foreignKey: "delivery_order_id",
  as: "ocrResults",
});
OCRResult.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

// User to OCRResult (One-to-Many) for processed_by
User.hasMany(OCRResult, {
  foreignKey: "processed_by",
  as: "processedOCRResults",
});
OCRResult.belongsTo(User, {
  foreignKey: "processed_by",
  as: "processedBy",
});

// === Nota Kecil Associations ===
// DeliveryOrder to NotaKecil (One-to-Many)
DeliveryOrder.hasMany(NotaKecil, {
  foreignKey: "delivery_order_id",
  as: "notaKecils",
});
NotaKecil.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

// === Nota Besar Associations ===
// DeliveryOrder to NotaBesar (One-to-Many)
DeliveryOrder.hasMany(NotaBesar, {
  foreignKey: "delivery_order_id",
  as: "notaBesars",
});
NotaBesar.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "deliveryOrder",
});

// User to NotaBesar (One-to-Many) - created_by
User.hasMany(NotaBesar, {
  foreignKey: "created_by",
  as: "createdNotaBesars",
});
NotaBesar.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator",
});

// NotaBesar to NotaBesarItem (One-to-Many)
NotaBesar.hasMany(NotaBesarItem, {
  foreignKey: "nota_besar_id",
  as: "items",
});
NotaBesarItem.belongsTo(NotaBesar, {
  foreignKey: "nota_besar_id",
  as: "notaBesar",
});

// NotaKecil to NotaBesarItem (One-to-Many)
NotaKecil.hasMany(NotaBesarItem, {
  foreignKey: "nota_kecil_id",
  as: "notaBesarItems",
});
NotaBesarItem.belongsTo(NotaKecil, {
  foreignKey: "nota_kecil_id",
  as: "notaKecil",
});

// Customer to NotaBesar (One-to-Many)
Customer.hasMany(NotaBesar, {
  foreignKey: "customer_id",
  as: "notaBesars",
});
NotaBesar.belongsTo(Customer, {
  foreignKey: "customer_id",
  as: "customer",
});

// === CCTV Monitoring Associations ===
// DeliveryOrder to CCTVSession (One-to-Many)
DeliveryOrder.hasMany(CCTVSession, {
  foreignKey: "delivery_order_id",
  as: "cctvSessions",
});
CCTVSession.belongsTo(DeliveryOrder, {
  foreignKey: "delivery_order_id",
  as: "delivery_order",
});

// NotaKecil to CCTVSession (One-to-One)
CCTVSession.belongsTo(NotaKecil, {
  foreignKey: "created_nota_kecil_id",
  as: "created_nota_kecil",
});
NotaKecil.hasOne(CCTVSession, {
  foreignKey: "created_nota_kecil_id",
  as: "cctvSession",
});

// User to CCTVSession (One-to-Many) - created_by
User.hasMany(CCTVSession, {
  foreignKey: "created_by",
  as: "createdCctvSessions",
});
CCTVSession.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator",
});

// CCTVSession to CCTVScreenshot (One-to-Many)
CCTVSession.hasMany(CCTVScreenshot, {
  foreignKey: "session_id",
  as: "screenshots",
  onDelete: "CASCADE",
});
CCTVScreenshot.belongsTo(CCTVSession, {
  foreignKey: "session_id",
  as: "session",
});

module.exports = db;
