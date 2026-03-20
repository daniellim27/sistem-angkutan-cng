import apiClient from './axiosConfig';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  vehicle_id: number | null;
  driver_id: number | null;
  latitude: number | null;
  longitude: number | null;
  is_read: boolean;
  read_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: number;
    license_plate: string;
    device_id: string;
  };
  driver?: {
    id: number;
    username: string;
  };
}

export interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}

export const getNotifications = async (page: number = 1, limit: number = 50, isRead?: boolean, type?: string): Promise<NotificationResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (isRead !== undefined) {
    params.append('is_read', isRead.toString());
  }
  if (type) {
    params.append('type', type);
  }

  const response = await apiClient.get(`/notifications?${params.toString()}`);
  return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
};

export const markAsRead = async (id: number): Promise<{ success: boolean; notification: Notification }> => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async (): Promise<{ success: boolean; updatedCount: number }> => {
  const response = await apiClient.patch('/notifications/mark-all-read');
  return response.data;
};

export const deleteNotification = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/notifications/${id}`);
  return response.data;
};

export interface IdleVehicleSummary {
  vehicle_id: number;
  license_plate: string | null;
  device_id: string | null;
  driver: { id: number; username: string } | null;
  latest_notification: Notification | null;
  unread_count: number;
  total_count: number;
  latest_idle_duration_hours: number | null;
  latest_latitude: number | null;
  latest_longitude: number | null;
  latest_created_at: string;
}

export interface IdleSummaryResponse {
  success: boolean;
  vehicles: IdleVehicleSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  totalUnread: number;
}

export const getIdleSummary = async (
  page: number = 1,
  limit: number = 20,
  isRead?: boolean,
  search?: string
): Promise<IdleSummaryResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (isRead !== undefined) params.append('is_read', isRead.toString());
  if (search) params.append('search', search);

  const response = await apiClient.get(`/notifications/idle-summary?${params.toString()}`);
  return response.data;
};

export const getVehicleNotifications = async (
  vehicleId: number,
  page: number = 1,
  limit: number = 20
): Promise<NotificationResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await apiClient.get(`/notifications/vehicle/${vehicleId}?${params.toString()}`);
  return response.data;
};

export const markVehicleAsRead = async (vehicleId: number): Promise<{ success: boolean; updatedCount: number }> => {
  const response = await apiClient.patch(`/notifications/vehicle/${vehicleId}/read`);
  return response.data;
};

