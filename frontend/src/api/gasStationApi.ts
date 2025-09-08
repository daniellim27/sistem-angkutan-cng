import apiClient from './axiosConfig';

export interface GasStation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  station_type: 'CNG' | 'Petrol' | 'Diesel' | 'LPG' | 'Mixed';
  phone?: string;
  operating_hours?: string;
  fuel_types?: Array<{
    type: string;
    price_per_liter: number;
  }>;
  amenities?: string[];
  is_active: boolean;
  notes?: string;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    username: string;
  };
  updater?: {
    id: number;
    username: string;
  };
}

export interface CreateGasStationRequest {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  station_type?: 'CNG' | 'Petrol' | 'Diesel' | 'LPG' | 'Mixed';
  phone?: string;
  operating_hours?: string;
  fuel_types?: Array<{
    type: string;
    price_per_liter: number;
  }>;
  amenities?: string[];
  notes?: string;
}

export interface UpdateGasStationRequest extends Partial<CreateGasStationRequest> {
  is_active?: boolean;
}

export interface GasStationSearchParams {
  q?: string;
  type?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export class GasStationApi {
  private static baseUrl = '/gas-stations';

  /**
   * Get all active gas stations
   */
  static async getAllGasStations(): Promise<ApiResponse<GasStation[]>> {
    try {
      const response = await apiClient.get<ApiResponse<GasStation[]>>(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas stations:', error);
      throw error;
    }
  }

  /**
   * Get a specific gas station by ID
   */
  static async getGasStationById(id: number): Promise<ApiResponse<GasStation>> {
    try {
      const response = await apiClient.get<ApiResponse<GasStation>>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas station:', error);
      throw error;
    }
  }

  /**
   * Create a new gas station
   */
  static async createGasStation(data: CreateGasStationRequest): Promise<ApiResponse<GasStation>> {
    try {
      const response = await apiClient.post<ApiResponse<GasStation>>(this.baseUrl, data);
      return response.data;
    } catch (error) {
      console.error('Error creating gas station:', error);
      throw error;
    }
  }

  /**
   * Update a gas station
   */
  static async updateGasStation(id: number, data: UpdateGasStationRequest): Promise<ApiResponse<GasStation>> {
    try {
      const response = await apiClient.put<ApiResponse<GasStation>>(`${this.baseUrl}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating gas station:', error);
      throw error;
    }
  }

  /**
   * Delete a gas station (soft delete)
   */
  static async deleteGasStation(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting gas station:', error);
      throw error;
    }
  }

  /**
   * Search gas stations
   */
  static async searchGasStations(params: GasStationSearchParams): Promise<ApiResponse<GasStation[]>> {
    try {
      const response = await apiClient.get<ApiResponse<GasStation[]>>(`${this.baseUrl}/search`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error searching gas stations:', error);
      throw error;
    }
  }

  /**
   * Get gas stations by type
   */
  static async getGasStationsByType(type: string): Promise<ApiResponse<GasStation[]>> {
    try {
      const response = await apiClient.get<ApiResponse<GasStation[]>>(`${this.baseUrl}/type/${type}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas stations by type:', error);
      throw error;
    }
  }

  /**
   * Get gas station statistics
   */
  static async getGasStationStats(): Promise<ApiResponse<{
    total_stations: number;
    stations_by_type: Array<{ station_type: string; count: string }>;
    recent_stations: GasStation[];
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas station stats:', error);
      throw error;
    }
  }
}
