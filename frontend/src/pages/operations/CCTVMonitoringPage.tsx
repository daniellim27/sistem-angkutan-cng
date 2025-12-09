// src/pages/operations/CCTVMonitoringPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
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
  AlertCircle,
  Save,
  MoreHorizontal
} from 'lucide-react';

interface CCTVSession {
  id: number;
  delivery_order_id: number | null; // Now nullable - DOs are auto-generated
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
  meter_type?: 'temperature' | 'pressure' | 'stan_awal' | 'stan_akhir' | 'other' | null;
  delivery_order?: {
    do_number: string;
    do_name: string;
  } | null; // Optional - may be null if no DO assigned
  health_status?: 'healthy' | 'warning' | 'critical' | 'dead';
  time_since_last_capture?: string;
  nota_kecil_count?: number;
}

interface CCTVScreenshot {
  id: number;
  session_id: number;
  screenshot_url: string | null;
  captured_at: string;
  ocr_status: 'pending' | 'processing' | 'success' | 'failed';
  ocr_result: {
    meter_reading?: number;
    pressure?: number;
    temperature?: number;
    tekanan_operasi?: number;
    temperatur_operasi?: number;
    [key: string]: any; // Allow other fields
  } | null;
  ocr_confidence_score: number | null;
  ocr_raw_response?: any;
  ocr_error_message?: string | null;
  ocr_processed_at?: string | null;
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
  meter_type: 'stan' | 'pressure_inlet' | 'pressure_outlet' | 'temperature';  // NEW: 4 specific types
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
  // Manual OCR modal state
  const [manualOcrTarget, setManualOcrTarget] = useState<CCTVScreenshot | null>(null);
  const [manualForm, setManualForm] = useState<{
    pressure_inlet: string;
    pressure_outlet: string;
    stan: string;
    temperature: string;
  }>({
    pressure_inlet: '',
    pressure_outlet: '',
    stan: '',
    temperature: '',
  });
  // Screenshot actions menu state
  const [screenshotMenuOpenId, setScreenshotMenuOpenId] = useState<number | null>(null);
  // OCR details view modal state
  const [viewingOcrDetails, setViewingOcrDetails] = useState<CCTVScreenshot | null>(null);

  // Session token form - default values, will be replaced by persisted token if available
  const [sessionToken, setSessionToken] = useState(DEFAULT_SESSION_TOKEN);
  const [mockDataNoticeShown, setMockDataNoticeShown] = useState(false);

