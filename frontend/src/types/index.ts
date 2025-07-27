// Cathay Cargo Mail Solution - Template Processing Types

// File processing types
export interface DataFile {
  id: string;
  filename: string;
  file_type: 'template_data';
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
  error_type: 'missing' | 'invalid_format' | 'invalid_value' | 'duplicate' | 'processing_error';
  message: string;
  value?: string;
}

export type FileProcessingStatus = 
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed';
