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
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MoreHorizontal
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
  nota_kecil_count?: number;
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
  status?: 'assigned' | 'at_spbu' | 'otw_to_unload_location' | 'at_unload_location' | 'completed' | 'cancelled';
}

interface Customer {
  id: number;
  customer_name?: string; // API field
  name?: string; // Fallback for mockup
  location?: string; // API field
  address?: string; // Fallback for mockup
}

interface CreateSessionForm {
  delivery_order_id: number;
  customer_name: string;
  device_id: string;
  panel_row: number;
  panel_column: number;
  customer_location_index: number;
}

// Session mockup data removed per requirement.

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

const DEFAULT_SESSION_TOKEN = {
  's-sid': '',
  's-sid.sig': 'kP9rtKAn17znXSNWGWFHK2iuqOOusfuo',
  'uid': 'az1760007796938NmNAy',
  'clientId': 'u8aphxps48jv38uraqtf',
  'deviceId': 'security-wisdom'
};

const CCTVMonitoringPage: React.FC = () => {
  // Configuration toggles
  const [useRealData, setUseRealData] = useState(true); // Toggle: false = mockup, true = real API (DEFAULT: ON)
  const [autoSnapshot, setAutoSnapshot] = useState(true); // Toggle: auto screenshot capture (DEFAULT: ON)
  const [devModeEnabled, setDevModeEnabled] = useState(false); // Toggle: show/hide dev controls
  
  // Initialize without mock sessions
  const [sessions, setSessions] = useState<CCTVSession[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    total_sessions: 0,
    active_sessions: 0,
    healthy_sessions: 0,
    dead_sessions: 0,
    total_screenshots_today: 0,
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // Enabled by default
  const [selectedSession, setSelectedSession] = useState<CCTVSession | null>(null);
  const [screenshots, setScreenshots] = useState<CCTVScreenshot[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // Session token form - default values, will be replaced by persisted token if available
  const [sessionToken, setSessionToken] = useState(DEFAULT_SESSION_TOKEN);
  const [mockDataNoticeShown, setMockDataNoticeShown] = useState(false);

  // Create session form
  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    delivery_order_id: 0,
    customer_name: '',
    device_id: '',
    panel_row: 1,
    panel_column: 1,
    customer_location_index: 0,
  });

  // Dropdowns - fetch real data
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>(MOCKUP_DELIVERY_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCKUP_CUSTOMERS);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [includeCompletedOrders, setIncludeCompletedOrders] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      if (!useRealData) {
        setSessions([]);
        setHealthStats({
          total_sessions: 0,
          active_sessions: 0,
          healthy_sessions: 0,
          dead_sessions: 0,
          total_screenshots_today: 0,
        });
        setTotalSessions(0);
        if (!mockDataNoticeShown) {
          toast('Dev mode mock sessions removed. Enable Real Data to see sessions.', {
            icon: 'ℹ️',
          });
          setMockDataNoticeShown(true);
        }
        return;
      } else if (mockDataNoticeShown) {
        setMockDataNoticeShown(false);
      }

      // Use real API with pagination
      const response = await apiClient.get('/cctv-monitoring/sessions', {
        params: {
          limit: sessionsPerPage,
          offset: (currentPage - 1) * sessionsPerPage
        }
      });
      setSessions(response.data.data || []);
      setHealthStats(response.data.stats || {});
      setTotalSessions(response.data.pagination?.total || response.data.data?.length || 0);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      if (!loading) { // Don't show toast on initial load
        toast.error('Failed to fetch monitoring sessions');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, useRealData, currentPage, sessionsPerPage]);

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
      if (useRealData) {
        // Use real API
        const response = await apiClient.get(`/cctv-monitoring/sessions/${sessionId}/screenshots`);
        setScreenshots(response.data.data || []);
      } else {
        // Use mockup data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        setScreenshots(MOCKUP_SCREENSHOTS);
      }
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
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/stop`);
      toast.success('Session stopped successfully');
      fetchSessions();
    } catch (error: any) {
      console.error('Error stopping session:', error);
      toast.error(error.response?.data?.message || 'Failed to stop session');
    }
  };

  // Resume a stopped/dead session
  const handleResumeSession = async (sessionId: number) => {
    try {
      toast.loading('Resuming session...', { id: `resume-${sessionId}` });
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/restart`);
      toast.success('Session resumed successfully', { id: `resume-${sessionId}` });
      fetchSessions();
    } catch (error: any) {
      console.error('Error resuming session:', error);
      toast.error(error.response?.data?.message || 'Failed to resume session', { id: `resume-${sessionId}` });
    }
  };

  // Complete a session
  const handleCompleteSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to mark this session as completed? This action cannot be undone.')) {
      return;
    }

    try {
      toast.loading('Completing session...', { id: `complete-${sessionId}` });
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/complete`);
      toast.success('Session marked as completed', { id: `complete-${sessionId}` });
      fetchSessions();
    } catch (error: any) {
      console.error('Error completing session:', error);
      toast.error(error.response?.data?.message || 'Failed to complete session', { id: `complete-${sessionId}` });
    }
  };

  const calculateActionMenuCoordinates = (trigger: HTMLElement) => {
    const menuWidth = 220;
    const padding = 8;
    const rect = trigger.getBoundingClientRect();
    const top = rect.bottom + 6;
    const left = Math.min(
      window.innerWidth - menuWidth - padding,
      Math.max(padding, rect.right - menuWidth)
    );
    return { top, left };
  };

  const handleActionMenuToggle = (sessionId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (actionMenuOpenId === sessionId) {
      setActionMenuOpenId(null);
      setActionMenuPosition(null);
      return;
    }

    setActionMenuOpenId(sessionId);
    setActionMenuPosition(calculateActionMenuCoordinates(event.currentTarget));
  };

  const closeActionMenu = () => {
    setActionMenuOpenId(null);
    setActionMenuPosition(null);
  };

  useEffect(() => {
    if (!actionMenuOpenId) {
      return;
    }

    const handleReposition = () => {
      const trigger = document.querySelector(
        `[data-session-action-trigger="${actionMenuOpenId}"]`
      ) as HTMLElement | null;

      if (!trigger) {
        closeActionMenu();
        return;
      }

      setActionMenuPosition(calculateActionMenuCoordinates(trigger));
    };

    handleReposition();

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [actionMenuOpenId]);

  // Manual snapshot capture
  const handleManualSnapshot = async (sessionId: number) => {
    try {
      toast.loading('Capturing screenshot...', { id: 'manual-snapshot' });
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/capture`, {
        process_ocr: true,
        notes: 'Manual snapshot'
      });
      toast.success('Screenshot captured successfully', { id: 'manual-snapshot' });
      if (selectedSession && selectedSession.id === sessionId) {
        fetchSessionScreenshots(sessionId);
      }
      fetchSessions(); // Refresh to update screenshot count
    } catch (error: any) {
      console.error('Error capturing snapshot:', error);
      toast.error(error.response?.data?.message || 'Failed to capture screenshot', { id: 'manual-snapshot' });
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
      if (useRealData) {
        // Debug logging
        console.log('🔍 DEBUG - Creating session with form data:', {
          panel_row: createForm.panel_row,
          panel_column: createForm.panel_column,
          panel_row_type: typeof createForm.panel_row,
          panel_column_type: typeof createForm.panel_column
        });
        
        // Use real API
        const requestBody = {
          delivery_order_id: createForm.delivery_order_id,
          customer_name: createForm.customer_name,
          customer_location_index: createForm.customer_location_index,
          device_id: createForm.device_id,
          panel_row: createForm.panel_row,
          panel_column: createForm.panel_column,
        };
        
        console.log('🔍 DEBUG - Request body being sent:', requestBody);
        
        const response = await apiClient.post('/cctv-monitoring/sessions', requestBody);
        
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
        
        // Refresh sessions list
        fetchSessions();
      } else {
        // Mockup mode - simulate API call
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
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error(error.response?.data?.message || 'Failed to create monitoring session');
    } finally {
      setCreatingSession(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      if (useRealData) {
        await apiClient.delete(`/cctv-monitoring/sessions/${sessionId}`);
        toast.success('Session deleted successfully');
        fetchSessions(); // Refresh list
      } else {
        // Mockup mode
        setSessions(sessions.filter(s => s.id !== sessionId));
        toast.success('Session deleted (mockup mode)');
      }
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  // Update BARDI session token
  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Use the CCTV monitoring endpoint for token update
      await apiClient.put('/cctv-monitoring/bardi-token', {
        session_token: sessionToken,
      });
      toast.success('BARDI session token updated successfully!');
      setShowTokenModal(false);
      
      // Refresh sessions immediately and again after captures finish
      fetchSessions();
      setTimeout(fetchSessions, 3000);
      setTimeout(fetchSessions, 10000);
    } catch (error: any) {
      console.error('Error updating token:', error);
      toast.error(error.response?.data?.message || 'Failed to update session token');
    }
  };

  // Fetch delivery orders and customers when using real data
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (useRealData) {
        setLoadingDropdowns(true);
        try {
          // Fetch delivery orders (not completed or cancelled)
          // Valid statuses: assigned, at_spbu, otw_to_unload_location, at_unload_location
          const doResponse = await apiClient.get('/delivery-orders');
          console.log('Delivery orders response:', doResponse.data);
          
          // Handle response format - could be {success: true, data: [...]} or just [...]
          let orders = [];
          if (doResponse.data?.success && doResponse.data?.data) {
            orders = doResponse.data.data;
          } else if (Array.isArray(doResponse.data)) {
            orders = doResponse.data;
          } else {
            orders = [];
          }
          
          console.log('All delivery orders:', orders.length, orders);
          
          // Filter out completed and cancelled orders (unless includeCompletedOrders is true)
          const activeOrders = includeCompletedOrders 
            ? orders 
            : orders.filter(
                (order: any) => order.status !== 'completed' && order.status !== 'cancelled'
              );
          
          console.log('Active delivery orders (filtered):', activeOrders.length, activeOrders);
          
          if (!includeCompletedOrders && orders.length > 0 && activeOrders.length === 0) {
            console.warn('All delivery orders are completed or cancelled. No active orders available.');
            toast(`Found ${orders.length} delivery order(s), but all are completed/cancelled. Enable "Include Completed Orders" or create an active delivery order.`, {
              icon: '⚠️',
              duration: 5000,
            });
          }
          
          setDeliveryOrders(activeOrders);
          
          // Fetch customers
          const customerResponse = await apiClient.get('/customers');
          console.log('Customers response FULL:', customerResponse);
          console.log('Customers response.data:', customerResponse.data);
          console.log('Type of response.data:', typeof customerResponse.data);
          console.log('response.data.customers exists?', !!customerResponse.data?.customers);
          console.log('response.data.data exists?', !!customerResponse.data?.data);
          
          // Handle response format: {success: true, data: {customers: [...], pagination: {...}}}
          // OR the axios interceptor might unwrap it to: {customers: [...], pagination: {...}}
          let customersData = [];
          
          // Check if response.data.customers exists directly (interceptor unwrapped it)
          if (customerResponse.data?.customers && Array.isArray(customerResponse.data.customers)) {
            customersData = customerResponse.data.customers;
            console.log('✅ Found customers in response.data.customers (unwrapped by interceptor):', customersData.length);
          }
          // Check if response.data.data.customers exists (full response)
          else if (customerResponse.data?.success && customerResponse.data?.data?.customers && Array.isArray(customerResponse.data.data.customers)) {
            customersData = customerResponse.data.data.customers;
            console.log('✅ Found customers in data.data.customers:', customersData.length);
          } 
          // Check if data.data itself is an array
          else if (customerResponse.data?.success && Array.isArray(customerResponse.data?.data)) {
            customersData = customerResponse.data.data;
            console.log('✅ Found customers in data.data (array):', customersData.length);
          }
          // Check if response.data is directly an array
          else if (Array.isArray(customerResponse.data)) {
            customersData = customerResponse.data;
            console.log('✅ Found customers in root (array):', customersData.length);
          } else {
            console.warn('⚠️ Customer response not in expected format. Structure:', Object.keys(customerResponse.data || {}));
          }
          
          console.log('Parsed customers:', customersData);
          
          if (customersData.length === 0) {
            console.error('❌ No customers loaded from API');
            toast('No customers found in database. Please create customers first.', {
              icon: '⚠️',
              duration: 4000,
            });
          }
          
          setCustomers(customersData);
        } catch (error: any) {
          console.error('Error fetching dropdown data:', error);
          // Fall back to mockup data on error
          setDeliveryOrders(MOCKUP_DELIVERY_ORDERS);
          setCustomers(MOCKUP_CUSTOMERS);
          toast.error('Failed to load delivery orders. Using demo data.');
        } finally {
          setLoadingDropdowns(false);
        }
      } else {
        // Use mockup data when not in real data mode
        setDeliveryOrders(MOCKUP_DELIVERY_ORDERS);
        setCustomers(MOCKUP_CUSTOMERS);
      }
    };
    
    fetchDropdownData();
  }, [useRealData, includeCompletedOrders]);

  // Auto-refresh effect
  useEffect(() => {
    // Initial load
    fetchSessions();

    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSessions();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchSessions, useRealData]);
  
  // Load persisted BARDI session token on mount
  useEffect(() => {
    const loadSavedToken = async () => {
      try {
        const response = await apiClient.get('/cctv-monitoring/bardi-token');
        const savedToken = response.data?.data?.session_token;
        if (savedToken) {
          setSessionToken(prev => ({
            ...prev,
            ...savedToken,
          }));
        }
      } catch (error) {
        console.error('Error loading saved BARDI token:', error);
      }
    };

    loadSavedToken();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.session-actions-trigger') && !target.closest('.session-actions-dropdown')) {
        setActionMenuOpenId(null);
        setActionMenuPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'dead':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 border border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getStatusIcon = (status: string, healthStatus?: string) => {
    if (status === 'dead') {
      return <XCircle className="w-4 h-4" />;
    }
    if (status === 'active') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status === 'completed') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status === 'stopped') {
      return <StopCircle className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  };

  const handleOpenNotaManagement = () => {
    window.open('/operations/nota-management', '_blank');
  };

  const activeActionMenuSession = actionMenuOpenId
    ? sessions.find((session) => session.id === actionMenuOpenId)
    : null;

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
            <div className="flex flex-col gap-3 items-end">
              <div className="flex flex-wrap items-center gap-3 justify-end">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Session
                </button>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Update Token
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 justify-end">
                {devModeEnabled && (
                  <>
                    {/* Slide Toggle: Real Data */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Real Data:</span>
                      <button
                        onClick={() => {
                          setUseRealData(!useRealData);
                          toast.success(useRealData ? 'Switched to Mockup Data' : 'Switched to Real API Data');
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          useRealData ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                        title={useRealData ? 'Using Real API Data' : 'Using Mockup Data'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            useRealData ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${useRealData ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
                        {useRealData ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    {/* Slide Toggle: Auto Snapshot */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Auto-Snapshot:</span>
                      <button
                        onClick={async () => {
                          const previousValue = autoSnapshot;
                          const newValue = !autoSnapshot;
                          
                          if (useRealData) {
                            try {
                              if (newValue && !previousValue) {
                                // Turning ON (OFF → ON): Start scheduler + immediate capture
                                toast.loading('Starting scheduler...');
                                
                                await apiClient.post('/cctv-monitoring/scheduler/start');
                                
                                // Trigger immediate capture for all active sessions (runs in background)
                                const captureResult = await apiClient.post('/cctv-monitoring/scheduler/capture-all', {}, {
                                  timeout: 5000 // 5 second timeout for initial response
                                });
                                
                                setAutoSnapshot(newValue);
                                toast.dismiss();
                                
                                const data = captureResult.data.data;
                                if (data.status === 'processing') {
                                  toast.success(`Scheduler started! Capturing ${data.totalSessions} session(s) in background...`);
                                } else if (data.totalSessions === 0) {
                                  toast.success('Scheduler started! No active sessions to capture');
                                } else {
                                  toast.success(`Scheduler started! Captured ${data.captured || data.totalSessions} session(s)`);
                                }
                                
                                // Refresh sessions after a delay to see captured screenshots
                                setTimeout(() => fetchSessions(), 3000);
                              } else if (!newValue && previousValue) {
                                // Turning OFF (ON → OFF): Stop scheduler
                                await apiClient.post('/cctv-monitoring/scheduler/stop');
                                setAutoSnapshot(newValue);
                                toast.success('Auto-snapshot disabled - scheduler stopped');
                              }
                            } catch (error: any) {
                              console.error('Error toggling scheduler:', error);
                              toast.dismiss();
                              toast.error(`Failed to ${newValue ? 'start' : 'stop'} auto-snapshot: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
                              // Don't change toggle state on error
                            }
                          } else {
                            // Mockup mode
                            setAutoSnapshot(newValue);
                            toast.success(newValue ? 'Auto-snapshot enabled (mockup mode)' : 'Auto-snapshot disabled (mockup mode)');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          autoSnapshot ? 'bg-blue-600' : 'bg-orange-500'
                        }`}
                        title={autoSnapshot ? 'Automatic snapshots enabled - captures every 10min and creates nota after 4hrs' : 'Manual snapshots only'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoSnapshot ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${autoSnapshot ? 'text-blue-600 font-semibold' : 'text-orange-600 font-semibold'}`}>
                        {autoSnapshot ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    {/* Slide Toggle: Auto Refresh */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Auto-Refresh:</span>
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          autoRefresh ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoRefresh ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${autoRefresh ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                        {autoRefresh ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </>
                )}

                {/* Slide Toggle: Dev Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Dev Mode:</span>
                  <button
                    onClick={() => setDevModeEnabled(!devModeEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                      devModeEnabled ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                    title="Toggle developer tools visibility"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        devModeEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs ${devModeEnabled ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                    {devModeEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Indicators */}
        <div className="mb-4 flex gap-3">
          {!useRealData && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 font-medium">Using Mockup Data - Switch to Real Data to connect to API</span>
            </div>
          )}
          {!autoSnapshot && useRealData && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              <Camera className="w-4 h-4 text-orange-600" />
              <span className="text-orange-800 font-medium">Manual Snapshot Mode - Use the camera icon to capture screenshots</span>
            </div>
          )}
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
            <div className="overflow-x-auto overflow-y-visible relative">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota Kecils</th>
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
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
                        <button
                          onClick={handleOpenNotaManagement}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors"
                          title="View Nota Management"
                        >
                          <ClipboardList className="w-3 h-3" />
                          {session.nota_kecil_count ?? 0}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          data-session-action-trigger={session.id}
                          onClick={(event) => handleActionMenuToggle(session.id, event)}
                          className="session-actions-trigger p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Open actions menu"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalSessions > sessionsPerPage && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * sessionsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * sessionsPerPage, totalSessions)}</span> of{' '}
                    <span className="font-medium">{totalSessions}</span> sessions
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(totalSessions / sessionsPerPage) }, (_, i) => i + 1)
                        .filter(pageNum => {
                          // Show first, last, current, and 1 before/after current
                          const totalPages = Math.ceil(totalSessions / sessionsPerPage);
                          return pageNum === 1 || 
                                 pageNum === totalPages || 
                                 Math.abs(pageNum - currentPage) <= 1;
                        })
                        .map((pageNum, idx, array) => {
                          // Add ellipsis between non-consecutive pages
                          const prevPage = array[idx - 1];
                          const showEllipsis = prevPage && pageNum - prevPage > 1;
                          
                          return (
                            <React.Fragment key={pageNum}>
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalSessions / sessionsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(totalSessions / sessionsPerPage)}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>

    {actionMenuOpenId && actionMenuPosition && activeActionMenuSession && (
      <div
        className="session-actions-dropdown fixed z-50 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
        style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
      >
        <div className="py-1">
          <button
            onClick={() => {
              closeActionMenu();
              viewSessionDetails(activeActionMenuSession);
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-blue-500" />
            View Details
          </button>

          {activeActionMenuSession.status === 'active' && !autoSnapshot && useRealData && (
            <button
              onClick={() => {
                closeActionMenu();
                handleManualSnapshot(activeActionMenuSession.id);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-green-500" />
              Manual Snapshot
            </button>
          )}

          {activeActionMenuSession.status === 'active' && (
            <button
              onClick={() => {
                closeActionMenu();
                handleStopSession(activeActionMenuSession.id);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4 text-red-500" />
              Stop Session
            </button>
          )}

          {['stopped', 'dead'].includes(activeActionMenuSession.status) && (
            <button
              onClick={() => {
                closeActionMenu();
                handleResumeSession(activeActionMenuSession.id);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4 text-green-500" />
              Resume Session
            </button>
          )}

          {activeActionMenuSession.status !== 'completed' && (
            <button
              onClick={() => {
                closeActionMenu();
                handleCompleteSession(activeActionMenuSession.id);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Mark Completed
            </button>
          )}

          <button
            onClick={() => {
              closeActionMenu();
              handleDeleteSession(activeActionMenuSession.id);
            }}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Session
          </button>
        </div>
      </div>
    )}

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
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusBadge(selectedSession.status)}`}>
                    {selectedSession.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Screenshots</p>
                  <p className="font-medium text-gray-900">{selectedSession.total_screenshots_captured}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nota Kecils Created</p>
                  <button
                    onClick={handleOpenNotaManagement}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold hover:bg-purple-100 transition-colors mt-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    {selectedSession.nota_kecil_count ?? 0}
                  </button>
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
              {/* Real Data Mode Indicator */}
              {useRealData && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Real Data Mode:</strong> Using actual delivery orders and customers from the database
                  </p>
                </div>
              )}
              
              {/* Include Completed Orders Checkbox */}
              {useRealData && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCompletedOrders}
                      onChange={(e) => setIncludeCompletedOrders(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Include completed/cancelled delivery orders
                    </span>
                    <span className="text-xs text-gray-500">(for testing purposes)</span>
                  </label>
                </div>
              )}
              
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
                    disabled={loadingDropdowns}
                    required
                  >
                    <option value="">
                      {loadingDropdowns ? 'Loading delivery orders...' : 'Select Delivery Order'}
                    </option>
                    {deliveryOrders.map(do_order => (
                      <option key={do_order.id} value={do_order.id}>
                        {do_order.do_number} - {do_order.do_name}
                      </option>
                    ))}
                  </select>
                  {useRealData && deliveryOrders.length === 0 && !loadingDropdowns && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No active delivery orders found. Create one first.
                    </p>
                  )}
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
                    disabled={loadingDropdowns}
                    required
                  >
                    <option value="">
                      {loadingDropdowns ? 'Loading customers...' : 'Select Customer'}
                    </option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.customer_name || customer.name || ''}>
                        {customer.customer_name || customer.name || 'Unknown'} {customer.location && `- ${customer.location}`}
                      </option>
                    ))}
                  </select>
                  {useRealData && customers.length === 0 && !loadingDropdowns && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No customers found. Create a customer first.
                    </p>
                  )}
                  {useRealData && !loadingDropdowns && (
                    <p className="text-xs text-gray-500 mt-1">
                      {customers.length} customer(s) loaded
                    </p>
                  )}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setCreateForm({...createForm, panel_row: isNaN(val) ? 1 : val});
                      }}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setCreateForm({...createForm, panel_column: isNaN(val) ? 1 : val});
                      }}
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
                  <p className="text-gray-600 mt-1">Only update the <strong>s-sid</strong> field - other fields use default values</p>
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
              {/* Info Box */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Quick Update:</strong> Only the <strong>s-sid</strong> field needs to be updated regularly. 
                  The other fields below already have default values pre-filled.
                </p>
              </div>

              <div className="space-y-4">
                {/* s-sid - PRIMARY FIELD TO UPDATE */}
                <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <label className="block text-sm font-bold text-yellow-900 mb-1">
                    s-sid <span className="text-red-500">*</span> <span className="text-xs font-normal">(Update this field)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionToken['s-sid']}
                    onChange={(e) => setSessionToken({...sessionToken, 's-sid': e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                    placeholder="Paste new s-sid value here"
                    required
                  />
                  <p className="text-xs text-yellow-700 mt-1">
                    Copy this from BARDI cookies (DevTools → Application → Cookies → s-sid)
                  </p>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500 mb-2">Default Values (Usually don't need to change):</p>
                </div>

                {/* s-sid.sig - DEFAULT */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    s-sid.sig <span className="text-xs text-gray-500">(Default value pre-filled)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionToken['s-sid.sig']}
                    onChange={(e) => setSessionToken({...sessionToken, 's-sid.sig': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="kP9rtKAn17znXSNWGWFHK2iuqOOusfuo"
                  />
                </div>

                {/* uid - DEFAULT */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    uid <span className="text-xs text-gray-500">(Default value pre-filled)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionToken['uid']}
                    onChange={(e) => setSessionToken({...sessionToken, 'uid': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="az1760007796938NmNAy"
                  />
                </div>

                {/* clientId - DEFAULT */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    clientId <span className="text-xs text-gray-500">(Default value pre-filled)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionToken['clientId']}
                    onChange={(e) => setSessionToken({...sessionToken, 'clientId': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="u8aphxps48jv38uraqtf"
                  />
                </div>

                {/* deviceId - DEFAULT */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    deviceId <span className="text-xs text-gray-500">(Default value pre-filled)</span>
                  </label>
                  <input
                    type="text"
                    value={sessionToken['deviceId']}
                    onChange={(e) => setSessionToken({...sessionToken, 'deviceId': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="security-wisdom"
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

              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>How to get s-sid:</strong> Log in to BARDI web interface → Open DevTools (F12) → 
                  Application tab → Cookies → ipc.bardi.co.id → Copy the <strong>s-sid</strong> value
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


