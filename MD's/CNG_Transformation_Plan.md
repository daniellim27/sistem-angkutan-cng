# CNG Expedition App Transformation Plan

## Executive Summary

This document outlines the comprehensive transformation plan for converting the existing **Angkutan Expedition App** into a **CNG (Compressed Natural Gas) Expedition App**. The transformation will maintain the core expedition functionality while adding CNG-specific features for gas transportation, SPBG (Gas Station) management, and enhanced tracking capabilities.

## Current System Analysis

### Existing Architecture
- **Backend**: Node.js + Express + Sequelize + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS
- **Mobile**: React Native + Expo
- **Database**: PostgreSQL with comprehensive expedition models

### Current Core Services
1. **User Management & Authentication**
   - User roles (Admin, Driver, Coordinator)
   - Firebase integration for notifications
   - JWT-based authentication

2. **Expedition Management**
   - Purchase Orders (PO)
   - Delivery Orders (DO)
   - Big Delivery Orders (BDO)
   - Vehicle and Driver assignment

3. **Financial Management**
   - Deposit Groups
   - Payment tracking
   - Driver expenses
   - Cash management
   - Invoice generation

4. **Asset Management**
   - Vehicle management
   - Tire management
   - Stock management
   - Service history

5. **Driver Operations**
   - Trip management
   - Expense submission
   - Status updates
   - Location tracking (basic)

## Target CNG System Requirements

### Core CNG Features (from guide.md)
1. **Live Maps & Real-time Tracking**
   - Driver location tracking every 1 minute
   - Route history visualization
   - Dynamic destination addition during trips

2. **SPBG (Gas Station) Management**
   - Deposit system for gas stations
   - Gas filling cost calculation (JISDOR rate vs Fixed cost)
   - Transaction history and balance tracking


3. **Enhanced Driver Management**
   - Expense approval workflow
   - Receipt photo uploads
   - Financial summary per trip

## Transformation Roadmap

### Phase 1: Foundation & Database Schema (Week 1-2)

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

```

#### 1.2 Model Updates
**Files to Modify:**
- `backend/src/models/index.js` - Add new model associations
- `backend/src/models/deliveryOrder.model.js` - Add tracking fields
- `backend/src/models/vehicle.model.js` - Add CNG-specific fields

**New Models to Create:**
- `backend/src/models/deliveryOrderLocation.model.js`
- `backend/src/models/deliveryOrderDestination.model.js`
- `backend/src/models/spbgDeposit.model.js`
- `backend/src/models/spbgTransaction.model.js`
- `backend/src/models/iotRawData.model.js`

### Phase 2: Backend API Development (Week 3-4)

#### 2.1 New Controllers
**Files to Create:**
- `backend/src/controllers/web/spbgController.js` - SPBG management
- `backend/src/controllers/iotController.js` - IoT data handling
- `backend/src/controllers/web/driverExpenseController.js` - Enhanced expense management

**Files to Modify:**
- `backend/src/controllers/deliveryOrder.controller.js` - Add location tracking
- `backend/src/controllers/web/deliveryOrderController.js` - Add tracking and destination management

#### 2.2 New Services
**Files to Create:**
- `backend/src/services/scraperService.js` - JISDOR rate scraping
- `backend/src/services/trackingService.js` - Location tracking logic
- `backend/src/services/gasCalculationService.js` - Gas cost calculations

#### 2.3 New Routes
**Files to Create:**
- `backend/src/routes/web/spbg.routes.js` - SPBG endpoints
- `backend/src/routes/iot.routes.js` - IoT data endpoints
- `backend/src/routes/web/driverExpense.routes.js` - Web expense management

**Files to Modify:**
- `backend/src/routes/deliveryOrder.routes.js` - Add location tracking
- `backend/src/routes/web/deliveryOrder.routes.js` - Add tracking and destinations
- `backend/src/server.js` - Register new routes

#### 2.4 API Endpoints to Implement
```javascript
// Real-time tracking
POST /api/v1/do/:id/location - Update driver location
GET /api/v1/web/do/:id/locations - Get route history
POST /api/v1/web/do/:id/destinations - Add new destination

// SPBG management
POST /api/v1/web/spbg/deposit - Top up deposit
POST /api/v1/web/spbg/fill - Record gas filling
GET /api/v1/web/spbg/balance - Get current balance
GET /api/v1/web/spbg/transactions - Get transaction history


