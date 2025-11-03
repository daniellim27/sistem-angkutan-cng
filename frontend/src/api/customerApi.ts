import apiClient from './axiosConfig';

export interface Customer {
  id: number;
  customer_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  nota_besar: number;
  nota_kecil: number;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerLocation {
  id: number;
  customer_name: string;
  location: string;
  latitude: number;
  longitude: number;
  display_name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

/**
 * Get all customer locations with coordinates for map display
 */
export const getCustomerLocationsWithCoords = async (): Promise<CustomerLocation[]> => {
  try {
    console.log('🔍 API Call: Fetching customer locations with coords...');
    
    // Add cache-busting parameter to force fresh data
    const response = await apiClient.get<ApiResponse<CustomerLocation[]>>('/customers/locations-with-coords', {
      params: { _t: Date.now() }
    });
    
    console.log('📡 Raw API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    
    // Check if response.data has the expected structure
    if (response.data && Array.isArray(response.data)) {
      // Direct array response
      console.log('✅ Returning direct array:', response.data.length, 'items');
      return response.data;
    } else if (response.data && response.data.data) {
      // Wrapped response
      console.log('✅ Returning wrapped data:', response.data.data.length, 'items');
      return response.data.data;
    } else {
      console.error('❌ Unexpected response structure:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching customer locations with coordinates:', error);
    throw error;
  }
};

/**
 * Get customer locations for dropdown (without coordinates requirement)
 */
export const getCustomerLocations = async (): Promise<CustomerLocation[]> => {
  try {
    const response = await apiClient.get<ApiResponse<CustomerLocation[]>>('/customers/locations');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching customer locations:', error);
    throw error;
  }
};

/**
 * Get all customers
 */
export const getCustomers = async (page = 1, limit = 10, search = ''): Promise<ApiResponse<Customer[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/customers', {
      params: { page, limit, search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (id: number): Promise<Customer> => {
  try {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
};

/**
 * Create new customer
 */
export const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'display_name'>): Promise<Customer> => {
  try {
    const response = await apiClient.post<ApiResponse<Customer>>('/customers', customerData);
    return response.data.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (id: number, customerData: Partial<Customer>): Promise<Customer> => {
  try {
    const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, customerData);
    return response.data.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

/**
 * Delete customer
 */
export const deleteCustomer = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/customers/${id}`);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};
