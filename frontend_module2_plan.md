# Frontend Module 2: New Pages Development Plan

## Overview
This document provides a detailed implementation plan for **Module 2: New Pages Development** from the CNG Frontend Transformation Plan. This phase focuses on creating the core CNG-specific pages including SPBG management, real-time tracking, and enhanced driver expense management.

## Timeline
**Duration**: Week 2-3 (14 days)
**Priority**: High - Core functionality foundation

## Module 2 Breakdown

### 2.1 SPBG Management Pages (Days 1-5)

#### 2.1.1 DepositSPBG.tsx - Main SPBG Management Page
**File Path**: `frontend/src/pages/Finance/DepositSPBG.tsx`
**Purpose**: Central hub for managing gas station deposits and transactions

**Key Features to Implement:**
- SPBG list display with balance overview
- Deposit selection and management
- Top-up functionality
- Real-time balance updates

**Dependencies Required:**
```bash
npm install react-query
npm install react-hot-toast
```

**Component Structure:**
```
DepositSPBG
├── SPBGList (left sidebar)
│   ├── SPBGItem (selectable cards)
│   └── LoadingSkeleton
└── SPBGDetails (right panel)
    ├── SPBGBalanceCard
    ├── SPBGDepositForm
    └── EmptyState
```

**API Endpoints to Use:**
- `GET /web/spbg/deposits` - Fetch SPBG list
- `POST /web/spbg/deposit/topup` - Top up deposit

**State Management:**
- React Query for server state
- Local state for selected SPBG
- Toast notifications for user feedback

#### 2.1.2 SPBGTransactions.tsx - Transaction History Page
**File Path**: `frontend/src/pages/Finance/SPBGTransactions.tsx`
**Purpose**: Display detailed transaction history for selected SPBG

**Key Features to Implement:**
- Transaction list with pagination
- Filtering by date range
- Export functionality
- Transaction details modal

**Component Structure:**
```
SPBGTransactions
├── TransactionFilters
│   ├── DateRangePicker
│   ├── StatusFilter
│   └── ExportButton
├── TransactionTable
│   ├── TransactionRow
│   └── Pagination
└── TransactionModal
    └── TransactionDetails
```

**API Endpoints to Use:**
- `GET /web/spbg/deposit/:spbg_id/transactions` - Fetch transactions

#### 2.1.3 GasFillingForm.tsx - Gas Filling Form Page
**File Path**: `frontend/src/pages/Finance/GasFillingForm.tsx`
**Purpose**: Record gas filling transactions with cost calculations

**Key Features to Implement:**
- Volume input (m³)
- Calculation method selection (JISDOR vs Fixed)
- Real-time cost calculation
- Delivery order association

**Component Structure:**
```
GasFillingForm
├── FormHeader
├── VolumeInput
├── CalculationMethodSelector
├── CostBreakdown
├── DeliveryOrderSelector
└── SubmitButton
```

**API Endpoints to Use:**
- `POST /web/spbg/fill` - Record gas filling
- `GET /web/delivery-orders` - Fetch active delivery orders

### 2.2 Real-time Tracking Pages (Days 6-10)

#### 2.2.1 LiveTracking.tsx - Main Tracking Dashboard
**File Path**: `frontend/src/pages/Tracking/LiveTracking.tsx`
**Purpose**: Real-time tracking dashboard with multiple view modes

**Key Features to Implement:**
- Tabbed interface (Map, Route, Sensors)
- Real-time data polling
- Trip status overview
- Quick actions

**Component Structure:**
```
LiveTracking
├── HeaderSection
│   ├── TripInfo
│   └── TripStatusCard
├── TabNavigation
│   ├── MapTab
│   ├── RouteTab
│   └── SensorsTab
└── TabContent
    ├── LiveMap
    ├── RouteHistory
    └── SensorDataDisplay
```

**Dependencies Required:**
```bash
npm install @react-google-maps/api
npm install react-query
```

**API Endpoints to Use:**
- `GET /web/delivery-orders/:id` - Fetch delivery order details
- `GET /web/delivery-orders/:id/locations` - Fetch location history
- `GET /web/delivery-orders/:id/sensordata` - Fetch sensor data

