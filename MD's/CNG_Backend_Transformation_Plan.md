# CNG Backend Transformation Plan

## Executive Summary

This document outlines the **backend-specific transformation plan** for converting the existing **Angkutan Expedition App** into a **CNG (Compressed Natural Gas) Expedition App**. The transformation focuses on backend architecture, database schema, API development, and services while maintaining existing functionality.

## Current Backend Analysis

### Existing Architecture
- **Framework**: Node.js + Express
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Authentication**: JWT + Firebase Admin
- **File Upload**: Multer
- **Notifications**: Expo Push Notifications

### Current Backend Services
1. **User Management & Authentication**
   - User roles (Admin, Driver, Coordinator)
   - Firebase integration for notifications
   - JWT-based authentication middleware

2. **Expedition Management APIs**
   - Purchase Orders (PO) - CRUD operations
   - Delivery Orders (DO) - CRUD operations
   - Big Delivery Orders (BDO) - CRUD operations
   - Vehicle and Driver assignment

3. **Financial Management APIs**
   - Deposit Groups management
   - Payment tracking
   - Driver expenses
   - Cash management
   - Invoice generation

4. **Asset Management APIs**
   - Vehicle management
   - Tire management
   - Stock management
   - Service history

5. **Driver Operations APIs**
   - Trip management
   - Expense submission
   - Status updates
   - Basic location tracking

## Target CNG Backend Requirements

### Core CNG Features to Implement
1. **Live Maps & Real-time Tracking**
   - Driver location tracking every 1 minute
   - Route history storage and retrieval
   - Dynamic destination management

2. **SPBG (Gas Station) Management**
   - Deposit system for gas stations
   - Gas filling cost calculation (JISDOR rate vs Fixed cost)
   - Transaction history and balance tracking

3. **IoT Integration**
   - Pressure sensors (in/out)
   - Temperature monitoring
   - Meter pulse counting
   - Real-time data storage

4. **Enhanced Driver Management**
   - Expense approval workflow
   - Receipt photo uploads
   - Financial summary per trip

## Backend Transformation Roadmap

### Phase 1: Database Schema & Models (Week 1-2)

#### 1.1 Database Schema Updates
**New Tables to Create:**
```sql
-- Real-time tracking tables
CREATE TABLE delivery_order_locations (
  id SERIAL PRIMARY KEY,
  delivery_order_id INTEGER NOT NULL REFERENCES delivery_orders(id),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_order_destinations (
  id SERIAL PRIMARY KEY,
  delivery_order_id INTEGER NOT NULL REFERENCES delivery_orders(id),
  address TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SPBG management tables
CREATE TABLE spbg_deposits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spbg_transactions (
  id SERIAL PRIMARY KEY,
  spbg_deposit_id INTEGER REFERENCES spbg_deposits(id),
  delivery_order_id INTEGER REFERENCES delivery_orders(id),
  volume_m3 NUMERIC(10, 2) NOT NULL,
  calculation_method VARCHAR(50) NOT NULL,
  jisdor_rate NUMERIC(10, 2),
  total_cost BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IoT data table
CREATE TABLE iot_raw_data (
  id SERIAL PRIMARY KEY,
  delivery_order_id INTEGER NOT NULL REFERENCES delivery_orders(id),
  pressure_in NUMERIC(10, 2),
  pressure_out NUMERIC(10, 2),
  temperature NUMERIC(10, 2),
  meter_pulse INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 1.2 New Models to Create
**Files to Create:**
- `backend/src/models/deliveryOrderLocation.model.js`
- `backend/src/models/deliveryOrderDestination.model.js`
- `backend/src/models/spbgDeposit.model.js`
- `backend/src/models/spbgTransaction.model.js`
- `backend/src/models/iotRawData.model.js`

**Model Structure Examples:**

```javascript
// backend/src/models/deliveryOrderLocation.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeliveryOrderLocation = sequelize.define('DeliveryOrderLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    delivery_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id'
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      validate: { min: -90, max: 90 }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: { min: -180, max: 180 }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'delivery_order_locations',
    timestamps: false
  });

  return DeliveryOrderLocation;
};
```

```javascript
// backend/src/models/spbgDeposit.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SPBGDeposit = sequelize.define('SPBGDeposit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    balance: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'spbg_deposits',
    timestamps: false
  });

  return SPBGDeposit;
};
```

#### 1.3 Model Associations Update
**File to Modify:** `backend/src/models/index.js`

```javascript
// Add new model imports
const setupDeliveryOrderLocationModel = require('./deliveryOrderLocation.model');
const setupDeliveryOrderDestinationModel = require('./deliveryOrderDestination.model');
const setupSPBGDepositModel = require('./spbgDeposit.model');
const setupSPBGTransactionModel = require('./spbgTransaction.model');
const setupIoTRawDataModel = require('./iotRawData.model');

