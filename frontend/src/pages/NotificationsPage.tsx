import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Search,
  Truck,
  X,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  getIdleSummary,
  getVehicleNotifications,
  markVehicleAsRead,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  IdleVehicleSummary,
  Notification,
} from '../api/notificationApi';

type ReadFilter = 'all' | 'unread' | 'read';

const NotificationsPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<IdleVehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<Record<number, Notification[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState<Record<number, number>>({});
  const [historyPagination, setHistoryPagination] = useState<Record<number, { total: number; totalPages: number }>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const isRead = readFilter === 'all' ? undefined : readFilter === 'read';
      const res = await getIdleSummary(page, 15, isRead, debouncedSearch || undefined);
      setVehicles(res.vehicles);
      setTotalUnread(res.totalUnread);
      setPagination({ total: res.pagination.total, totalPages: res.pagination.totalPages });
    } catch (err) {
      console.error('Failed to fetch idle summary:', err);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [readFilter, debouncedSearch]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchHistory = async (vehicleId: number, pg: number = 1) => {
    setLoadingHistory(vehicleId);
    try {
      const res = await getVehicleNotifications(vehicleId, pg, 10);
      setVehicleHistory(prev => ({
        ...prev,
        [vehicleId]: pg === 1 ? res.notifications : [...(prev[vehicleId] || []), ...res.notifications],
      }));
      setHistoryPage(prev => ({ ...prev, [vehicleId]: pg }));
      setHistoryPagination(prev => ({
        ...prev,
        [vehicleId]: { total: res.pagination.total, totalPages: res.pagination.totalPages },
      }));
    } catch (err) {
      console.error('Failed to fetch vehicle history:', err);
    } finally {
      setLoadingHistory(null);
    }
  };

  const toggleExpand = (vehicleId: number) => {
    if (expandedVehicle === vehicleId) {
      setExpandedVehicle(null);
    } else {
      setExpandedVehicle(vehicleId);
      if (!vehicleHistory[vehicleId]) {
        fetchHistory(vehicleId);
      }
    }
  };

  const handleMarkVehicleRead = async (vehicleId: number) => {
    try {
      await markVehicleAsRead(vehicleId);
      setVehicles(prev =>
        prev.map(v => (v.vehicle_id === vehicleId ? { ...v, unread_count: 0 } : v))
      );
      if (vehicleHistory[vehicleId]) {
        setVehicleHistory(prev => ({
          ...prev,
          [vehicleId]: prev[vehicleId].map(n => ({ ...n, is_read: true })),
        }));
      }
      setTotalUnread(prev => {
        const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
        return Math.max(0, prev - (vehicle?.unread_count || 0));
      });
    } catch (err) {
      console.error('Failed to mark vehicle as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setVehicles(prev => prev.map(v => ({ ...v, unread_count: 0 })));
      setVehicleHistory(prev => {
        const updated: Record<number, Notification[]> = {};
        for (const key in prev) {
          updated[key] = prev[key].map(n => ({ ...n, is_read: true }));
        }
        return updated;
      });
      setTotalUnread(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkSingleRead = async (notifId: number, vehicleId: number) => {
    try {
      await markAsRead(notifId);
      setVehicleHistory(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId].map(n => (n.id === notifId ? { ...n, is_read: true } : n)),
      }));
      setVehicles(prev =>
        prev.map(v =>
          v.vehicle_id === vehicleId ? { ...v, unread_count: Math.max(0, v.unread_count - 1) } : v
        )
      );
      setTotalUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleDeleteSingle = async (notifId: number, vehicleId: number) => {
    try {
      const notif = vehicleHistory[vehicleId]?.find(n => n.id === notifId);
      await deleteNotification(notifId);
      setVehicleHistory(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId].filter(n => n.id !== notifId),
      }));
      setVehicles(prev =>
        prev.map(v => {
          if (v.vehicle_id !== vehicleId) return v;
          return {
            ...v,
            total_count: v.total_count - 1,
            unread_count: notif && !notif.is_read ? v.unread_count - 1 : v.unread_count,
          };
        })
      );
      if (notif && !notif.is_read) setTotalUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const formatDuration = (hours: number | null) => {
    if (hours === null) return '-';
    if (hours < 1) return `${Math.round(hours * 60)} menit`;
    return `${hours.toFixed(1)} jam`;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    const days = Math.floor(hrs / 24);
    return `${days} hari lalu`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-7 w-7 text-blue-600" />
            Notifikasi Kendaraan Idle
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar kendaraan yang terdeteksi idle, dikelompokkan berdasarkan plat nomor
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Tandai semua dibaca ({totalUnread})
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Belum Dibaca</p>
            <p className="text-2xl font-bold text-gray-900">{totalUnread}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Kendaraan Terdeteksi</p>
            <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Idle Terlama</p>
            <p className="text-2xl font-bold text-gray-900">
              {vehicles.length > 0
                ? formatDuration(
                    Math.max(...vehicles.map(v => v.latest_idle_duration_hours || 0))
                  )
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari plat nomor atau device ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={readFilter}
              onChange={e => setReadFilter(e.target.value as ReadFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">Semua</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-3">Memuat data...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-3 text-lg">Tidak ada notifikasi idle</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || readFilter !== 'all'
                ? 'Coba ubah filter pencarian'
                : 'Semua kendaraan beroperasi normal'}
            </p>
          </div>
        ) : (
          vehicles.map(vehicle => (
            <div
              key={vehicle.vehicle_id}
              className={`bg-white rounded-xl border transition-all ${
                vehicle.unread_count > 0
                  ? 'border-blue-200 shadow-sm'
                  : 'border-gray-200'
              }`}
            >
              {/* Vehicle Row */}
              <div
                className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(vehicle.vehicle_id)}
              >
                <div className="flex items-center gap-4">
                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        vehicle.unread_count > 0
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900">
                        {vehicle.license_plate || vehicle.device_id || `Vehicle #${vehicle.vehicle_id}`}
                      </h3>
                      {vehicle.unread_count > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                          {vehicle.unread_count} baru
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      {vehicle.driver && (
                        <span>Driver: {vehicle.driver.username}</span>
                      )}
                      {vehicle.device_id && vehicle.license_plate && (
                        <span>GPS: {vehicle.device_id}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Idle {formatDuration(vehicle.latest_idle_duration_hours)}
                      </span>
                      <span>{vehicle.total_count} total alert</span>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-gray-400">{timeAgo(vehicle.latest_created_at)}</p>
                      {vehicle.latest_latitude && vehicle.latest_longitude && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {vehicle.latest_latitude.toFixed(4)}, {vehicle.latest_longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {vehicle.unread_count > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleMarkVehicleRead(vehicle.vehicle_id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Tandai semua dibaca"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </button>
                      )}
                      {expandedVehicle === vehicle.vehicle_id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded History */}
              {expandedVehicle === vehicle.vehicle_id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 sm:px-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Riwayat Idle — {vehicle.license_plate || vehicle.device_id}
                    </h4>

                    {loadingHistory === vehicle.vehicle_id && !vehicleHistory[vehicle.vehicle_id] ? (
                      <div className="py-6 text-center">
                        <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-400 text-sm mt-2">Memuat riwayat...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(vehicleHistory[vehicle.vehicle_id] || []).map(notif => (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              !notif.is_read
                                ? 'bg-white border-blue-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {!notif.is_read && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    Idle {formatDuration(
                                      notif.metadata?.idleDurationHours
                                        ? parseFloat(notif.metadata.idleDurationHours)
                                        : null
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(notif.created_at).toLocaleString('id-ID')}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                                  {notif.latitude && notif.longitude && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {parseFloat(String(notif.latitude)).toFixed(6)},{' '}
                                      {parseFloat(String(notif.longitude)).toFixed(6)}
                                    </span>
                                  )}
                                  {notif.metadata?.spbgDistance != null && (
                                    <span>
                                      SPBG terdekat: {(notif.metadata.spbgDistance / 1000).toFixed(2)} km
                                    </span>
                                  )}
                                  {notif.metadata?.nearestSpbg?.name && (
                                    <span>({notif.metadata.nearestSpbg.name})</span>
                                  )}
                                  {notif.metadata?.customerDistance != null && (
                                    <span>
                                      Customer terdekat: {(notif.metadata.customerDistance / 1000).toFixed(2)} km
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!notif.is_read && (
                                  <button
                                    onClick={() => handleMarkSingleRead(notif.id, vehicle.vehicle_id)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Tandai dibaca"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSingle(notif.id, vehicle.vehicle_id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Hapus"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Load More */}
                        {historyPagination[vehicle.vehicle_id] &&
                          (historyPage[vehicle.vehicle_id] || 1) <
                            historyPagination[vehicle.vehicle_id].totalPages && (
                            <button
                              onClick={() =>
                                fetchHistory(
                                  vehicle.vehicle_id,
                                  (historyPage[vehicle.vehicle_id] || 1) + 1
                                )
                              }
                              disabled={loadingHistory === vehicle.vehicle_id}
                              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {loadingHistory === vehicle.vehicle_id
                                ? 'Memuat...'
                                : `Muat lebih banyak (${historyPagination[vehicle.vehicle_id].total - (vehicleHistory[vehicle.vehicle_id]?.length || 0)} tersisa)`}
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
          <p className="text-sm text-gray-500">
            Halaman {page} dari {pagination.totalPages} ({pagination.total} kendaraan)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
