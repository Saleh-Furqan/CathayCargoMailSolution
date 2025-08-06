const API_BASE_URL = 'http://localhost:5001';

export interface HistoricalDataResponse {
  data: any[];
  total_records: number;
  results: {
    china_post: {
      available: boolean;
      records_processed?: number;
    };
    cbp: {
      available: boolean;
      records_processed?: number;
    };
  };
}

export interface ProcessDataResponse {
  success: boolean;
  message: string;
  data: any[];
  total_records: number;
  results: {
    china_post: {
      available: boolean;
      required_columns: string[];
      missing_columns: string[];
      records_processed?: number;
    };
    cbp: {
      available: boolean;
      required_columns: string[];
      missing_columns: string[];
      records_processed?: number;
    };
  };
}

export interface ColumnsResponse {
  china_post_columns: string[];
  cbp_columns: string[];
  total_unique_columns: string[];
}

export interface DataFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  lastModified: number;
  preview?: any[];
  processResult?: ProcessDataResponse;
  error?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  async getColumns(): Promise<ColumnsResponse> {
    return this.request('/columns');
  }

  async processData(data: any[]): Promise<ProcessDataResponse> {
    return this.request('/process-data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateChinaPostFile(data: any[]): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate-china-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  async generateCBPFile(data: any[]): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate-cbp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  async getHistoricalData(startDate: string, endDate: string): Promise<HistoricalDataResponse> {
    return this.request('/historical-data', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  }

  async getCountries() {
    return this.request('/countries');
  }

  async getTariffRates() {
    return this.request('/tariff-rates');
  }

  async getTariffSummary() {
    return this.request('/tariff-summary');
  }

  async updateTariffRate(data: {
    origin_country_id: number;
    destination_country_id: number;
    rate_percentage: number;
  }) {
    return this.request('/tariff-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetTariffRates() {
    return this.request('/tariff-rates/reset', {
      method: 'POST',
    });
  }

  async getTariffRate(originCountry: string, destinationCountry: string): Promise<number> {
    try {
      const response = await this.request<{rate: number}>(`/tariff-rate/${originCountry}/${destinationCountry}`);
      return response.rate;
    } catch (error) {
      console.warn(`Could not fetch tariff rate for ${originCountry} -> ${destinationCountry}, using default`);
      return 50; // Default rate
    }
  }
}

export const apiService = new ApiService();

export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log('Excel file read successfully:', jsonData.length, 'rows');
          resolve(jsonData);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing XLSX library:', error);
      reject(error);
    }
  });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