// Add to db object
db.DeliveryOrderLocation = setupDeliveryOrderLocationModel(sequelize);
db.DeliveryOrderDestination = setupDeliveryOrderDestinationModel(sequelize);
db.SPBGDeposit = setupSPBGDepositModel(sequelize);
db.SPBGTransaction = setupSPBGTransactionModel(sequelize);
db.IoTRawData = setupIoTRawDataModel(sequelize);

// Define associations
db.DeliveryOrder.hasMany(db.DeliveryOrderLocation, {
  foreignKey: 'delivery_order_id',
  as: 'locations'
});

db.DeliveryOrder.hasMany(db.DeliveryOrderDestination, {
  foreignKey: 'delivery_order_id',
  as: 'destinations'
});

db.SPBGDeposit.hasMany(db.SPBGTransaction, {
  foreignKey: 'spbg_deposit_id',
  as: 'transactions'
});

db.DeliveryOrder.hasMany(db.IoTRawData, {
  foreignKey: 'delivery_order_id',
  as: 'sensorData'
});
```

### Phase 2: Services Development (Week 2-3)

#### 2.1 New Services to Create
**Files to Create:**
- `backend/src/services/scraperService.js` - JISDOR rate scraping
- `backend/src/services/trackingService.js` - Location tracking logic
- `backend/src/services/gasCalculationService.js` - Gas cost calculations
- `backend/src/services/iotDataService.js` - IoT data processing

**Service Implementation Examples:**

```javascript
// backend/src/services/scraperService.js
const axios = require('axios');
const cheerio = require('cheerio');

class ScraperService {
  constructor() {
    this.JISDOR_URL = 'https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/Default.aspx';
    this.fallbackRate = 16500;
  }

  async getJisdorRate() {
    try {
      const { data } = await axios.get(this.JISDOR_URL);
      const $ = cheerio.load(data);
      
      // Extract USD rate from BI website
      const rateString = $('#ctl00_PlaceHolderMain_g_6c89d4ad_1078_4ea1_916e_e32a78522620_ctl00_GridView1 tr:nth-child(2) td:nth-child(3)').text();
      const rate = parseFloat(rateString.replace(/\./g, '').replace(',', '.'));
      
      if (isNaN(rate)) {
        throw new Error('Scraping failed, rate is NaN');
      }
      
      return rate;
    } catch (error) {
      console.error('Error scraping JISDOR rate:', error.message);
      return this.fallbackRate;
    }
  }

  async getCachedJisdorRate() {
    // Implement caching mechanism to avoid frequent scraping
    const cacheKey = 'jisdor_rate_cache';
    const cached = await this.getFromCache(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.rate;
    }
    
    const rate = await this.getJisdorRate();
    await this.setCache(cacheKey, { rate, timestamp: Date.now() });
    
    return rate;
  }
}

module.exports = ScraperService;
```

```javascript
// backend/src/services/gasCalculationService.js
const ScraperService = require('./scraperService');

class GasCalculationService {
  constructor() {
    this.scraperService = new ScraperService();
    this.FIXED_RATE_PER_M3 = 7800;
    this.CONVERSION_FACTOR = 27.27;
    this.MULTIPLIER = 12.7;
  }

  async calculateGasCost(volumeM3, method, jisdorRate = null) {
    if (method === 'jisdor') {
      if (!jisdorRate) {
        jisdorRate = await this.scraperService.getCachedJisdorRate();
      }
      // Formula: (volume_m3 / 27.27) * 12.7 * jisdor_rate
      return (volumeM3 / this.CONVERSION_FACTOR) * this.MULTIPLIER * jisdorRate;
    } else {
      // Fixed cost: volume_m3 * 7800
      return volumeM3 * this.FIXED_RATE_PER_M3;
    }
  }

