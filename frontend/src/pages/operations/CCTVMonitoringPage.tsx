// src/pages/operations/CCTVMonitoringPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { 
  PlayCircle, 
  StopCircle, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Camera,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  Key,
  Eye,
  Plus
} from 'lucide-react';

interface CCTVSession {
  id: number;
  delivery_order_id: number;
  customer_location_index: number;
  customer_name: string;
  device_id: string | null;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'dead' | 'stopped';
  total_screenshots_captured: number;
  last_screenshot_at: string | null;
  session_notes: string | null;
  created_nota_kecil_id: number | null;
  delivery_order?: {
    do_number: string;
    do_name: string;
  };
  health_status?: 'healthy' | 'warning' | 'critical' | 'dead';
  time_since_last_capture?: string;
}

interface CCTVScreenshot {
  id: number;
  session_id: number;
  screenshot_url: string;
  captured_at: string;
  ocr_status: 'pending' | 'processing' | 'success' | 'failed';
  ocr_result: {
    meter_reading?: number;
    pressure?: number;
    temperature?: number;
  } | null;
  ocr_confidence_score: number | null;
  sequence_number: number;
}

interface HealthStats {
  total_sessions: number;
  active_sessions: number;
  healthy_sessions: number;
  dead_sessions: number;
  total_screenshots_today: number;
}

interface DeliveryOrder {
  id: number;
  do_number: string;
  do_name: string;
  customer_name: string;
}

interface Customer {
  id: number;
  name: string;
  address?: string;
}

interface CreateSessionForm {
  delivery_order_id: number;
  customer_name: string;
  device_id: string;
  panel_row: number;
  panel_column: number;
  customer_location_index: number;
}

// Mockup data for demonstration
const MOCKUP_SESSIONS: CCTVSession[] = [
  {
    id: 1,
    delivery_order_id: 123,
    customer_location_index: 0,
    customer_name: 'PT Qurpol Indonesia',
    device_id: 'BARDI-CAM-001',
    start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    end_time: null,
    status: 'active',
    total_screenshots_captured: 12,
    last_screenshot_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    session_notes: null,
    created_nota_kecil_id: null,
    delivery_order: {
      do_number: 'DO-2025-001',
      do_name: 'CNG Delivery - PT Qurpol',
    },
    health_status: 'healthy',
    time_since_last_capture: '10 minutes ago',
  },
  {
    id: 2,
    delivery_order_id: 124,
    customer_location_index: 0,
    customer_name: 'PT Angkasa Jaya',
    device_id: 'BARDI-CAM-002',
    start_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    end_time: null,
    status: 'dead',
    total_screenshots_captured: 8,
    last_screenshot_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    session_notes: 'Session died - BARDI token may have expired',
    created_nota_kecil_id: null,
    delivery_order: {
      do_number: 'DO-2025-002',
      do_name: 'CNG Delivery - PT Angkasa',
    },
    health_status: 'dead',
    time_since_last_capture: '45 minutes ago',
  },
];

const MOCKUP_SCREENSHOTS: CCTVScreenshot[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  session_id: 1,
  screenshot_url: `https://via.placeholder.com/400x300/4a5568/ffffff?text=Screenshot+${i + 1}`,
  captured_at: new Date(Date.now() - (12 - i) * 10 * 60 * 1000).toISOString(), // Every 10 mins
  ocr_status: i < 10 ? 'success' : i === 10 ? 'processing' : 'pending',
  ocr_result: i < 10 ? {
    meter_reading: 1000.5 + (i * 8.2),
    pressure: 200 + (i * 0.5),
    temperature: 25 + (i * 0.3),
  } : null,
  ocr_confidence_score: i < 10 ? 0.85 + (Math.random() * 0.1) : null,
  sequence_number: i + 1,
}));

