import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { apiService } from '../services/api';
import Notification from '../components/Notification/Notification';

const DataIngestionSimple: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload'>('upload');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.healthCheck();
        setIsBackendConnected(true);
        console.log('Backend connected successfully');
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
        
        // Show success notification instead of redirecting
        setNotification({
          message: 'Data has been processed successfully! You can access reports from Historical Data section.',
          type: 'success'
        });
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

  const tabs = [
    { id: 'upload', name: 'Data Upload', icon: Upload },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PS Data Processing System</h1>
          <div className="mt-1 flex items-center space-x-4">
            <p className="text-gray-600">
              Complete workflow for processing PS raw data with IODA integration.
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
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Data Processing Complete!</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Your data has been processed and stored. Access analytics and download exports from the <strong>Historical Data section</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Information about workflow */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">PS Data Processing Workflow</h3>
              <div className="text-xs text-blue-800 space-y-2">
                <p>• Upload the complete Excel file containing PS raw data</p>
                <p>• Backend automatically extracts and processes the "Raw data provided by PS" sheet</p>
                <p>• Backend merges PS data with IODA master data using receptacle matching</p>
                <p>• Backend performs tariff calculations (80% of declared value)</p>
                <p>• Backend generates both POSTAL SERVICE EXPORT and GOV EXPORT formats</p>
                <p>• All processed data is stored in the database for analytics and reporting</p>
                <p>• <strong>Access analytics and reports from the Historical Data section</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default DataIngestionSimple;