#### 2.2.2 RouteHistory.tsx - Route Visualization Page
**File Path**: `frontend/src/pages/Tracking/RouteHistory.tsx`
**Purpose**: Visualize and analyze route history data

**Key Features to Implement:**
- Route timeline visualization
- Distance and time calculations
- Stop points identification
- Performance metrics

**Component Structure:**
```
RouteHistory
├── RouteTimeline
│   ├── TimelineItem
│   └── StopPoint
├── RouteMetrics
│   ├── DistanceCard
│   ├── TimeCard
│   └── EfficiencyCard
└── RouteMap
    └── StaticMap
```

#### 2.2.3 TrackingDashboard.tsx - Overview Dashboard
**File Path**: `frontend/src/pages/Tracking/TrackingDashboard.tsx`
**Purpose**: Overview of all active trips and tracking status

**Key Features to Implement:**
- Active trips grid
- Real-time status updates
- Quick access to live tracking
- Performance overview

**Component Structure:**
```
TrackingDashboard
├── DashboardHeader
├── ActiveTripsGrid
│   ├── TripCard
│   └── StatusIndicator
├── PerformanceMetrics
└── QuickActions
```

### 2.3 Enhanced Driver Expense Management (Days 11-14)

#### 2.3.1 DriverExpense.tsx - Main Expense Management Page
**File Path**: `frontend/src/pages/Finance/DriverExpense.tsx`
**Purpose**: Comprehensive driver expense management system

**Key Features to Implement:**
- Expense list with filtering
- Status-based workflow
- Receipt photo management
- Approval process

**Component Structure:**
```
DriverExpense
├── ExpenseFilters
├── ExpenseList
│   ├── ExpenseCard
│   └── StatusBadge
├── ExpenseModal
│   ├── ExpenseForm
│   ├── PhotoUpload
│   └── ApprovalWorkflow
└── BulkActions
```

**Dependencies Required:**
```bash
npm install react-dropzone
npm install react-image-crop
```

#### 2.3.2 ExpenseApproval.tsx - Approval Workflow Page
**File Path**: `frontend/src/pages/Finance/ExpenseApproval.tsx`
**Purpose**: Streamlined expense approval process

**Key Features to Implement:**
- Pending approvals list
- Batch approval actions
- Approval history
- Rejection workflow

**Component Structure:**
```
ExpenseApproval
├── ApprovalQueue
│   ├── PendingExpense
│   └── BatchSelector
├── ApprovalActions
│   ├── ApproveButton
│   ├── RejectButton
│   └── CommentInput
└── ApprovalHistory
```

## Implementation Checklist

### Phase 2.1: SPBG Management (Days 1-5)
- [ ] Create `DepositSPBG.tsx` with basic structure
- [ ] Implement SPBG list component
- [ ] Add SPBG selection functionality
- [ ] Create balance display component
- [ ] Implement deposit form
- [ ] Add top-up functionality
- [ ] Create `SPBGTransactions.tsx`
- [ ] Implement transaction table
- [ ] Add filtering and pagination
- [ ] Create `GasFillingForm.tsx`
- [ ] Implement volume input and calculation
- [ ] Add delivery order selection
- [ ] Test SPBG management flow

### Phase 2.2: Real-time Tracking (Days 6-10)
- [ ] Create `LiveTracking.tsx` with tab structure
- [ ] Implement header section with trip info
- [ ] Add tab navigation
- [ ] Create `RouteHistory.tsx`
- [ ] Implement route timeline
- [ ] Add route metrics
- [ ] Create `TrackingDashboard.tsx`
- [ ] Implement active trips grid
- [ ] Add performance metrics
- [ ] Test tracking functionality

### Phase 2.3: Driver Expense Management (Days 11-14)
- [ ] Create `DriverExpense.tsx`
- [ ] Implement expense list
- [ ] Add filtering and search
- [ ] Create expense modal
- [ ] Implement photo upload
- [ ] Create `ExpenseApproval.tsx`
- [ ] Implement approval workflow
- [ ] Add batch actions
- [ ] Test expense management flow

## Required Components to Create

