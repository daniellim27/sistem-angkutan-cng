import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./components/AuthContext";
import VehiclesPage from "./pages/Vehicles";
import VehicleCreatePage from "./pages/VehicleCreate";
import VehicleEditPage from "./pages/VehicleEdit";
import TireManagementPage from "./pages/TireManagement";
import DriversPage from "./pages/Drivers";
import DriverCreatePage from "./pages/DriverCreate";
import DriverEditPage from "./pages/DriverEdit";
import TripsPage from "./pages/Trips";
import DeliveryOrderCreatePage from "./pages/DeliveryOrderCreatePage";
import DeliveryOrdersPage from "./pages/DeliveryOrders";
import DeliveryOrderDetailPage from "./pages/DeliveryOrderDetail";
import EditDeliveryOrder from "./pages/EditDeliveryOrder";
import OCRProcessingPage from "./pages/OCRProcessing";
import StockManagementPage from "./pages/StockManagement";
import StockCreatePage from "./pages/StockCreate";
import InfrastructureManagementPage from "./pages/InfrastructureManagement";
import InfrastructureCreatePage from "./pages/InfrastructureCreate";
import InfrastructureHistoryPage from "./pages/InfrastructureHistory";
import ServiceManagementPage from "./pages/ServiceManagement";
import ServiceCreatePage from "./pages/ServiceCreate";
import ServiceDetailPage from "./pages/ServiceDetail";
import ServiceEditPage from "./pages/ServiceEdit";
import CustomerManagement from "./pages/CustomerManagement";
import CustomerNotaBesarPage from "./pages/CustomerNotaBesarPage";
import CustomerNotaKecilPage from "./pages/CustomerNotaKecilPage";
import NotaManagementPage from "./pages/operations/NotaManagementPage";
import NotaBesarDetailPage from "./pages/operations/NotaBesarDetailPage";
import CCTVMonitoringPage from "./pages/operations/CCTVMonitoringPage";
import RitaseDashboard from "./pages/Ritase/RitaseDashboard";
// Removed POPaymentDetail - payment aggregation is now DO-based
import DOPaymentManagement from "./pages/Ritase/DOPaymentManagement";
import RemovedTiresPage from "./pages/RemovedTires";
import StockBatchesPage from "./pages/StockBatches";
import CashManagementPage from "./pages/CashManagement";
import CashCoordinatorPage from "./pages/CashCoordinator";
import TempoManagementPage from "./pages/CashTempoManagement";
import VehicleExpenseCashPage from "./pages/VehicleExpenseCash";
import StockHistoryPage from "./pages/StockHistory";
import PaymentsRoutes from "./modules/payments/routes";
import InvoiceDetail from "./pages/Ritase/InvoiceDetail";
import DepositGroupManagement from "./pages/DepositGroupManagement";
import DriverExpenseManagement from "./pages/DriverExpenseManagement";
import LiveTracking from "./pages/LiveTracking";
import TrackDeliveryDetail from "./pages/TrackDeliveryDetail";
import { Toaster } from "react-hot-toast";

import ComprehensiveRitaseTable from "./pages/Ritase/ComprehensiveRitaseTable";
// Removed POSpecificRitaseTable - ritase is now DO-based

function App() {
  const { token } = useAuth();

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route
          path="/login"
          element={!token ? <Login /> : <Navigate to="/" replace />}
        />

        <Route
          path="/*"
          element={token ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="" element={<Dashboard />} />

          {/* Ritase dan Buku Kas */}
          <Route path="ritase" element={<RitaseDashboard />} />

          <Route
            path="ritase/comprehensive"
            element={<ComprehensiveRitaseTable />}
          />

          {/* Removed PO-specific ritase routes - now DO-based */}
          <Route
            path="ritase/delivery-orders/:doId/payment"
            element={<DOPaymentManagement />}
          />

          <Route
            path="ritase/delivery-orders/:doId/invoices/:invoiceId"
            element={<InvoiceDetail />}
          />

          <Route path="payments/*" element={<PaymentsRoutes />} />

          {/* Vehicles Routes */}
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/create" element={<VehicleCreatePage />} />
          <Route path="vehicles/edit/:id" element={<VehicleEditPage />} />
          {/* Tire Management Routes */}
          <Route path="vehicles/tires" element={<TireManagementPage />} />

          <Route path="vehicles/tires/removed" element={<RemovedTiresPage />} />
          {/* Drivers Routes */}
          <Route path="drivers" element={<DriversPage />} />
          <Route path="drivers/create" element={<DriverCreatePage />} />
          <Route path="drivers/edit/:id" element={<DriverEditPage />} />

          {/* Customer Management Routes */}
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="customers/:id/nota-besar" element={<CustomerNotaBesarPage />} />
          <Route path="customers/:id/nota-kecil" element={<CustomerNotaKecilPage />} />

          {/* Trips Routes - PO routes removed, DOs are now standalone */}
          <Route path="trips" element={<TripsPage />} />
          {/* Delivery Orders Routes */}
          <Route path="delivery-orders" element={<DeliveryOrdersPage />} />
          <Route
            path="delivery-orders/create"
            element={<DeliveryOrderCreatePage />}
          />
          <Route
            path="delivery-orders/:id"
            element={<DeliveryOrderDetailPage />}
          />
          <Route
            path="delivery-orders/:id/edit"
            element={<EditDeliveryOrder />}
          />
          
          {/* OCR Processing Routes */}
          <Route path="ocr-processing" element={<OCRProcessingPage />} />

          {/* Operations Routes */}
          <Route path="operations/nota-management" element={<NotaManagementPage />} />
          <Route path="operations/nota-besar/:id" element={<NotaBesarDetailPage />} />
          <Route path="operations/cctv-monitoring" element={<CCTVMonitoringPage />} />

          {/* Stock Management Routes */}
          <Route path="stock" element={<StockManagementPage />} />
          <Route path="stock/create" element={<StockCreatePage />} />
          <Route path="stock/edit/:id" element={<StockCreatePage />} />

          {/* === PERBAIKAN DI SINI === */}
          {/* Path dibuat relatif dengan menghapus '/' di awal */}
          <Route path="stock/history/:id" element={<StockHistoryPage />} />
          <Route path="stock/:id/batches" element={<StockBatchesPage />} />

          {/* ========================= */}

          {/* Infrastructure Inventory Routes */}
          <Route path="infrastructure" element={<InfrastructureManagementPage />} />
          <Route path="infrastructure/create" element={<InfrastructureCreatePage />} />
          <Route path="infrastructure/edit/:id" element={<InfrastructureCreatePage />} />
          <Route path="infrastructure/:id/history" element={<InfrastructureHistoryPage />} />

          {/* Service Management Routes */}
          <Route path="services" element={<ServiceManagementPage />} />
          <Route path="services/create" element={<ServiceCreatePage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route path="services/edit/:id" element={<ServiceEditPage />} />
          <Route path="cash" element={<CashManagementPage />} />
          <Route path="cash-coordinator" element={<CashCoordinatorPage />} />
          <Route path="tempo" element={<TempoManagementPage />} />
          <Route path="vehicle-expense-cash" element={<VehicleExpenseCashPage />} />
          <Route path="deposit-groups" element={<DepositGroupManagement />} />
          <Route path="driver-expenses" element={<DriverExpenseManagement />} />
          <Route path="live-tracking" element={<LiveTracking />} />
          <Route path="track-delivery/:id" element={<TrackDeliveryDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
