// Core data types for the US Tariff Management System

// Package and shipment types based on CARDIT structure
export interface Package {
  id: string;
  tracking_no: string; // Individual package tracking number
  receptacle_id: string; // Links to receptacle (mail bag)
  weight: number; // in kg
  declared_value: number; // in USD
  goods_description?: string;
  sender_info: AddressInfo;
  receiver_info: AddressInfo;
  calculated_tariff: number; // 54% of declared value
  status: PackageStatus;
}

export interface AddressInfo {
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
}

// Receptacle (Mail Bag) Level - 29-alphanumeric digits
export interface Receptacle {
  receptacle_id: string; // 29-alphanumeric identifier
  type: 'bag' | 'package'; // consolidated bag or individual package
  weight: number;
  packages: Package[];
  cardit_sk?: string; // Links to CARDIT
  container_id?: string;
  status: ReceptacleStatus;
}

// CARDIT Level - Invoice from Postal Services
export interface Cardit {
  cardit_sk: string; // Primary key
  receptacle_id: string;
  post_office: string; // China Post, HK Post, etc.
  origin_station: string;
  destination_station: string;
  cardit_carrier: string;
  cardit_flight_number: string;
  acceptance_date: string;
  departure_date?: string;
  arrival_date?: string;
  total_pieces: number;
  total_weight: number;
  status: CarditStatus;
}

// AWB Master Level - CX Flight Data
export interface AWBMaster {
  awb_master_sk: string;
  awb_number: string; // 128-xxxxxxxx format
  awb_prefix: string; // e.g., 128
  carrier_code: string; // e.g., CX
  flight_number: string;
  flight_date: string;
  origin: string;
  destination: string;
  shipment_origin: string; // AWB level origin
  shipment_destination: string; // AWB level destination
  total_packages: number;
  total_weight: number;
  uld_id?: string;
  container_type?: string;
  flown_ind: 'Y' | 'N'; // Whether actually flown
  status: AWBStatus;
}

// Event data for tracking
export interface FlightEvent {
  event_id: string;
  cardit_sk: string;
  event_type: 'departure' | 'arrival' | 'acceptance' | 'delivery';
  event_date: string;
  station: string;
  flight_number: string;
  status: string;
}

// Merged data structure for processing
export interface ConsolidatedShipment {
  awb_master: AWBMaster;
  cardit: Cardit;
  receptacles: Receptacle[];
  packages: Package[];
  events: FlightEvent[];
  total_tariff_amount: number;
  reconciliation_status: 'matched' | 'discrepancy' | 'pending';
}

// CBP Report structure
export interface CBPReport {
  id: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  carrier_name: string;
  carrier_code: string;
  total_packages: number;
  total_tariff_amount: number;
  shipments: ConsolidatedShipment[];
  generated_date: string;
  submitted_date?: string;
  status: ReportStatus;
  cbp_reference?: string;
}

// China Post Invoice structure
export interface ChinaPostInvoice {
  id: string;
  invoice_number: string;
  china_post_reference: string;
  invoice_date: string;
  billing_period: {
    start_date: string;
    end_date: string;
  };
  shipments: ConsolidatedShipment[];
  total_amount: number;
  currency: 'USD';
  status: InvoiceStatus;
  payment_due_date: string;
  payment_date?: string;
}

// File processing types
export interface DataFile {
  id: string;
  filename: string;
  file_type: 'cardit' | 'awb_master' | 'event_data';
  upload_date: string;
  total_records: number;
  processed_records: number;
  error_records: number;
  validation_errors: ValidationError[];
  status: FileProcessingStatus;
}

export interface ValidationError {
  row_number: number;
  field: string;
  error_type: 'missing' | 'invalid_format' | 'invalid_value' | 'duplicate';
  message: string;
  value?: string;
}

// Dashboard and analytics
export interface DashboardStats {
  total_packages: number;
  total_tariff_amount: number;
  packages_this_month: number;
  pending_cbp_reports: number;
  overdue_invoices: number;
  unmatched_shipments: number;
  recent_activity: ActivityItem[];
  tariff_by_origin: Record<string, number>;
  monthly_trends: MonthlyTrend[];
}

export interface ActivityItem {
  id: string;
  type: 'file_upload' | 'data_processing' | 'report_generation' | 'invoice_creation' | 'payment_received';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details?: Record<string, any>;
}

export interface MonthlyTrend {
  month: string;
  packages: number;
  tariff_amount: number;
  growth_rate: number;
}

// System configuration
export interface TariffConfiguration {
  default_rate: number; // 54%
  minimum_value_threshold: number; // Minimum value for tariff application
  exempt_countries: string[];
  special_rates: Record<string, number>; // Country-specific rates if any
  effective_date: string;
}

export interface SystemSettings {
  tariff_config: TariffConfiguration;
  data_retention_days: number;
  auto_reconciliation: boolean;
  notification_settings: {
    email_alerts: boolean;
    report_reminders: boolean;
    discrepancy_notifications: boolean;
  };
  integration_settings: {
    cbp_api_endpoint?: string;
    china_post_api_endpoint?: string;
    automatic_submission: boolean;
  };
}

// Filter and search types
export interface ShipmentFilters {
  date_range?: {
    start_date: string;
    end_date: string;
  };
  origin?: string;
  destination?: string;
  carrier?: string;
  flight_number?: string;
  post_office?: string;
  status?: string;
  reconciliation_status?: 'matched' | 'discrepancy' | 'pending';
  min_tariff?: number;
  max_tariff?: number;
}

export interface ReportFilters {
  report_type: 'cbp' | 'china_post' | 'reconciliation';
  period: {
    start_date: string;
    end_date: string;
  };
  status?: ReportStatus;
  carrier?: string;
}

// Enums
export type PackageStatus = 
  | 'received' 
  | 'accepted' 
  | 'in_transit' 
  | 'delivered' 
  | 'rejected'
  | 'pending_tariff';

export type ReceptacleStatus = 
  | 'received' 
  | 'processed' 
  | 'dispatched' 
  | 'delivered'
  | 'consolidated';

export type CarditStatus = 
  | 'received'
  | 'processed'
  | 'matched'
  | 'discrepancy'
  | 'completed';

export type AWBStatus = 
  | 'created'
  | 'accepted'
  | 'departed'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type FileProcessingStatus = 
  | 'uploaded'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partial_success';

export type ReportStatus = 
  | 'draft'
  | 'generated'
  | 'validated'
  | 'submitted'
  | 'accepted'
  | 'rejected';

export type InvoiceStatus = 
  | 'draft'
  | 'generated'
  | 'sent'
  | 'pending_payment'
  | 'paid'
  | 'overdue'
  | 'cancelled';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Data processing workflow types
export interface ProcessingJob {
  id: string;
  job_type: 'data_merge' | 'tariff_calculation' | 'reconciliation' | 'report_generation';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  start_time: string;
  end_time?: string;
  input_files: string[];
  output_files?: string[];
  error_message?: string;
  details: Record<string, any>;
}