  // Create session form
  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    delivery_order_id: 0, // Optional - kept for backward compatibility but not required
    customer_name: '',
    device_id: '',
    panel_row: 1,
    panel_column: 1,
    customer_location_index: 0,
    meter_type: 'stan',  // Default to stan
  });

  // Customer filter for sessions list
  const [customerFilter, setCustomerFilter] = useState<string>('');

  // Dropdowns - fetch real data (only customers now, DOs are auto-generated)
  const [customers, setCustomers] = useState<Customer[]>(MOCKUP_CUSTOMERS);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [updatingToken, setUpdatingToken] = useState(false);
  const [capturingSessionId, setCapturingSessionId] = useState<number | null>(null);

  const handleManualCapture = async (sessionId: number) => {
    setCapturingSessionId(sessionId);

    try {
      const response = await apiClient.post(
        `/cctv-monitoring/sessions/${sessionId}/capture`,
        { process_ocr: true }   // this is exactly what your backend expects
      );

      toast.success('Test snapshot captured! Check gallery in 10 seconds');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Capture failed';
      toast.error(`Test failed: ${message}`);
    } finally {
      // Clear spinner after a few seconds
      setTimeout(() => setCapturingSessionId(null), 3000);
    }
  };

  const [simpleToken, setSimpleToken] = useState({
    s_sid: '',
    s_sid_sig: '',
    error: '',
  });

  const handleSimpleTokenUpdate = async () => {
    if (!simpleToken.s_sid.startsWith('s:')) {
      setSimpleToken({ ...simpleToken, error: 's-sid must start with "s:"' });
      return;
    }

    setUpdatingToken(true);
    setSimpleToken({ ...simpleToken, error: '' });

    try {
      const response = await apiClient.put('/cctv-monitoring/bardi-token', {
        session_token: {
          's-sid': simpleToken.s_sid,
          's-sid.sig': simpleToken.s_sid_sig,
        },
      });

      toast.success('BARDI token updated! Sessions resuming...');
      setShowTokenModal(false);
      // Refresh sessions list
      fetchSessions();
    } catch (err: any) {
      setSimpleToken({
        ...simpleToken,
        error: err.response?.data?.message || 'Failed to update token',
      });
    } finally {
      setUpdatingToken(false);
    }
  };

  const [tokenForm, setTokenForm] = useState({
    sessionJson: '',
    testConnection: true,
    error: '',
  });

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

      setLoading(true);
      
      const params: any = {
          limit: sessionsPerPage,
          offset: (currentPage - 1) * sessionsPerPage
      };
      
      // Add customer filter if specified
      if (customerFilter) {
        params.customer_name = customerFilter;
        }
      
      const response = await apiClient.get('/cctv-monitoring/sessions', { params });

      console.log('🔍 RAW API RESPONSE:', JSON.stringify(response.data, null, 2));

      let sessionsData: CCTVSession[] = [];
      let statsData: HealthStats = {
        total_sessions: 0,
        active_sessions: 0,
        healthy_sessions: 0,
        dead_sessions: 0,
        total_screenshots_today: 0,
      };
      let totalCount = 0;

      // 🎯 YOUR EXACT FORMAT FIRST!
      if (response.data?.rows && Array.isArray(response.data.rows)) {
        console.log('✅ DETECTED YOUR FORMAT: { success, count, rows }');
        sessionsData = response.data.rows;
        statsData = calculateHealthStats(sessionsData);
        totalCount = response.data.count || sessionsData.length;
      } 
      else if (response.data?.data && Array.isArray(response.data.data)) {
        sessionsData = response.data.data;
        statsData = response.data.stats || calculateHealthStats(sessionsData);
        totalCount = response.data.pagination?.total || response.data.total || sessionsData.length;
      } 
      else if (Array.isArray(response.data)) {
        sessionsData = response.data;
        statsData = calculateHealthStats(sessionsData);
        totalCount = response.data.length;
      } 
      else if (response.data?.sessions && Array.isArray(response.data.sessions)) {
        sessionsData = response.data.sessions;
        statsData = response.data.stats || calculateHealthStats(sessionsData);
        totalCount = response.data.pagination?.total || response.data.total || sessionsData.length;
      } 
      else if (response.data && Array.isArray(response.data.results)) {
        sessionsData = response.data.results;
        statsData = calculateHealthStats(sessionsData);
        totalCount = response.data.count || sessionsData.length;
      }
      else {
        console.warn('⚠️ Unexpected response format:', response.data);
        sessionsData = [];
        totalCount = 0;
      }

      console.log('✅ PARSED SESSIONS COUNT:', sessionsData.length);
      console.log('✅ TOTAL COUNT:', totalCount);

      // ✅ BATCH ALL SETSTATE CALLS TOGETHER
      setSessions(sessionsData);
      setHealthStats(statsData);
      setTotalSessions(totalCount);

      if (sessionsData.length > 0) {
        toast.success(`✅ Loaded ${sessionsData.length} session${sessionsData.length > 1 ? 's' : ''}!`, {
          duration: 2000
        });
      }

    } catch (error: any) {
      console.error('❌ Error fetching sessions:', error);
      setSessions([]);
      setHealthStats({
        total_sessions: 0,
        active_sessions: 0,
        healthy_sessions: 0,
        dead_sessions: 0,
        total_screenshots_today: 0,
      });
      setTotalSessions(0);
      
      toast.error(`Failed to fetch sessions: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [useRealData, currentPage, sessionsPerPage, mockDataNoticeShown, customerFilter]); // ✅ Added customerFilter dependency

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
      toast.loading('Capturing screenshot... This may take up to 2 minutes.', { id: 'manual-snapshot' });
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/capture`, {
        process_ocr: true,
        notes: 'Manual snapshot'
      }, {
        timeout: 120000 // 2 minutes timeout for screenshot capture (browser automation can take time)
      });
      toast.success('Screenshot captured successfully', { id: 'manual-snapshot' });
      if (selectedSession && selectedSession.id === sessionId) {
        fetchSessionScreenshots(sessionId);
      }
      fetchSessions(); // Refresh to update screenshot count
    } catch (error: any) {
      console.error('Error capturing snapshot:', error);
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Screenshot capture is taking longer than expected. Please check the backend logs or try again.', { id: 'manual-snapshot', duration: 5000 });
      } else {
        toast.error(error.response?.data?.message || 'Failed to capture screenshot', { id: 'manual-snapshot' });
      }
    }
  };

  // Create new monitoring session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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
        
        // Use real API - delivery_order_id is now optional
        const requestBody: any = {
          customer_name: createForm.customer_name,
          customer_location_index: createForm.customer_location_index,
          device_id: createForm.device_id || null,
          panel_row: createForm.panel_row,
          panel_column: createForm.panel_column,
          meter_type: createForm.meter_type,  // KEEP THIS - tells OCR which field to extract
          // Backend will now extract ONLY the selected field from the 4 available readings
        };
        
        // Only include delivery_order_id if it's actually set (not 0 or empty)
        if (createForm.delivery_order_id && createForm.delivery_order_id > 0) {
          requestBody.delivery_order_id = createForm.delivery_order_id;
        }
        
        console.log('🔍 DEBUG - Request body being sent:', requestBody);
        
        const response = await apiClient.post('/cctv-monitoring/sessions', requestBody);
        
        toast.success(`Monitoring session created for ${createForm.customer_name}!`);
        setShowCreateModal(false);
        
        // Reset form
        setCreateForm({
          delivery_order_id: 0, // Keep for form state, but won't be sent to API
          customer_name: '',
          device_id: '',
          panel_row: 1,
          panel_column: 1,
          customer_location_index: 0,
          meter_type: 'stan',
        });
        
        // Refresh sessions list
        fetchSessions();
      } else {
        // Mockup mode - simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create new session object
        const newSession: CCTVSession = {
          id: sessions.length + 1,
          delivery_order_id: createForm.delivery_order_id || null, // Optional
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
          delivery_order: null, // DOs are auto-generated, not needed in mockup
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
          delivery_order_id: 0, // Keep for form state, but won't be sent to API
          customer_name: '',
          device_id: '',
          panel_row: 1,
          panel_column: 1,
          customer_location_index: 0,
          meter_type: 'stan',
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

  // Recalibrate nota kecil creation
  const handleRecalibrateNotaKecil = async (sessionId: number) => {
    if (!window.confirm('This will recalculate nota kecil creation for all batches (including partial batches) in this session. Existing nota kecils for these batches will be deleted and recreated. Continue?')) {
      return;
    }

    try {
      toast.loading('Recalibrating nota kecil creation...', { id: `recalibrate-${sessionId}` });
      await apiClient.post(`/cctv-monitoring/sessions/${sessionId}/recalibrate-nota-kecil`);
      toast.success('Nota kecil recalibration completed', { id: `recalibrate-${sessionId}` });
      fetchSessions(); // Refresh list
      if (selectedSession?.id === sessionId) {
        fetchSessionScreenshots(sessionId); // Refresh screenshots if viewing this session
      }
    } catch (error: any) {
      console.error('Error recalibrating nota kecil:', error);
      toast.error(error.response?.data?.message || 'Failed to recalibrate nota kecil', { id: `recalibrate-${sessionId}` });
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

  // Fetch customers when using real data (DOs are now auto-generated, no need to fetch)
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (useRealData) {
        setLoadingDropdowns(true);
        try {
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
          setCustomers(MOCKUP_CUSTOMERS);
          toast.error('Failed to load customers. Using demo data.');
        } finally {
          setLoadingDropdowns(false);
        }
      } else {
        // Use mockup data when not in real data mode
        setCustomers(MOCKUP_CUSTOMERS);
      }
    };
    
    fetchDropdownData();
  }, [useRealData]);

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
      if (!target.closest('.screenshot-actions-trigger') && !target.closest('.screenshot-actions-dropdown')) {
        setScreenshotMenuOpenId(null);
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
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Monitoring Sessions</h2>
            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter by Customer:</label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Customers</option>
                {Array.from(new Set(sessions.map(s => s.customer_name))).map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
              {customerFilter && (
                <button
                  onClick={() => {
                    setCustomerFilter('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              )}
            </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter Type</th>
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
                        {/* <div className="text-xs text-gray-500">Location Index: {session.customer_location_index}</div> */}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.delivery_order?.do_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium">
                          {createForm.meter_type === 'stan' ? (
                            <span className="bg-blue-100 text-blue-800">📏 Stan</span>
                          ) : createForm.meter_type === 'pressure_inlet' ? (
                            <span className="bg-red-100 text-red-800">🔧 P.Inlet</span>
                          ) : createForm.meter_type === 'pressure_outlet' ? (
                            <span className="bg-orange-100 text-orange-800">🔧 P.Outlet</span>
                          ) : (
                            <span className="bg-green-100 text-green-800">🌡️ Temp</span>
                          )}
                        </span>
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

        {/* View Details */}
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

        {/* Manual Snapshot (your existing one) */}
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

        {/* TEST SNAPSHOT NOW — THIS ONE IS FOR TOKEN TESTING */}
        {activeActionMenuSession.status === 'active' && (
          <button
            onClick={() => {
              closeActionMenu();
              handleManualCapture(activeActionMenuSession.id);
            }}
            disabled={capturingSessionId === activeActionMenuSession.id}
            className={`w-full px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all
              ${capturingSessionId === activeActionMenuSession.id
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
          >
            {capturingSessionId === activeActionMenuSession.id ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing Token...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Test Snapshot Now
              </>
            )}
          </button>
        )}

        {/* Stop Session */}
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

        {/* Resume Session */}
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

        {/* Mark Completed */}
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

        {/* Recalibrate Nota Kecil */}
        <button
          onClick={() => {
            closeActionMenu();
            handleRecalibrateNotaKecil(activeActionMenuSession.id);
          }}
          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t border-gray-200"
        >
          <RefreshCw className="w-4 h-4 text-orange-500" />
          Recalibrate Nota Kecil
        </button>

        {/* Delete Session */}
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
                <div>
                  <p className="text-sm text-gray-500">Meter Type</p>
                  {selectedSession.meter_type ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedSession.meter_type === 'stan_awal' ? 'Stan Awal' :
                       selectedSession.meter_type === 'stan_akhir' ? 'Stan Akhir' :
                       selectedSession.meter_type === 'pressure' ? 'Pressure' :
                       selectedSession.meter_type === 'temperature' ? 'Temperature' :
                       'Other'}
                    </span>
                  ) : (
                    <p className="font-medium text-gray-400 mt-1">N/A</p>
                  )}
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
                      <div key={screenshot.id} className="border border-gray-200 rounded-lg overflow-hidden relative">
                        <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                          {screenshot.screenshot_url ? (
                            <img
                              src={screenshot.screenshot_url}
                              alt={`Screenshot ${screenshot.sequence_number}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              <span className="px-2 py-1 rounded bg-gray-200 text-gray-600">Image expired</span>
                            </div>
                          )}
                        </div>
                        {/* Per-screenshot actions */}
                        {(
                          <div className="absolute top-2 right-2">
                            <div className="relative inline-block text-left">
                              <button
                                className="screenshot-actions-trigger p-1.5 rounded-full bg-white/90 hover:bg-white shadow border border-gray-200"
                                onClick={(e)=>{
                                  e.stopPropagation();
                                  setScreenshotMenuOpenId(screenshotMenuOpenId === screenshot.id ? null : screenshot.id);
                                }}
                                title="Screenshot actions"
                              >
                                <MoreHorizontal className="w-4 h-4 text-gray-700" />
                              </button>
                              {screenshotMenuOpenId === screenshot.id && (
                                <div className="screenshot-actions-dropdown absolute right-0 mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await apiClient.post(`/cctv-monitoring/screenshots/${screenshot.id}/retry-ocr`);
                                        toast.success('OCR retry queued');
                                        setScreenshotMenuOpenId(null);
                                        fetchSessionScreenshots(selectedSession!.id);
                                      } catch (e:any) {
                                        toast.error(e.response?.data?.message || 'Failed to queue OCR retry');
                                      }
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Retry OCR
                                  </button>
                                  <button
                                    onClick={() => {
                                      setScreenshotMenuOpenId(null);
                                      setManualOcrTarget(screenshot);
                                      
                                      // Initialize ALL fields from OCR result
                                      setManualForm({
                                        stan: (screenshot.ocr_result?.stan ?? '') as string,
                                        temperature: (screenshot.ocr_result?.temperature ?? '') as string,
                                        pressure_inlet: (screenshot.ocr_result?.pressure_inlet ?? '') as string,
                                        pressure_outlet: (screenshot.ocr_result?.pressure_outlet ?? '') as string,
                                      });
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
                                  >
                                    Edit values
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">#{screenshot.sequence_number}</span>
                              {/* Label: Batch title NK-S<sessionId>-Batch<batchNo> */}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {`NK-S${selectedSession?.id}-Batch${Math.floor((screenshot.sequence_number - 1) / 24) + 1}`}
                              </span>
                            </div>
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
                              {(() => {
                                const meterType = selectedSession?.meter_type;
                                let displayValue: number | undefined;
                                let displayLabel: string;
                                let displayUnit: string;

                                if (meterType === 'temperature') {
                                  displayValue = screenshot.ocr_result.temperature ?? screenshot.ocr_result.temperatur_operasi;
                                  displayLabel = 'Temperature';
                                  displayUnit = '°C';
                                } else if (meterType === 'pressure') {
                                  displayValue = screenshot.ocr_result.pressure ?? screenshot.ocr_result.tekanan_operasi;
                                  displayLabel = 'Pressure';
                                  displayUnit = 'bar';
                                } else {
                                  // For stan_awal, stan_akhir, other, or no meter_type
                                  displayValue = screenshot.ocr_result.meter_reading;
                                  displayLabel = meterType === 'stan_awal' ? 'Stan Awal' : 
                                               meterType === 'stan_akhir' ? 'Stan Akhir' : 
                                               'Meter';
                                  displayUnit = screenshot.ocr_result.unit || 'm³';
                                }

                                return displayValue !== undefined && displayValue !== null ? (
                                  <p className="text-sm font-medium text-gray-900">
                                    {displayLabel}: {displayValue} {displayUnit}
                                  </p>
                                ) : null;
                              })()}
                              {screenshot.ocr_confidence_score !== null && (
                                <p className="text-xs text-gray-500">
                                  Confidence: {(screenshot.ocr_confidence_score * 100).toFixed(0)}%
                                </p>
                              )}
                              <button
                                onClick={() => setViewingOcrDetails(screenshot)}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View Details
                              </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
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

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleCreateSession} className="space-y-6">
                {/* Real Data Mode Indicator */}
                {useRealData && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Real Data Mode:</strong> Using actual customers from the database. Delivery orders are auto-generated when needed.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
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

                  {/* Panel Row & Column */}
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

                  {/* Meter Type */}
                  {/* Meter Type - UPDATED FOR 4 READINGS */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meter Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={createForm.meter_type}
                      onChange={(e) => setCreateForm({...createForm, meter_type: e.target.value as CreateSessionForm['meter_type']})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="stan">📏 Stan (m³)</option>
                      <option value="pressure_inlet">🔧 Pressure Inlet (bar)</option>
                      <option value="pressure_outlet">🔧 Pressure Outlet (bar)</option>
                      <option value="temperature">🌡️ Temperature (°C)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which specific meter reading to capture from this panel position
                    </p>
                  </div>

                  {/* Device ID */}
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
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 bg-gray-50">
              <button
                type="submit"
                onClick={handleCreateSession}
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
          </div>
        </div>
      )}

      {/* Manual OCR Modal */}
      {/* Manual OCR Modal - UPDATED FOR NEW DATABASE SCHEMA */}
      {manualOcrTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Set Manual Readings - #{manualOcrTarget.sequence_number}
              </h3>
              <button 
                onClick={() => setManualOcrTarget(null)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Current OCR Reference */}
              {manualOcrTarget.ocr_result && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current OCR Detection:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Stan:</span>
                      <span className="ml-1 font-mono">{manualOcrTarget.ocr_result?.stan ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Temp:</span>
                      <span className="ml-1 font-mono">{manualOcrTarget.ocr_result?.temperature ?? '—'}</span>°C
                    </div>
                    <div>
                      <span className="text-gray-500">P.In:</span>
                      <span className="ml-1 font-mono">{manualOcrTarget.ocr_result?.pressure_inlet ?? '—'}</span>bar
                    </div>
                    <div>
                      <span className="text-gray-500">P.Out:</span>
                      <span className="ml-1 font-mono">{manualOcrTarget.ocr_result?.pressure_outlet ?? '—'}</span>bar
                    </div>
                  </div>
                </div>
              )}

              {/* STAN Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stan (m³) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualForm.stan}
                  onChange={(e) => setManualForm({
                    ...manualForm, 
                    stan: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1234.56"
                  required
                />
              </div>

              {/* TEMPERATURE Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.temperature}
                  onChange={(e) => setManualForm({
                    ...manualForm, 
                    temperature: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 28.5"
                />
              </div>

              {/* PRESSURE INLET Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pressure Inlet (bar)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.pressure_inlet}
                  onChange={(e) => setManualForm({
                    ...manualForm, 
                    pressure_inlet: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 205.3"
                />
              </div>

              {/* PRESSURE OUTLET Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pressure Outlet (bar)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.pressure_outlet}
                  onChange={(e) => setManualForm({
                    ...manualForm, 
                    pressure_outlet: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 198.7"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button 
                onClick={() => setManualOcrTarget(null)} 
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Build payload matching new database schema
                    const payload = {
                      stan: manualForm.stan.trim() ? parseFloat(manualForm.stan) : null,
                      temperature: manualForm.temperature.trim() ? parseFloat(manualForm.temperature) : null,
                      pressure_inlet: manualForm.pressure_inlet.trim() ? parseFloat(manualForm.pressure_inlet) : null,
                      pressure_outlet: manualForm.pressure_outlet.trim() ? parseFloat(manualForm.pressure_outlet) : null,
                    };

                    // Validate STAN is required
                    if (!payload.stan && !manualOcrTarget.ocr_result?.stan) {
                      toast.error('Stan reading is required');
                      return;
                    }

                    await apiClient.put(
                      `/cctv-monitoring/screenshots/${manualOcrTarget.id}/manual-ocr`, 
                      payload
                    );
                    
                    toast.success('Manual readings saved successfully');
                    setManualOcrTarget(null);
                    
                    if (selectedSession) {
                      fetchSessionScreenshots(selectedSession.id);
                    }
                  } catch (e: any) {
                    console.error('Manual OCR save error:', e);
                    toast.error(e.response?.data?.message || 'Failed to save manual readings');
                  }
                }}
                className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Save className="w-4 h-4" />
                Save Readings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Token Update Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Key className="w-8 h-8 text-yellow-600" />
                Update BARDI Session
              </h2>
              <button onClick={() => setShowTokenModal(false)}>
                <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">Session Expired</p>
                <p className="text-sm text-red-700 mt-1">
                  Your BARDI session has expired. Please update with fresh values.
                </p>
              </div>

              {/* s-sid Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  s-sid <span className="text-red-500">(required)</span>
                </label>
                <input
                  type="text"
                  value={simpleToken.s_sid}
                  onChange={(e) => setSimpleToken({ ...simpleToken, s_sid: e.target.value.trim() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="s:c0012a26-575d-4ae5-ab61-172edb151817.ZOi/JX+..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Copy the full value from Chrome → Application → Cookies → s-sid
                </p>
              </div>

              {/* s-sid.sig Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  s-sid.sig <span className="text-red-500">(required)</span>
                </label>
                <input
                  type="text"
                  value={simpleToken.s_sid_sig}
                  onChange={(e) => setSimpleToken({ ...simpleToken, s_sid_sig: e.target.value.trim() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ZOi/JX+KDUfuvIBs4nzJPBEyxaIAAjXC0b3hu8RBQFM"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Copy from Chrome → Application → Cookies → s-sid.sig
                </p>
              </div>

              {simpleToken.error && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {simpleToken.error}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSimpleTokenUpdate}
                disabled={updatingToken || !simpleToken.s_sid || !simpleToken.s_sid_sig}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingToken ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save & Resume Monitoring
                  </>
                )}
              </button>
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* OCR Details View Modal */}
      {viewingOcrDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">OCR Details</h2>
                <button
                  onClick={() => setViewingOcrDetails(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Basic Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Sequence Number</div>
                    <div className="font-medium text-gray-900">#{viewingOcrDetails.sequence_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Captured At</div>
                    <div className="font-medium text-gray-900">
                      {new Date(viewingOcrDetails.captured_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">OCR Status</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      viewingOcrDetails.ocr_status === 'success' ? 'bg-green-100 text-green-700' :
                      viewingOcrDetails.ocr_status === 'failed' ? 'bg-red-100 text-red-700' :
                      viewingOcrDetails.ocr_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {viewingOcrDetails.ocr_status}
                    </div>
                  </div>
                  {viewingOcrDetails.ocr_confidence_score !== null && (
                    <div>
                      <div className="text-xs text-gray-500">Confidence Score</div>
                      <div className="font-medium text-gray-900">
                        {(viewingOcrDetails.ocr_confidence_score * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}
                  {viewingOcrDetails.ocr_processed_at && (
                    <div>
                      <div className="text-xs text-gray-500">Processed At</div>
                      <div className="font-medium text-gray-900">
                        {new Date(viewingOcrDetails.ocr_processed_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Result Fields */}
              {viewingOcrDetails.ocr_result && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Extracted Data</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(viewingOcrDetails.ocr_result).map(([key, value]) => {
                        if (value === null || value === undefined) return null;
                        
                        // Format the key name
                        const formattedKey = key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase());
                        
                        // Format the value
                        let formattedValue: string;
                        if (typeof value === 'number') {
                          formattedValue = value.toFixed(2);
                          // Add units for specific fields
                          if (key.includes('meter') || key.includes('volume') || key === 'V' || key === 'Vt') {
                            formattedValue += ' m³';
                          } else if (key.includes('pressure') || key.includes('tekanan')) {
                            formattedValue += ' bar';
                          } else if (key.includes('temperature') || key.includes('temperatur')) {
                            formattedValue += ' °C';
                          }
                        } else if (typeof value === 'object') {
                          formattedValue = JSON.stringify(value, null, 2);
                        } else {
                          formattedValue = String(value);
                        }
                        
                        return (
                          <div key={key} className="border-b border-gray-200 pb-2">
                            <div className="text-xs text-gray-500 mb-1">{formattedKey}</div>
                            <div className="font-medium text-gray-900 text-sm break-words">
                              {formattedValue}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {viewingOcrDetails.ocr_error_message && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Error Message</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{viewingOcrDetails.ocr_error_message}</p>
                  </div>
                </div>
              )}

              {/* Raw OCR Response */}
              {viewingOcrDetails.ocr_raw_response && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Raw OCR Response</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {typeof viewingOcrDetails.ocr_raw_response === 'string' 
                        ? viewingOcrDetails.ocr_raw_response 
                        : JSON.stringify(viewingOcrDetails.ocr_raw_response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Screenshot Image */}
              {viewingOcrDetails.screenshot_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Screenshot</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={viewingOcrDetails.screenshot_url}
                      alt={`Screenshot ${viewingOcrDetails.sequence_number}`}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingOcrDetails(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVMonitoringPage;