// Mockup delivery orders
const MOCKUP_DELIVERY_ORDERS: DeliveryOrder[] = [
  { id: 123, do_number: 'DO-2025-001', do_name: 'CNG Delivery - PT Qurpol', customer_name: 'PT Qurpol Indonesia' },
  { id: 124, do_number: 'DO-2025-002', do_name: 'CNG Delivery - PT Angkasa', customer_name: 'PT Angkasa Jaya' },
  { id: 125, do_number: 'DO-2025-003', do_name: 'CNG Delivery - PT Sejahtera', customer_name: 'PT Sejahtera Raya' },
  { id: 126, do_number: 'DO-2025-004', do_name: 'CNG Delivery - PT Maju', customer_name: 'PT Maju Jaya' },
];

// Mockup customers
const MOCKUP_CUSTOMERS: Customer[] = [
  { id: 1, name: 'PT Qurpol Indonesia', address: 'Jakarta Selatan' },
  { id: 2, name: 'PT Angkasa Jaya', address: 'Jakarta Utara' },
  { id: 3, name: 'PT Sejahtera Raya', address: 'Tangerang' },
  { id: 4, name: 'PT Maju Jaya', address: 'Bekasi' },
];

const CCTVMonitoringPage: React.FC = () => {
  // Initialize with mockup data
  const [sessions, setSessions] = useState<CCTVSession[]>(MOCKUP_SESSIONS);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    total_sessions: 2,
    active_sessions: 1,
    healthy_sessions: 1,
    dead_sessions: 1,
    total_screenshots_today: 20,
  });
  const [loading, setLoading] = useState(false); // Set to false to show mockup immediately
  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default
  const [selectedSession, setSelectedSession] = useState<CCTVSession | null>(null);
  const [screenshots, setScreenshots] = useState<CCTVScreenshot[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // Session token form
  const [sessionToken, setSessionToken] = useState({
    's-sid': '',
    's-sid.sig': '',
    'uid': '',
    'clientId': '',
    'deviceId': ''
  });

  // Create session form
  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    delivery_order_id: 0,
    customer_name: '',
    device_id: '',
    panel_row: 1,
    panel_column: 1,
    customer_location_index: 0,
  });

  // Dropdowns
  const [deliveryOrders] = useState<DeliveryOrder[]>(MOCKUP_DELIVERY_ORDERS);
  const [customers] = useState<Customer[]>(MOCKUP_CUSTOMERS);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      // Use mockup data for now - simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate some random updates to make it look "live"
      const updatedSessions = MOCKUP_SESSIONS.map((session, index) => {
        if (index === 0 && session.status === 'active') {
          return {
            ...session,
            total_screenshots_captured: session.total_screenshots_captured + Math.floor(Math.random() * 2),
            last_screenshot_at: new Date().toISOString(),
            time_since_last_capture: 'Just now',
          };
        }
        return session;
      });
      
      setSessions(updatedSessions);
      
      // Calculate health stats
      const stats = calculateHealthStats(updatedSessions);
      setHealthStats(stats);
      
      // Uncomment when backend is ready:
      // const response = await apiClient.get('/api/cctv-monitoring/sessions');
      // setSessions(response.data.data || []);
      // const stats = calculateHealthStats(response.data.data || []);
      // setHealthStats(stats);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      if (!loading) { // Don't show toast on initial load
        toast.error('Failed to fetch monitoring sessions');
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Calculate health statistics
  const calculateHealthStats = (sessionsList: CCTVSession[]): HealthStats => {
    const activeSessions = sessionsList.filter(s => s.status === 'active');
    const deadSessions = sessionsList.filter(s => s.status === 'dead');
    const healthySessions = sessionsList.filter(s => s.health_status === 'healthy');
    const totalScreenshots = sessionsList.reduce((sum, s) => sum + s.total_screenshots_captured, 0);

    return {
      total_sessions: sessionsList.length,
      active_sessions: activeSessions.length,
      healthy_sessions: healthySessions.length,
      dead_sessions: deadSessions.length,
      total_screenshots_today: totalScreenshots,
    };
  };

  // Fetch screenshots for a session
  const fetchSessionScreenshots = async (sessionId: number) => {
    setLoadingScreenshots(true);
    try {
      // Use mockup data for now
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setScreenshots(MOCKUP_SCREENSHOTS);
      
      // Uncomment when backend is ready:
      // const response = await apiClient.get(`/api/cctv-monitoring/sessions/${sessionId}/screenshots`);
      // setScreenshots(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching screenshots:', error);
      toast.error('Failed to load screenshots');
    } finally {
      setLoadingScreenshots(false);
    }
  };

  // View session details
  const viewSessionDetails = async (session: CCTVSession) => {
    setSelectedSession(session);
    setShowSessionModal(true);
    await fetchSessionScreenshots(session.id);
  };

  // Stop a session manually
  const handleStopSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to stop this monitoring session?')) {
      return;
    }

    try {
      await apiClient.post(`/api/cctv-monitoring/sessions/${sessionId}/stop`);
      toast.success('Session stopped successfully');
      fetchSessions();
    } catch (error: any) {
      console.error('Error stopping session:', error);
      toast.error(error.response?.data?.message || 'Failed to stop session');
    }
  };

  // Create new monitoring session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!createForm.delivery_order_id) {
      toast.error('Please select a delivery order');
      return;
    }
    if (!createForm.customer_name) {
      toast.error('Please select a customer');
      return;
    }
    if (!createForm.panel_row || !createForm.panel_column) {
      toast.error('Please specify panel location');
      return;
    }

    setCreatingSession(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new session object
      const newSession: CCTVSession = {
        id: sessions.length + 1,
        delivery_order_id: createForm.delivery_order_id,
        customer_location_index: createForm.customer_location_index,
        customer_name: createForm.customer_name,
        device_id: createForm.device_id || `BARDI-CAM-${String(sessions.length + 1).padStart(3, '0')}`,
        start_time: new Date().toISOString(),
        end_time: null,
        status: 'active',
        total_screenshots_captured: 0,
        last_screenshot_at: null,
        session_notes: `Panel Location: Row ${createForm.panel_row}, Column ${createForm.panel_column}`,
        created_nota_kecil_id: null,
        delivery_order: deliveryOrders.find(d => d.id === createForm.delivery_order_id),
        health_status: 'healthy',
        time_since_last_capture: 'No captures yet',
      };

      // Add to sessions list
      setSessions([...sessions, newSession]);
      
      // Update stats
      const updatedStats = {
        ...healthStats,
        total_sessions: healthStats.total_sessions + 1,
        active_sessions: healthStats.active_sessions + 1,
        healthy_sessions: healthStats.healthy_sessions + 1,
      };
      setHealthStats(updatedStats);

      toast.success(`Monitoring session created for ${createForm.customer_name}!`);
      setShowCreateModal(false);
      
      // Reset form
      setCreateForm({
        delivery_order_id: 0,
        customer_name: '',
        device_id: '',
        panel_row: 1,
        panel_column: 1,
        customer_location_index: 0,
      });

      // Uncomment when backend is ready:
      // const response = await apiClient.post('/api/cctv-monitoring/sessions', createForm);
      // fetchSessions();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error(error.response?.data?.message || 'Failed to create monitoring session');
    } finally {
      setCreatingSession(false);
    }
  };

  // Update BARDI session token
  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        cookies: sessionToken,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      };

      await apiClient.put('/api/bardi/session', payload);
      toast.success('BARDI session token updated successfully!');
      setShowTokenModal(false);
      
      // Refresh sessions to check if dead ones are now alive
      setTimeout(fetchSessions, 2000);
    } catch (error: any) {
      console.error('Error updating token:', error);
      toast.error(error.response?.data?.message || 'Failed to update session token');
    }
  };

  // Auto-refresh effect (DISABLED FOR NOW)
  useEffect(() => {
    // Initial load commented out - using static mockup data
    // fetchSessions();

    // Auto-refresh disabled
    // if (autoRefresh) {
    //   const interval = setInterval(() => {
    //     fetchSessions();
    //   }, 30000); // Refresh every 30 seconds
    //   return () => clearInterval(interval);
    // }
  }, [autoRefresh, fetchSessions]);

  // Get status badge color
  const getStatusBadge = (status: string, healthStatus?: string) => {
    if (status === 'dead' || healthStatus === 'dead') {
      return 'bg-red-100 text-red-800 border border-red-300';
    }
    if (status === 'active' && healthStatus === 'healthy') {
      return 'bg-green-100 text-green-800 border border-green-300';
    }
    if (status === 'active' && healthStatus === 'warning') {
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    }
    if (status === 'completed') {
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
    return 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const getStatusIcon = (status: string, healthStatus?: string) => {
    if (status === 'dead' || healthStatus === 'dead') {
      return <XCircle className="w-4 h-4" />;
    }
    if (status === 'active' && healthStatus === 'healthy') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status === 'active' && healthStatus === 'warning') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">CCTV Monitoring System</h1>
              <p className="text-gray-600">Real-time monitoring of CNG meter readings via BARDI cameras</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Session
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </button>
              <button
                onClick={() => setShowTokenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <Key className="w-4 h-4" />
                Update Session Token
              </button>
            </div>
          </div>
        </div>

        {/* Health Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{healthStats.total_sessions}</p>
              </div>
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Active Sessions</p>
                <p className="text-2xl font-bold text-blue-900">{healthStats.active_sessions}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Healthy</p>
                <p className="text-2xl font-bold text-green-900">{healthStats.healthy_sessions}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Dead Sessions</p>
                <p className="text-2xl font-bold text-red-900">{healthStats.dead_sessions}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Screenshots Today</p>
                <p className="text-2xl font-bold text-purple-900">{healthStats.total_screenshots_today}</p>
              </div>
              <ImageIcon className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Dead Sessions Alert */}
        {healthStats.dead_sessions > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold">
                  ⚠️ {healthStats.dead_sessions} Session{healthStats.dead_sessions > 1 ? 's' : ''} Dead!
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  BARDI session token may have expired. Please update the session token to resume monitoring.
                </p>
              </div>
              <button
                onClick={() => setShowTokenModal(true)}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Update Token Now
              </button>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monitoring Sessions</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No monitoring sessions found</p>
              <p className="text-sm text-gray-400 mt-2">Sessions will appear here when monitoring starts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Capture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screenshots</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">#{session.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{session.customer_name}</div>
                        <div className="text-xs text-gray-500">Location Index: {session.customer_location_index}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.delivery_order?.do_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status, session.health_status)}`}>
                          {getStatusIcon(session.status, session.health_status)}
                          {session.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(session.start_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {session.last_screenshot_at ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(session.last_screenshot_at).toLocaleTimeString()}
                            </div>
                            {session.time_since_last_capture && (
                              <div className="text-xs text-gray-500">{session.time_since_last_capture}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No captures yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          <ImageIcon className="w-3 h-3" />
                          {session.total_screenshots_captured}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewSessionDetails(session)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {session.status === 'active' && (
                            <button
                              onClick={() => handleStopSession(session.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Stop Session"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Session #{selectedSession.id} Details</h2>
                <p className="text-gray-600 mt-1">{selectedSession.customer_name}</p>
              </div>
              <button
                onClick={() => setShowSessionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Session Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">DO Number</p>
                  <p className="font-medium text-gray-900">{selectedSession.delivery_order?.do_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusBadge(selectedSession.status, selectedSession.health_status)}`}>
                    {selectedSession.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Screenshots</p>
                  <p className="font-medium text-gray-900">{selectedSession.total_screenshots_captured}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Device ID</p>
                  <p className="font-medium text-gray-900">{selectedSession.device_id || 'N/A'}</p>
                </div>
              </div>

              {/* Screenshots Gallery */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h3>
                
                {loadingScreenshots ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Loading screenshots...</p>
                  </div>
                ) : screenshots.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No screenshots captured yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {screenshots.map((screenshot) => (
                      <div key={screenshot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          <img
                            src={screenshot.screenshot_url}
                            alt={`Screenshot ${screenshot.sequence_number}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/svg%3E';
                            }}
                          />
                        </div>
                        <div className="p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">#{screenshot.sequence_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              screenshot.ocr_status === 'success' ? 'bg-green-100 text-green-700' :
                              screenshot.ocr_status === 'failed' ? 'bg-red-100 text-red-700' :
                              screenshot.ocr_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {screenshot.ocr_status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(screenshot.captured_at).toLocaleString()}
                          </p>
                          {screenshot.ocr_result && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {screenshot.ocr_result.meter_reading !== undefined && (
                                <p className="text-sm font-medium text-gray-900">
                                  Meter: {screenshot.ocr_result.meter_reading} m³
                                </p>
                              )}
                              {screenshot.ocr_confidence_score !== null && (
                                <p className="text-xs text-gray-500">
                                  Confidence: {(screenshot.ocr_confidence_score * 100).toFixed(0)}%
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create Monitoring Session</h2>
                  <p className="text-gray-600 mt-1">Start CCTV monitoring for a customer meter</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="p-6">
              <div className="space-y-4">
                {/* Delivery Order Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Order <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.delivery_order_id}
                    onChange={(e) => {
                      const selectedDO = deliveryOrders.find(d => d.id === parseInt(e.target.value));
                      setCreateForm({
                        ...createForm,
                        delivery_order_id: parseInt(e.target.value),
                        customer_name: selectedDO?.customer_name || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Delivery Order</option>
                    {deliveryOrders.map(do_order => (
                      <option key={do_order.id} value={do_order.id}>
                        {do_order.do_number} - {do_order.do_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({...createForm, customer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.name}>
                        {customer.name} {customer.address && `- ${customer.address}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Location Index */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Location Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.customer_location_index}
                    onChange={(e) => setCreateForm({...createForm, customer_location_index: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0 for main location, 1+ for additional"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = Primary location, 1+ = Additional unload locations</p>
                </div>

                {/* Panel Location - Row & Column */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Panel Row <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createForm.panel_row}
                      onChange={(e) => setCreateForm({...createForm, panel_row: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1-10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Panel Column <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createForm.panel_column}
                      onChange={(e) => setCreateForm({...createForm, panel_column: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1-10"
                      required
                    />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Panel Location:</strong> Specify which panel on the BARDI camera grid contains the meter you want to monitor.
                    For example, Row 2, Column 3 means the meter is in the 2nd row, 3rd column of the camera view.
                  </p>
                </div>

                {/* Device ID (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.device_id}
                    onChange={(e) => setCreateForm({...createForm, device_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-generated if left empty"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate BARDI camera ID</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingSession ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Start Monitoring
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingSession}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Token Update Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Update BARDI Session Token</h2>
                  <p className="text-gray-600 mt-1">Enter new session cookies from BARDI login</p>
                </div>
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateToken} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    s-sid
                  </label>
                  <input
                    type="text"
                    value={sessionToken['s-sid']}
                    onChange={(e) => setSessionToken({...sessionToken, 's-sid': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="s%3Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    s-sid.sig
                  </label>
                  <input
                    type="text"
                    value={sessionToken['s-sid.sig']}
                    onChange={(e) => setSessionToken({...sessionToken, 's-sid.sig': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    uid
                  </label>
                  <input
                    type="text"
                    value={sessionToken['uid']}
                    onChange={(e) => setSessionToken({...sessionToken, 'uid': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="xxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    clientId
                  </label>
                  <input
                    type="text"
                    value={sessionToken['clientId']}
                    onChange={(e) => setSessionToken({...sessionToken, 'clientId': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    deviceId
                  </label>
                  <input
                    type="text"
                    value={sessionToken['deviceId']}
                    onChange={(e) => setSessionToken({...sessionToken, 'deviceId': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Update Token
                </button>
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> To get these values, log in to BARDI web interface, open browser DevTools (F12),
                  go to Application → Cookies → ipc.bardi.co.id, and copy the cookie values.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVMonitoringPage;