// Enhanced driver expenses
GET /api/v1/web/driver-expenses - Get all expenses
PUT /api/v1/web/driver-expenses/:id - Update expense status
```

### Phase 3: Frontend Development (Week 5-6)

#### 3.1 New Pages to Create
**Files to Create:**
- `frontend/src/pages/Finance/DepositSPBG.tsx` - SPBG deposit management
- `frontend/src/pages/Finance/DriverExpense.tsx` - Driver expense management
- `frontend/src/pages/Tracking/LiveTracking.tsx` - Real-time tracking dashboard

#### 3.2 Existing Pages to Modify
**Files to Modify:**
- `frontend/src/pages/DeliveryOrderDetail.tsx` - Add live tracking map
- `frontend/src/pages/DeliveryOrders.tsx` - Add tracking status indicators
- `frontend/src/pages/Dashboard.tsx` - Add CNG-specific metrics

#### 3.3 New Components to Create
**Files to Create:**
- `frontend/src/components/Tracking/LiveMap.tsx` - Google Maps integration
- `frontend/src/components/Tracking/RouteHistory.tsx` - Route visualization
- `frontend/src/components/Finance/SPBGDepositForm.tsx` - Deposit form

#### 3.4 Dependencies to Install
```bash
# Frontend dependencies
npm install @react-google-maps/api
npm install axios cheerio
npm install react-leaflet leaflet
npm install recharts # For sensor data charts
```

### Phase 4: Mobile App Updates (Week 7-8)

#### 4.1 New Mobile Screens
**Files to Create:**
- `mobile/app/(tabs)/expense.tsx` - Expense submission
- `mobile/app/tracking/live-location.tsx` - Location sharing
- `mobile/app/spbg/gas-filling.tsx` - Gas filling records

#### 4.2 Existing Screens to Modify
**Files to Modify:**
- `mobile/app/(tabs)/index.tsx` - Add expense submission button
- `mobile/app/trip-detail/[id].tsx` - Add location sharing
- `mobile/app/_layout.tsx` - Add new navigation items

#### 4.3 Mobile Dependencies to Install
```bash
# Mobile dependencies
expo install expo-location
expo install expo-image-picker
expo install expo-camera
expo install expo-notifications
```

### Phase 5: Integration & Testing (Week 9-10)

#### 5.1 Integration Points
1. **Real-time Location Updates**
   - Mobile app sends location every 1 minute
   - Backend stores in `delivery_order_locations`
   - Web admin displays on live map

2. **SPBG Integration**
   - Admin manages deposits via web interface
   - Drivers record gas fillings via mobile
   - Automatic cost calculation using JISDOR rates


#### 5.2 Testing Strategy
1. **Unit Tests**
   - Gas calculation formulas
   - Location tracking logic
   - Expense approval workflow

2. **Integration Tests**
   - End-to-end tracking flow
   - SPBG deposit and transaction flow

3. **User Acceptance Testing**
   - Driver mobile app workflow
   - Admin web interface workflow
   - Real-time tracking accuracy

## Technical Implementation Details

### 1. Real-time Tracking Implementation

#### Backend Location Service
```javascript
// backend/src/services/trackingService.js
class TrackingService {
  async updateLocation(deliveryOrderId, latitude, longitude) {
    const location = await DeliveryOrderLocation.create({
      delivery_order_id: deliveryOrderId,
      latitude,
      longitude
    });
    
    // Emit real-time update via WebSocket or SSE
    this.emitLocationUpdate(deliveryOrderId, location);
    
    return location;
  }
  
  async getRouteHistory(deliveryOrderId) {
    return await DeliveryOrderLocation.findAll({
      where: { delivery_order_id: deliveryOrderId },
      order: [['created_at', 'ASC']]
    });
  }
}
```

#### Frontend Live Map Component
```typescript
// frontend/src/components/Tracking/LiveMap.tsx
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

interface LiveMapProps {
  deliveryOrderId: string;
  routeHistory: Array<{lat: number, lng: number}>;
  currentLocation?: {lat: number, lng: number};
}

const LiveMap: React.FC<LiveMapProps> = ({ deliveryOrderId, routeHistory, currentLocation }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await api.get(`/web/delivery-orders/${deliveryOrderId}/locations`);
      setRouteHistory(response.data);
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [deliveryOrderId]);
  
  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '400px' }}
      center={currentLocation || routeHistory[0]}
      zoom={12}
      onLoad={setMap}
    >
      {routeHistory.length > 0 && (
        <Polyline
          path={routeHistory}
          options={{ strokeColor: '#FF0000', strokeWeight: 3 }}
        />
      )}
      {currentLocation && (
        <Marker
          position={currentLocation}
          icon={{
            url: '/driver-marker.png',
            scaledSize: new google.maps.Size(32, 32)
          }}
        />
      )}
    </GoogleMap>
  );
};
```

### 2. SPBG Management Implementation

#### Gas Cost Calculation Service
```javascript
// backend/src/services/gasCalculationService.js
class GasCalculationService {
  async calculateGasCost(volumeM3, method, jisdorRate = null) {
    if (method === 'jisdor') {
      if (!jisdorRate) {
        jisdorRate = await this.getJisdorRate();
      }
      // Formula: (volume_m3 / 27.27) * 12.7 * jisdor_rate
      return (volumeM3 / 27.27) * 12.7 * jisdorRate;
    } else {
      // Fixed cost: volume_m3 * 7800
      return volumeM3 * 7800;
    }
  }
  
