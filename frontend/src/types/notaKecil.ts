// src/types/notaKecil.ts
export interface NotaKecil {
  id: number;
  customer_name: string;
  customer_address?: string;
  customer_location_index: number;
  ocr_processing_status?: string;
  
  // Measurement fields - keep as string for API compatibility
  stan_awal: string;
  current_stan: string;
  stan_akhir?: string;
  pressure_inlet: string;
  pressure_outlet: string;
  temperature: string;
  volume_delta: string;
  Vt: string;
  k: string;
  V: string;
  created_at: string;
  
  deliveryOrder?: {
    id: number;
    do_number: string;
  } | null;
  driver_notes?: string;
  
  // Representative screenshot fields
  representative_screenshot_url?: string;
  representative_screenshot_id?: number;
  
  // Photo fields (keep existing structure)
  pressure_bar_photos?: string[];
  temperature_photos?: string[];
  stan_awal_photos?: string[];
  stan_akhir_photos?: string[];
  pressure_bar_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  temperature_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  stan_awal_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  stan_akhir_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  photos?: {
    pressure_bar: string[];
    temperature: string[];
    stan_awal: string[];
    stan_akhir: string[];
  };
  
  // Optional metadata fields
  ocr_confidence_avg?: number;
  driver_confirmed?: boolean;
  batch_start_sequence?: number;
  batch_end_sequence?: number;
  screenshots_count?: number;
  ocr_success_count?: number;
  cctv_session_id?: number;
}