  async calculateGasCostWithBreakdown(volumeM3, method) {
    const totalCost = await this.calculateGasCost(volumeM3, method);
    
    return {
      volume_m3: volumeM3,
      calculation_method: method,
      jisdor_rate: method === 'jisdor' ? await this.scraperService.getCachedJisdorRate() : null,
      total_cost: Math.round(totalCost),
      breakdown: {
        conversion_factor: this.CONVERSION_FACTOR,
        multiplier: this.MULTIPLIER,
        fixed_rate: this.FIXED_RATE_PER_M3
      }
    };
  }
}

module.exports = GasCalculationService;
```

```javascript
// backend/src/services/trackingService.js
const { DeliveryOrderLocation, DeliveryOrderDestination } = require('../models');

class TrackingService {
  async updateLocation(deliveryOrderId, latitude, longitude) {
    try {
      const location = await DeliveryOrderLocation.create({
        delivery_order_id: deliveryOrderId,
        latitude,
        longitude
      });
      
      // Emit real-time update via WebSocket or SSE
      this.emitLocationUpdate(deliveryOrderId, location);
      
      return location;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }
  
  async getRouteHistory(deliveryOrderId, limit = 100) {
    try {
      return await DeliveryOrderLocation.findAll({
        where: { delivery_order_id: deliveryOrderId },
        order: [['created_at', 'ASC']],
        limit
      });
    } catch (error) {
      console.error('Error getting route history:', error);
      throw error;
    }
  }

  async getCurrentLocation(deliveryOrderId) {
    try {
      return await DeliveryOrderLocation.findOne({
        where: { delivery_order_id: deliveryOrderId },
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  async addDestination(deliveryOrderId, address) {
    try {
      // Get the next sequence number
      const lastDestination = await DeliveryOrderDestination.findOne({
        where: { delivery_order_id: deliveryOrderId },
        order: [['sequence', 'DESC']]
      });
      
      const nextSequence = (lastDestination?.sequence || 0) + 1;
      
      return await DeliveryOrderDestination.create({
        delivery_order_id: deliveryOrderId,
        address,
        sequence: nextSequence,
        status: 'Pending'
      });
    } catch (error) {
      console.error('Error adding destination:', error);
      throw error;
    }
  }

  emitLocationUpdate(deliveryOrderId, location) {
    // Implement WebSocket or Server-Sent Events emission
    // This will be used for real-time updates to web admin
    if (global.io) {
      global.io.emit(`location_update_${deliveryOrderId}`, {
        type: 'location_update',
        data: location
      });
    }
  }
}

module.exports = TrackingService;
```

```javascript
// backend/src/services/iotDataService.js
const { IoTRawData } = require('../models');

class IoTDataService {
  async storeSensorData(deliveryOrderId, sensorData) {
    try {
      const iotRecord = await IoTRawData.create({
        delivery_order_id: deliveryOrderId,
        pressure_in: sensorData.pressure_in,
        pressure_out: sensorData.pressure_out,
        temperature: sensorData.temperature,
        meter_pulse: sensorData.meter_pulse
      });

      // Emit real-time update
      this.emitSensorDataUpdate(deliveryOrderId, iotRecord);
      
      return iotRecord;
    } catch (error) {
      console.error('Error storing IoT data:', error);
      throw error;
    }
  }

  async getLatestSensorData(deliveryOrderId) {
    try {
      return await IoTRawData.findOne({
        where: { delivery_order_id: deliveryOrderId },
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting latest sensor data:', error);
      throw error;
    }
  }

  async getSensorDataHistory(deliveryOrderId, hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      return await IoTRawData.findAll({
        where: {
          delivery_order_id: deliveryOrderId,
          created_at: {
            [require('sequelize').Op.gte]: cutoffTime
          }
        },
        order: [['created_at', 'ASC']]
      });
    } catch (error) {
      console.error('Error getting sensor data history:', error);
      throw error;
    }
  }

  emitSensorDataUpdate(deliveryOrderId, sensorData) {
    if (global.io) {
      global.io.emit(`sensor_update_${deliveryOrderId}`, {
        type: 'sensor_update',
        data: sensorData
      });
    }
  }
}

module.exports = IoTDataService;
```

### Phase 3: Controllers Development (Week 3-4)

#### 3.1 New Controllers to Create
**Files to Create:**
- `backend/src/controllers/web/spbgController.js` - SPBG management
- `backend/src/controllers/iotController.js` - IoT data handling
- `backend/src/controllers/web/driverExpenseController.js` - Enhanced expense management

**Controller Implementation Examples:**

```javascript
// backend/src/controllers/web/spbgController.js
const { SPBGDeposit, SPBGTransaction, DeliveryOrder } = require('../../models');
const GasCalculationService = require('../../services/gasCalculationService');
const { sequelize } = require('../../models');

class SPBGController {
  constructor() {
    this.gasCalculationService = new GasCalculationService();
  }

  // Top up SPBG deposit
  async topUpDeposit(req, res, next) {
    const { spbg_id, amount, notes } = req.body;
    
    try {
      await sequelize.transaction(async (t) => {
        const deposit = await SPBGDeposit.findByPk(spbg_id, { transaction: t });
        if (!deposit) {
          throw new Error('SPBG deposit not found');
        }
        
        await deposit.update({
          balance: deposit.balance + amount
        }, { transaction: t });
        
        // Record the top-up transaction
        await SPBGTransaction.create({
          spbg_deposit_id: spbg_id,
          delivery_order_id: null, // Top-up doesn't have DO
          volume_m3: 0,
          calculation_method: 'topup',
          jisdor_rate: null,
          total_cost: -amount, // Negative for top-up
          notes: notes || 'Deposit top-up'
        }, { transaction: t });
      });
      
      res.status(200).json({
        success: true,
        message: 'Deposit topped up successfully',
        newBalance: (await SPBGDeposit.findByPk(spbg_id)).balance
      });
    } catch (error) {
      next(error);
    }
  }

  // Record gas filling
  async recordGasFilling(req, res, next) {
    const { spbg_id, delivery_order_id, volume_m3, method, notes } = req.body;
    
    try {
      const calculationResult = await this.gasCalculationService.calculateGasCostWithBreakdown(volumeM3, method);
      
      await sequelize.transaction(async (t) => {
        // Check deposit balance
        const deposit = await SPBGDeposit.findByPk(spbg_id, { transaction: t });
        if (deposit.balance < calculationResult.total_cost) {
          throw new Error('Insufficient deposit balance');
        }
        
        // Update deposit balance
        await deposit.update({
          balance: deposit.balance - calculationResult.total_cost
        }, { transaction: t });
        
        // Record transaction
        await SPBGTransaction.create({
          spbg_deposit_id: spbg_id,
          delivery_order_id,
          volume_m3,
          calculation_method: method,
          jisdor_rate: calculationResult.jisdor_rate,
          total_cost: calculationResult.total_cost,
          notes: notes || 'Gas filling'
        }, { transaction: t });
      });
      
      res.status(201).json({
        success: true,
        message: 'Gas filling recorded successfully',
        data: calculationResult
      });
    } catch (error) {
      next(error);
    }
  }

  // Get SPBG balance
  async getBalance(req, res, next) {
    const { spbg_id } = req.params;
    
    try {
      const deposit = await SPBGDeposit.findByPk(spbg_id);
      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: 'SPBG deposit not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          id: deposit.id,
          name: deposit.name,
          balance: deposit.balance,
          last_updated: deposit.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get transaction history
  async getTransactionHistory(req, res, next) {
    const { spbg_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    try {
      const offset = (page - 1) * limit;
      
      const { count, rows } = await SPBGTransaction.findAndCountAll({
        where: { spbg_deposit_id: spbg_id },
        include: [
          {
            model: DeliveryOrder,
            as: 'deliveryOrder',
            attributes: ['do_number', 'customer_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.status(200).json({
        success: true,
        data: {
          transactions: rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(count / limit),
            total_records: count,
            records_per_page: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SPBGController();
```

```javascript
// backend/src/controllers/iotController.js
const IoTDataService = require('../services/iotDataService');

class IoTController {
  constructor() {
    this.iotDataService = new IoTDataService();
  }

  // Receive sensor data from IoT devices
  async receiveData(req, res, next) {
    const { delivery_order_id, pressure_in, pressure_out, temperature, meter_pulse } = req.body;
    
    if (!delivery_order_id) {
      return res.status(400).json({
        success: false,
        message: 'delivery_order_id is required'
      });
    }
    
    try {
      const sensorData = await this.iotDataService.storeSensorData(delivery_order_id, {
        pressure_in,
        pressure_out,
        temperature,
        meter_pulse
      });
      
      res.status(201).json({
        success: true,
        message: 'Sensor data received successfully',
        data: sensorData
      });
    } catch (error) {
      next(error);
    }
  }

  // Get latest sensor data for a delivery order
  async getLatestData(req, res, next) {
    const { delivery_order_id } = req.params;
    
    try {
      const sensorData = await this.iotDataService.getLatestSensorData(delivery_order_id);
      
      if (!sensorData) {
        return res.status(404).json({
          success: false,
          message: 'No sensor data found for this delivery order'
        });
      }
      
      res.status(200).json({
        success: true,
        data: sensorData
      });
    } catch (error) {
      next(error);
    }
  }

  // Get sensor data history
  async getDataHistory(req, res, next) {
    const { delivery_order_id } = req.params;
    const { hours = 24 } = req.query;
    
    try {
      const sensorData = await this.iotDataService.getSensorDataHistory(delivery_order_id, parseInt(hours));
      
      res.status(200).json({
        success: true,
        data: {
          delivery_order_id,
          time_range_hours: parseInt(hours),
          records_count: sensorData.length,
          data: sensorData
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IoTController();
```

#### 3.2 Existing Controllers to Modify
**Files to Modify:**
- `backend/src/controllers/deliveryOrder.controller.js` - Add location tracking
- `backend/src/controllers/web/deliveryOrderController.js` - Add tracking and destination management

**Modification Examples:**

```javascript
// Add to backend/src/controllers/deliveryOrder.controller.js
const TrackingService = require('../services/trackingService');

// Add new methods to existing controller
exports.updateLocation = async (req, res, next) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  
  try {
    const trackingService = new TrackingService();
    const location = await trackingService.updateLocation(id, latitude, longitude);
    
    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

// Add to backend/src/controllers/web/deliveryOrderController.js
exports.getLocations = async (req, res, next) => {
  const { id } = req.params;
  const { limit = 100 } = req.query;
  
  try {
    const trackingService = new TrackingService();
    const locations = await trackingService.getRouteHistory(id, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

exports.addDestination = async (req, res, next) => {
  const { id } = req.params;
  const { address } = req.body;
  
  try {
    const trackingService = new TrackingService();
    const destination = await trackingService.addDestination(id, address);
    
    res.status(201).json({
      success: true,
      message: 'Destination added successfully',
      data: destination
    });
  } catch (error) {
    next(error);
  }
};

exports.getSensorData = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const iotDataService = new IoTDataService();
    const sensorData = await iotDataService.getLatestSensorData(id);
    
    res.status(200).json({
      success: true,
      data: sensorData || null
    });
  } catch (error) {
    next(error);
  }
};
```

### Phase 4: Routes Development (Week 4)

#### 4.1 New Routes to Create
**Files to Create:**
- `backend/src/routes/web/spbg.routes.js` - SPBG endpoints
- `backend/src/routes/iot.routes.js` - IoT data endpoints
- `backend/src/routes/web/driverExpense.routes.js` - Web expense management

**Route Implementation Examples:**

```javascript
// backend/src/routes/web/spbg.routes.js
const express = require('express');
const router = express.Router();
const spbgController = require('../../controllers/web/spbgController');
const { auth, admin } = require('../../middlewares/auth.middleware');

// SPBG deposit management
router.post('/deposit/topup', auth, admin, spbgController.topUpDeposit);
router.get('/deposit/:spbg_id/balance', auth, admin, spbgController.getBalance);

// Gas filling operations
router.post('/fill', auth, admin, spbgController.recordGasFilling);

// Transaction history
router.get('/deposit/:spbg_id/transactions', auth, admin, spbgController.getTransactionHistory);

module.exports = router;
```

```javascript
// backend/src/routes/iot.routes.js
const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// IoT data endpoints (no auth required for data reception)
router.post('/data', iotController.receiveData);

// Data retrieval endpoints (require auth)
router.get('/data/:delivery_order_id/latest', auth, iotController.getLatestData);
router.get('/data/:delivery_order_id/history', auth, iotController.getDataHistory);

module.exports = router;
```

#### 4.2 Existing Routes to Modify
**Files to Modify:**
- `backend/src/routes/deliveryOrder.routes.js` - Add location tracking
- `backend/src/routes/web/deliveryOrder.routes.js` - Add tracking and destinations
- `backend/src/server.js` - Register new routes

**Modification Examples:**

```javascript
// Add to backend/src/routes/deliveryOrder.routes.js
router.post('/:id/location', auth, driver, deliveryOrderController.updateLocation);

// Add to backend/src/routes/web/deliveryOrder.routes.js
router.get('/:id/locations', auth, admin, deliveryOrderController.getLocations);
router.post('/:id/destinations', auth, admin, deliveryOrderController.addDestination);
router.get('/:id/sensordata', auth, admin, deliveryOrderController.getSensorData);

// Add to backend/src/server.js
const spbgRoutes = require('./routes/web/spbg.routes');
const iotRoutes = require('./routes/iot.routes');

app.use('/api/v1/web/spbg', spbgRoutes);
app.use('/api/v1/iot', iotRoutes);
```

### Phase 5: Middleware & Utilities (Week 4-5)

#### 5.1 New Middleware
**Files to Create:**
- `backend/src/middlewares/rateLimit.middleware.js` - Rate limiting for tracking
- `backend/src/middlewares/iotValidation.middleware.js` - IoT data validation

**Middleware Implementation Examples:**

```javascript
// backend/src/middlewares/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');

// Rate limiting for location updates (max 60 per minute)
const locationUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: {
    success: false,
    message: 'Too many location updates, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for IoT data (max 120 per minute)
const iotDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per windowMs
  message: {
    success: false,
    message: 'Too many IoT data submissions, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  locationUpdateLimiter,
  iotDataLimiter
};
```

```javascript
// backend/src/middlewares/iotValidation.middleware.js
const { body, validationResult } = require('express-validator');

const validateIoTData = [
  body('delivery_order_id')
    .isInt({ min: 1 })
    .withMessage('delivery_order_id must be a positive integer'),
  
  body('pressure_in')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('pressure_in must be between 0 and 1000'),
  
  body('pressure_out')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('pressure_out must be between 0 and 1000'),
  
  body('temperature')
    .optional()
    .isFloat({ min: -50, max: 200 })
    .withMessage('temperature must be between -50 and 200'),
  
  body('meter_pulse')
    .optional()
    .isInt({ min: 0 })
    .withMessage('meter_pulse must be a non-negative integer'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateIoTData
};
```

#### 5.2 WebSocket Setup for Real-time Updates
**File to Create:** `backend/src/services/websocketService.js`

```javascript
// backend/src/services/websocketService.js
const socketIo = require('socket.io');

class WebSocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      // Join delivery order room for real-time updates
      socket.on('join_delivery_order', (deliveryOrderId) => {
        socket.join(`delivery_order_${deliveryOrderId}`);
        console.log(`Client ${socket.id} joined delivery order ${deliveryOrderId}`);
      });
      
      // Leave delivery order room
      socket.on('leave_delivery_order', (deliveryOrderId) => {
        socket.leave(`delivery_order_${deliveryOrderId}`);
        console.log(`Client ${socket.id} left delivery order ${deliveryOrderId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  // Emit location update to specific delivery order room
  emitLocationUpdate(deliveryOrderId, locationData) {
    this.io.to(`delivery_order_${deliveryOrderId}`).emit('location_update', {
      type: 'location_update',
      delivery_order_id: deliveryOrderId,
      data: locationData
    });
  }

  // Emit sensor data update to specific delivery order room
  emitSensorDataUpdate(deliveryOrderId, sensorData) {
    this.io.to(`delivery_order_${deliveryOrderId}`).emit('sensor_data_update', {
      type: 'sensor_data_update',
      delivery_order_id: deliveryOrderId,
      data: sensorData
    });
  }

  // Emit general notification
  emitNotification(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }
}

module.exports = WebSocketService;
```

### Phase 6: Testing & Documentation (Week 5)

#### 6.1 Unit Tests
**Files to Create:**
- `backend/tests/services/gasCalculationService.test.js`
- `backend/tests/services/trackingService.test.js`
- `backend/tests/controllers/spbgController.test.js`

#### 6.2 Integration Tests
**Files to Create:**
- `backend/tests/integration/spbg.test.js`
- `backend/tests/integration/tracking.test.js`
- `backend/tests/integration/iot.test.js`

#### 6.3 API Documentation
**File to Create:** `backend/docs/API.md`

## Dependencies to Install

### New Backend Dependencies
```bash
# Core dependencies
npm install socket.io
npm install express-rate-limit
npm install cheerio
npm install axios

# Development dependencies
npm install --save-dev jest
npm install --save-dev supertest
npm install --save-dev @types/jest
```

## Configuration Updates

### Environment Variables
**Add to `.env`:**
```env
# JISDOR scraping configuration
JISDOR_SCRAPING_ENABLED=true
JISDOR_FALLBACK_RATE=16500
JISDOR_CACHE_DURATION=3600000

# Rate limiting configuration
LOCATION_UPDATE_RATE_LIMIT=60
IOT_DATA_RATE_LIMIT=120

# WebSocket configuration
WEBSOCKET_CORS_ORIGIN=http://localhost:3000
```

### Database Configuration
**Update database connection pool:**
```javascript
// backend/src/models/index.js
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: console.log,
    pool: {
      max: 10, // Increased for real-time operations
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    // Add connection timeout for real-time operations
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  }
);
```

## Performance Optimization

### 1. Database Indexing
```sql
-- Add indexes for better performance
CREATE INDEX idx_delivery_order_locations_do_id_created ON delivery_order_locations(delivery_order_id, created_at);
CREATE INDEX idx_iot_raw_data_do_id_created ON iot_raw_data(delivery_order_id, created_at);
CREATE INDEX idx_spbg_transactions_deposit_id_created ON spbg_transactions(spbg_deposit_id, created_at);
```

### 2. Caching Strategy
- JISDOR rate caching (1 hour)
- Location data caching (5 minutes)
- Sensor data caching (1 minute)

### 3. Rate Limiting
- Location updates: 60 per minute per IP
- IoT data: 120 per minute per IP
- API calls: 1000 per hour per user

## Security Considerations

### 1. Input Validation
- All IoT data validated before storage
- Location coordinates validated for reasonable ranges
- SPBG transaction amounts validated

### 2. Authentication & Authorization
- All web endpoints require authentication
- Admin-only access for SPBG management
- Driver-only access for location updates

### 3. Data Sanitization
- SQL injection prevention via Sequelize
- XSS prevention via input sanitization
- Rate limiting to prevent abuse

## Monitoring & Logging

### 1. Performance Monitoring
- API response time tracking
- Database query performance
- Real-time update latency

### 2. Error Logging
- Comprehensive error logging
- IoT data validation failures
- Rate limiting violations

### 3. Business Metrics
- Gas filling transactions per day
- Location updates per delivery order
- IoT data volume per day

## Conclusion

This backend transformation plan provides a comprehensive roadmap for implementing CNG-specific features while maintaining the existing expedition system functionality. The phased approach ensures:

1. **Minimal disruption** to existing operations
2. **Scalable architecture** for real-time features
3. **Robust error handling** and validation
4. **Performance optimization** for high-frequency data
5. **Security best practices** for production deployment

By following this plan, the backend will support:
- Real-time driver tracking with 1-minute updates
- Automated SPBG cost calculations using JISDOR rates
- IoT sensor data processing and storage
- Enhanced expense management workflows
- WebSocket-based real-time updates

The next step is to proceed with the frontend transformation plan to complete the full CNG expedition system.