  async getJisdorRate() {
    try {
      const response = await axios.get('https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/Default.aspx');
      const $ = cheerio.load(response.data);
      const rateString = $('#ctl00_PlaceHolderMain_g_6c89d4ad_1078_4ea1_916e_e32a78522620_ctl00_GridView1 tr:nth-child(2) td:nth-child(3)').text();
      return parseFloat(rateString.replace(/\./g, '').replace(',', '.'));
    } catch (error) {
      console.error('Error scraping JISDOR rate:', error);
      return 16500; // Fallback rate
    }
  }
}
```

#### SPBG Controller
```javascript
// backend/src/controllers/web/spbgController.js
exports.recordGasFilling = async (req, res, next) => {
  const { spbg_id, delivery_order_id, volume_m3, method } = req.body;
  
  try {
    const gasCalculationService = new GasCalculationService();
    const totalCost = await gasCalculationService.calculateGasCost(volumeM3, method);
    
    await sequelize.transaction(async (t) => {
      // Update deposit balance
      const deposit = await SPBGDeposit.findByPk(spbg_id, { transaction: t });
      if (deposit.balance < totalCost) {
        throw new Error('Insufficient deposit balance');
      }
      
      await deposit.update({ balance: deposit.balance - totalCost }, { transaction: t });
      
      // Record transaction
      await SPBGTransaction.create({
        spbg_deposit_id: spbg_id,
        delivery_order_id,
        volume_m3,
        calculation_method: method,
        jisdor_rate: method === 'jisdor' ? await gasCalculationService.getJisdorRate() : null,
        total_cost: Math.round(totalCost)
      }, { transaction: t });
    });
    
    res.status(201).json({ 
      message: 'Gas filling recorded successfully',
      totalCost: Math.round(totalCost)
    });
  } catch (error) {
    next(error);
  }
};
```




## Migration Strategy

### 1. Database Migration
```bash
# Run fresh migration with new schema
cd backend
npm run migrate:fresh

# Or create incremental migrations
npm run migrate
```

### 2. Code Deployment
1. **Backend First**: Deploy new API endpoints
2. **Database Update**: Run migrations
3. **Frontend Update**: Deploy new web interface
4. **Mobile Update**: Deploy updated mobile app

### 3. Data Migration
- Existing delivery orders will work with new tracking system
- New SPBG deposits start with zero balance
- IoT data begins collection from deployment date

## Risk Mitigation

### 1. Technical Risks
- **Real-time tracking performance**: Implement caching and rate limiting
- **JISDOR rate scraping**: Implement fallback rates and error handling
- **IoT data volume**: Implement data retention policies and archiving

### 2. Business Risks
- **Driver adoption**: Provide training and incentives
- **Data accuracy**: Implement validation and audit trails
- **System downtime**: Implement backup systems and monitoring

### 3. Compliance Risks
- **Data privacy**: Implement proper data encryption and access controls
- **Financial accuracy**: Implement audit trails and approval workflows
- **Regulatory compliance**: Ensure adherence to transportation regulations

## Success Metrics

### 1. Technical Metrics
- Real-time tracking accuracy: >95%
- API response time: <200ms
- System uptime: >99.5%
- Data synchronization delay: <5 seconds

### 2. Business Metrics
- Driver adoption rate: >80%
- Expense approval time: <24 hours
- Gas cost calculation accuracy: 100%
- Route optimization improvement: >15%

### 3. User Experience Metrics
- Mobile app crash rate: <1%
- Web interface load time: <3 seconds
- User satisfaction score: >4.5/5
- Feature usage rate: >70%

## Conclusion

This transformation plan provides a comprehensive roadmap for converting the existing expedition app into a sophisticated CNG expedition management system. The phased approach ensures minimal disruption to existing operations while progressively adding new capabilities.

The key success factors are:
1. **Maintaining existing functionality** while adding new features
2. **Ensuring data integrity** during the transformation
3. **Providing comprehensive training** for users
4. **Implementing robust testing** at each phase
5. **Monitoring performance** and user adoption

By following this plan, the organization will have a modern, feature-rich CNG expedition system that enhances operational efficiency, improves cost control, and provides real-time visibility into all aspects of the business.
