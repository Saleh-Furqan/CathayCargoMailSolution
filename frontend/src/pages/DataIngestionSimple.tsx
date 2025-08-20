import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  Building,
  Plane,
} from 'lucide-react';
import { apiService, downloadBlob } from '../services/api';
import Dashboard from '../components/Dashboard/Dashboard';
import CBPSection from '../components/CBPSection/CBPSection';
import ChinaPostSection from '../components/ChinaPostSection/ChinaPostSection';

const DataIngestionSimple: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'cbd' | 'chinapost'>('upload');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchProcessedData = async () => {
    try {
      console.log('Fetching processed data from database...');
      // Get recent data from a wide date range to capture all processed data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 365 days
      
      const response = await apiService.getHistoricalData(startDate, endDate);
      console.log('Processed data response:', response);
      
      // Store RAW database data - NO PROCESSING IN FRONTEND
      setProcessedData(response.data || []);
      console.log(`Loaded ${response.data?.length || 0} processed records from backend`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching processed data:', error);
      return [];
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      console.log('Fetching analytics data from backend...');
      const response = await apiService.getAnalytics();
      console.log('Analytics data response:', response);
      setAnalyticsData(response);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.healthCheck();
        setIsBackendConnected(true);
        console.log('Backend connected successfully');
        
        // Load existing processed data and analytics
        await fetchProcessedData();
        await fetchAnalyticsData();
      } catch (error) {
        console.error('Backend connection failed:', error);
        setIsBackendConnected(false);
      }
    };

    checkBackend();
  }, []);

  const processFile = async (file: File) => {
    try {
      console.log('Processing file:', file.name);
      setIsLoading(true);
      setError(null);
      
      // Upload file to backend - ALL PROCESSING HAPPENS IN BACKEND
      const result = await apiService.uploadCNPFile(file);
      console.log('Processing result:', result);
      
      setResult(result);
      
      if (result.success) {
        console.log('File processed successfully by backend!');
        console.log(`Total records: ${result.total_records}`);
        console.log(`New entries: ${result.new_entries}`);
        
        // Fetch the processed data from backend (NO FRONTEND PROCESSING)
        console.log('Fetching processed data from backend...');
        await fetchProcessedData();
        await fetchAnalyticsData();
        
        // Auto-switch to analytics tab after successful processing
        setTimeout(() => {
          setActiveTab('analytics');
        }, 1000);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleGenerateChinaPost = async () => {
    if (!processedData.length) {
      alert('No processed data available. Please upload and process a file first.');
      return;
    }

    try {
      // Backend generates file directly - NO FRONTEND DATA SENT
      const blob = await apiService.generateChinaPostFile();
      downloadBlob(blob, `CHINAPOST_EXPORT_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating CHINAPOST export file');
    }
  };

  const handleGenerateCBD = async () => {
    if (!processedData.length) {
      alert('No processed data available. Please upload and process a file first.');
      return;
    }

    try {
      // Backend generates file directly - NO FRONTEND DATA SENT
      const blob = await apiService.generateCBDFile();
      downloadBlob(blob, `CBD_EXPORT_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating CBD export file');
    }
  };

  const tabs = [
    { id: 'upload', name: 'Data Upload', icon: Upload },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, disabled: processedData.length === 0 },
    { id: 'cbd', name: 'GOV Section', icon: Building, disabled: processedData.length === 0 },
    { id: 'chinapost', name: 'Postal Service', icon: Plane, disabled: processedData.length === 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PS Data Processing System</h1>
          <div className="mt-1 flex items-center space-x-4">
            <p className="text-gray-600">
              Complete workflow for processing PS raw data with IODA integration (Backend Processing)
            </p>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              isBackendConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span>{isBackendConnected ? 'Backend Connected' : 'Backend Disconnected'}</span>
            </div>
          </div>
        </div>
        {processedData.length > 0 && (
          <div className="text-sm text-gray-500">
            <p>{processedData.length} records processed</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload PS Data File</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} disabled={isLoading} />
              {isLoading ? (
                <div className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500">
                  <AlertCircle className="h-12 w-12" />
                </div>
              ) : (
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              )}
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isLoading 
                  ? 'Processing in Backend...' 
                  : isDragActive
                  ? 'Drop the file here...'
                  : 'Drag & drop IMPORTED DATA.xlsx here, or click to select'
                }
              </p>
              <p className="text-sm text-gray-500">
                Upload the complete Excel file - backend will automatically process the PS raw data using correct workflow
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-800 font-medium">Error:</span>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
              </div>
            )}

            {/* Processing Results */}
            {result && result.success && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-900">Backend Processing Complete</h3>
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  Successfully processed {result.total_records} records with {result.new_entries} new entries added to database
                </p>
                
                {/* Export Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-md bg-green-100 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">CHINAPOST Export</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.results?.chinapost_export?.records_processed || result.total_records} records ready
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-green-100 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">GOV Export</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.results?.cbd_export?.records_processed || result.total_records} records ready
                    </p>
                  </div>
                </div>

                {/* Tariff Method Statistics */}
                {result.tariff_method_stats && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Tariff Calculation Methods</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-800">Configured Rates</span>
                          <span className="text-sm font-bold text-emerald-700">
                            {result.tariff_method_stats.configured_percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">
                          {result.tariff_method_stats.configured_rates} shipments using specific rate configurations
                        </p>
                      </div>
                      <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-amber-800">System Fallback</span>
                          <span className="text-sm font-bold text-amber-700">
                            {result.tariff_method_stats.fallback_percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1">
                          {result.tariff_method_stats.fallback_rates} shipments using system default rate
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Higher configured rates percentage indicates better route/category coverage.</strong> 
                      Consider adding more specific tariff configurations for common routes to reduce fallback usage.
                    </p>
                  </div>
                )}

                <div className="mt-4 space-x-3">
                  <button
                    onClick={handleGenerateChinaPost}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download CHINAPOST Export
                  </button>
                  
                  <button
                    onClick={handleGenerateCBD}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Download GOV Export
                  </button>
                </div>
              </div>
            )}

            {/* Information about workflow */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Correct PS Data Processing Workflow (Backend)</h3>
              <div className="text-xs text-blue-800 space-y-2">
                <p>• Upload the complete Excel file containing PS raw data</p>
                <p>• Backend automatically extracts and processes the "Raw data provided by PS" sheet</p>
                <p>• Backend merges PS data with IODA master data using receptacle matching</p>
                <p>• Backend performs tariff calculations (80% of declared value)</p>
                <p>• Backend generates both POSTAL SERVICE EXPORT and GOV EXPORT formats</p>
                <p>• All processed data is stored in the database for analytics and reporting</p>
                <p>• Frontend displays backend-processed data only - no frontend calculations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab - Uses backend-processed data only */}
      {activeTab === 'analytics' && processedData.length > 0 && (
        <Dashboard 
          data={processedData}
          analyticsData={analyticsData}
          processResult={result || {
            results: {
              chinapost_export: { available: true, records_processed: processedData.length },
              cbd_export: { available: true, records_processed: processedData.length }
            },
            total_records: processedData.length
          }} 
        />
      )}

      {/* GOV Tab - Uses backend-processed data only */}
      {activeTab === 'cbd' && processedData.length > 0 && (
        <CBPSection 
          data={processedData} 
          onDownload={handleGenerateCBD}
          isAvailable={true}
        />
      )}

      {/* Postal Service Tab - Uses backend-processed data only */}
      {activeTab === 'chinapost' && processedData.length > 0 && (
        <ChinaPostSection 
          data={processedData} 
          onDownload={handleGenerateChinaPost}
          isAvailable={true}
        />
      )}

      {/* Empty state for disabled tabs */}
      {(activeTab !== 'upload' && processedData.length === 0) && (
        <div className="text-center py-16">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No processed data available</h3>
          <p className="text-sm text-gray-500">Upload and process a PS data file to view analytics and reports.</p>
        </div>
      )}
    </div>
  );
};

export default DataIngestionSimple;