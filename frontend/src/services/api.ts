const API_BASE_URL = 'http://localhost:5001';

export interface ProcessDataResponse {
  success: boolean;
  message: string;
  results?: any;
  total_records?: number;
  new_entries?: number;
  skipped_duplicates?: number;
}

export interface ColumnsResponse {
  columns: string[];
}

class ApiService {
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Backend health check failed');
    }
    return response.json();
  }

  async uploadCNPFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-cnp-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  }

  async getRecentUploadData() {
    const response = await fetch(`${API_BASE_URL}/get-recent-upload-data`);

    if (!response.ok) {
      throw new Error('Failed to fetch recent upload data');
    }

    return response.json();
  }

  async getHistoricalData(startDate: string, endDate: string, filters?: {
    goodsCategory?: string;
    postalService?: string;
    calculationMethod?: string;
    originStation?: string;
    destinationStation?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/historical-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        startDate, 
        endDate,
        ...filters
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }

    return response.json();
  }


  async generateChinaPostFile(filters?: {
    startDate?: string;
    endDate?: string;
    goodsCategory?: string;
    postalService?: string;
    calculationMethod?: string;
    originStation?: string;
    destinationStation?: string;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate-chinapost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters || {}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate CHINAPOST file');
    }

    return response.blob();
  }

  async generateCBDFile(filters?: {
    startDate?: string;
    endDate?: string;
    goodsCategory?: string;
    postalService?: string;
    calculationMethod?: string;
    originStation?: string;
    destinationStation?: string;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate-cbd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters || {}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate CBD file');
    }

    return response.blob();
  }

  async deleteRecords(ids: number[]) {
    const response = await fetch(`${API_BASE_URL}/delete-records`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete records');
    }

    return response.json();
  }

  async clearDatabase() {
    const response = await fetch(`${API_BASE_URL}/clear-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to clear database');
    }

    return response.json();
  }

  async getAnalytics(startDate?: string, endDate?: string, filters?: {
    goodsCategory?: string;
    postalService?: string;
    calculationMethod?: string;
    originStation?: string;
    destinationStation?: string;
  }) {
    const url = `${API_BASE_URL}/get-analytics-data`;
    const options: RequestInit = {
      method: startDate && endDate ? 'POST' : 'GET',
    };
    
    if (startDate && endDate) {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify({ 
        startDate, 
        endDate,
        ...filters
      });
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error('Failed to get analytics data');
    }
    
    return response.json();
  }

  async getColumns(): Promise<ColumnsResponse> {
    // Legacy method - return empty columns
    return { columns: [] };
  }

  async updateRecord(_id: number, _data: any) {
    // Legacy method - not implemented in new backend
    throw new Error('updateRecord is not implemented in new backend');
  }

  // ==================== TARIFF MANAGEMENT METHODS ====================
  
  async getTariffSystemDefaults() {
    const response = await fetch(`${API_BASE_URL}/tariff-system-defaults`);
    
    if (!response.ok) {
      throw new Error('Failed to get tariff system defaults');
    }
    
    return response.json();
  }

  async getTariffRoutes() {
    const response = await fetch(`${API_BASE_URL}/tariff-routes`);
    
    if (!response.ok) {
      throw new Error('Failed to get tariff routes');
    }
    
    return response.json();
  }

  async getTariffRates() {
    const response = await fetch(`${API_BASE_URL}/tariff-rates`);
    
    if (!response.ok) {
      throw new Error('Failed to get tariff rates');
    }
    
    return response.json();
  }

  async createTariffRate(tariffRateData: {
    origin_country: string;
    destination_country: string;
    goods_category?: string;
    postal_service?: string;
    start_date?: string;
    end_date?: string;
    min_weight?: number;
    max_weight?: number;
    tariff_rate: number;
    minimum_tariff?: number;
    maximum_tariff?: number;
    currency?: string;
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/tariff-rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tariffRateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create tariff rate');
    }

    return response.json();
  }

  async updateTariffRate(rateId: number, tariffRateData: {
    origin_country?: string;
    destination_country?: string;
    goods_category?: string;
    postal_service?: string;
    start_date?: string;
    end_date?: string;
    min_weight?: number;
    max_weight?: number;
    tariff_rate?: number;
    category_surcharge?: number;
    minimum_tariff?: number;
    maximum_tariff?: number;
    currency?: string;
    notes?: string;
    is_active?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/tariff-rates/${rateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tariffRateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update tariff rate');
    }

    return response.json();
  }

  async deleteTariffRate(rateId: number) {
    const response = await fetch(`${API_BASE_URL}/tariff-rates/${rateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete tariff rate');
    }

    return response.json();
  }

  async calculateTariff(origin: string, destination: string, declaredValue: number, 
                       weight?: number, goodsCategory?: string, postalService?: string, shipDate?: string) {
    const response = await fetch(`${API_BASE_URL}/calculate-tariff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_country: origin,
        destination_country: destination,
        declared_value: declaredValue,
        weight: weight,
        goods_category: goodsCategory,
        postal_service: postalService,
        ship_date: shipDate,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to calculate tariff');
    }

    return data;
  }

  async getTariffCategories() {
    const response = await fetch(`${API_BASE_URL}/tariff-categories`);
    
    if (!response.ok) {
      throw new Error('Failed to get tariff categories');
    }
    
    return response.json();
  }

  async getTariffServices() {
    const response = await fetch(`${API_BASE_URL}/tariff-services`);
    
    if (!response.ok) {
      throw new Error('Failed to get tariff services');
    }
    
    return response.json();
  }

  async getStations() {
    const response = await fetch(`${API_BASE_URL}/get-stations`);
    
    if (!response.ok) {
      throw new Error('Failed to get stations');
    }
    
    return response.json();
  }

  async getCBPAnalytics(startDate?: string, endDate?: string) {
    const url = `${API_BASE_URL}/cbp-analytics`;
    const options: RequestInit = {
      method: startDate && endDate ? 'POST' : 'GET',
    };
    
    if (startDate && endDate) {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify({ startDate, endDate });
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error('Failed to get CBP analytics data');
    }
    
    return response.json();
  }

  async getChinaPostAnalytics(startDate?: string, endDate?: string) {
    const url = `${API_BASE_URL}/chinapost-analytics`;
    const options: RequestInit = {
      method: startDate && endDate ? 'POST' : 'GET',
    };
    
    if (startDate && endDate) {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify({ startDate, endDate });
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error('Failed to get China Post analytics data');
    }
    
    return response.json();
  }

  async batchRecalculateTariffs(filters?: {
    start_date?: string;
    end_date?: string;
    routes?: string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/batch-recalculate-tariffs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters || {}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to recalculate tariffs');
    }

    return response.json();
  }

  async createBulkTariffRates(bulkData: {
    origin_country: string;
    destination_country: string;
    postal_service?: string;
    start_date?: string;
    end_date?: string;
    min_weight?: number;
    max_weight?: number;
    minimum_tariff?: number;
    maximum_tariff?: number;
    notes?: string;
    category_rates: Array<{
      category: string;
      rate: number;
    }>;
  }) {
    const response = await fetch(`${API_BASE_URL}/tariff-rates/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bulkData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create bulk rates');
    }

    return response.json();
  }

  // ==================== FILE HISTORY METHODS ====================
  
  async getFileHistory() {
    const response = await fetch(`${API_BASE_URL}/file-history`);
    
    if (!response.ok) {
      throw new Error('Failed to get file history');
    }
    
    return response.json();
  }

  async downloadHistoryFile(fileId: number, fileType: 'original' | 'chinapost' | 'cbd'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/download-file/${fileId}/${fileType}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to download ${fileType} file`);
    }
    
    return response.blob();
  }

  async deleteFileHistory(fileId: number) {
    const response = await fetch(`${API_BASE_URL}/file-history/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete file history record');
    }

    return response.json();
  }

  async deleteAllFileRecords(fileId: number) {
    const response = await fetch(`${API_BASE_URL}/file-history/${fileId}/delete-all-records`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete file record and all related data');
    }

    return response.json();
  }

  // Legacy methods - kept for backward compatibility but no longer send data
  async processData(_data: any[]): Promise<ProcessDataResponse> {
    // This method is now deprecated - all processing happens in backend
    console.warn('processData is deprecated - all processing now happens in backend via uploadCNPFile');
    return { success: false, message: 'Use uploadCNPFile instead' };
  }

  async generateCBPFile(_data?: any[]): Promise<Blob> {
    // Ignore frontend data - backend generates directly from database
    console.warn('generateCBPFile: Using backend database data, ignoring frontend data parameter');
    return this.generateCBDFile();
  }
}

export const apiService = new ApiService();

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