### Finance Components
- `SPBGDepositForm.tsx` - Deposit top-up form
- `SPBGBalanceCard.tsx` - Balance display card
- `GasFillingForm.tsx` - Gas filling form
- `TransactionHistory.tsx` - Transaction list
- `ExpenseCard.tsx` - Individual expense display
- `ExpenseForm.tsx` - Expense creation/editing form
- `PhotoUpload.tsx` - Receipt photo upload component

### Tracking Components
- `TripStatusCard.tsx` - Trip status overview
- `RouteTimeline.tsx` - Route history timeline
- `TripCard.tsx` - Individual trip display
- `StatusIndicator.tsx` - Status visualization
- `PerformanceMetrics.tsx` - Performance overview

### Shared Components
- `LoadingSkeleton.tsx` - Loading state skeleton
- `EmptyState.tsx` - Empty state display
- `StatusBadge.tsx` - Status indicator badge
- `Modal.tsx` - Reusable modal component

## API Integration Points

### SPBG Management
```typescript
// SPBG deposits
const { data: spbgDeposits } = useQuery('spbg-deposits', 
  () => api.get('/web/spbg/deposits').then(res => res.data)
);

// Top up deposit
const topUpMutation = useMutation(
  (data: TopUpData) => api.post('/web/spbg/deposit/topup', data)
);

// Gas filling
const gasFillingMutation = useMutation(
  (data: GasFillingData) => api.post('/web/spbg/fill', data)
);
```

### Real-time Tracking
```typescript
// Delivery order details
const { data: deliveryOrder } = useQuery(
  ['delivery-order', id],
  () => api.get(`/web/delivery-orders/${id}`).then(res => res.data),
  { refetchInterval: 30000 }
);

// Location updates
const { data: locations } = useQuery(
  ['delivery-order-locations', id],
  () => api.get(`/web/delivery-orders/${id}/locations`).then(res => res.data),
  { refetchInterval: 10000 }
);
```

### Driver Expenses
```typescript
// Expense list
const { data: expenses } = useQuery('driver-expenses',
  () => api.get('/web/driver-expenses').then(res => res.data)
);

// Create expense
const createExpenseMutation = useMutation(
  (data: ExpenseData) => api.post('/web/driver-expenses', data)
);
```

## Testing Strategy

### Unit Tests
- Component rendering tests
- User interaction tests
- Form validation tests
- API integration tests

### Integration Tests
- Page navigation flow
- Data fetching and display
- User workflow completion

### User Acceptance Tests
- SPBG management workflow
- Tracking functionality
- Expense submission process

## Success Criteria

### Functional Requirements
- [ ] All SPBG management features work correctly
- [ ] Real-time tracking displays accurate data
- [ ] Expense management workflow is complete
- [ ] All forms validate input properly
- [ ] API integration is stable

### Performance Requirements
- [ ] Page load time < 3 seconds
- [ ] Real-time updates < 5 seconds delay
- [ ] Smooth user interactions
- [ ] Responsive design on all devices

### User Experience Requirements
- [ ] Intuitive navigation flow
- [ ] Clear visual feedback
- [ ] Consistent design language
- [ ] Accessible to all users

## Risk Mitigation

### Technical Risks
- **API Integration Issues**: Implement proper error handling and fallbacks
- **Real-time Performance**: Use efficient polling and caching strategies
- **Component Complexity**: Break down into smaller, manageable components

### User Experience Risks
- **Complex Workflows**: Provide clear guidance and progress indicators
- **Data Overload**: Implement proper filtering and pagination
- **Mobile Experience**: Ensure responsive design and touch-friendly interactions

## Next Steps After Module 2

### Module 3: New Components Development
- Create reusable tracking components
- Build SPBG management components
- Develop IoT data visualization components

### Module 4: Existing Pages Modification
- Integrate CNG features into current pages
- Update navigation and routing
- Enhance existing functionality

## Conclusion

Module 2 provides the foundation for all CNG-specific functionality in the frontend. By completing this phase successfully, you'll have:

1. **Complete SPBG management system** for gas station operations
2. **Real-time tracking infrastructure** for driver monitoring
3. **Enhanced expense management** for financial control
4. **Solid component foundation** for future development

This module sets the stage for the remaining transformation phases and ensures a smooth user experience for CNG expedition operations.
