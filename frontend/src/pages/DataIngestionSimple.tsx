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
  Clock,
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
  const [activeTab, setActiveTab] = useState<'upload' | 'analytics' | 'cbp' | 'china-post'>('upload');
  const [processedData, setProcessedData] = useState<any[]>([]);

  const fetchProcessedData = async () => {
    try {
      console.log('Fetching processed data from database...');
      // Get recent data from a wide date range to capture all processed data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 365 days
      
      const response = await apiService.getHistoricalData(startDate, endDate);
      console.log('Processed data response:', response);
      
      // Format data for the dashboard
      const formattedData = response.data.map(item => ({
        id: item.id,
        '*运单号 (AWB Number)': item.awb_number || item.pawb,
        '*始发站（Departure station）': item.departure_station || item.host_origin_station,
        '*目的站（Destination）': item.destination || item.host_destination_station,
        '*件数(Pieces)': parseFloat(item.pieces || item.packets_in_receptacle || '0'),
        '*重量 (Weight)': parseFloat(item.weight || item.bag_weight || '0'),
        '航司(Airline)': item.airline || item.flight_carrier_1,
        '航班号 (Flight Number)': item.flight_number || item.flight_number_1,
        '航班日期 (Flight Date)': item.flight_date || item.flight_date_1,
        '一个航班的邮件item总数 (Total mail items per flight)': item.total_mail_items || '',
        '一个航班的邮件总重量 (Total mail weight per flight)': item.total_mail_weight || '',
        '*运价类型 (Rate Type)': item.rate_type || 'Standard',
        '*费率 (Rate)': parseFloat(item.rate || '0'),
        '*航空运费 (Air Freight)': parseFloat(item.air_freight || '0'),
        "代理人的其他费用 (Agent's Other Charges)": item.agent_charges || '',
        "承运人的其他费用 (Carrier's Other Charges)": item.carrier_charges || '',
        '*总运费 (Total Charges)': parseFloat(item.total_charges || item.tariff_amount || '0'),
        'Carrier Code': item.carrier_code || item.flight_carrier_1,
        'Flight/ Trip Number': item.flight_number || item.flight_number_1,
        'Tracking Number': item.tracking_number,
        'Arrival Port Code': item.arrival_port_code || 'LAX',
        'Arrival Date': item.arrival_date,
        'Declared Value (USD)': item.declared_value_usd || item.declared_value || item.tariff_amount
      }));

      setProcessedData(formattedData);
      console.log(`Loaded ${formattedData.length} processed records for display`);
      return formattedData;
    } catch (error) {
      console.error('Error fetching processed data:', error);
      return [];
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.healthCheck();
        setIsBackendConnected(true);
        console.log('Backend connected successfully');
        
        // Also try to load any existing processed data
        await fetchProcessedData();
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
      
      const result = await apiService.uploadCNPFile(file);
      console.log('Processing result:', result);
      
      setResult(result);
      
      if (result.success) {
        console.log('File processed successfully!');
        console.log(`Total records: ${result.total_records}`);
        console.log(`New entries: ${result.new_entries}`);
        
        // Fetch the processed data from database
        console.log('Fetching processed data for display...');
        await fetchProcessedData();
        
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
      const blob = await apiService.generateChinaPostFile(processedData);
      downloadBlob(blob, `internal_use_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating Internal Use file');
    }
  };

  const handleGenerateCBP = async () => {
    if (!processedData.length) {
      alert('No processed data available. Please upload and process a file first.');
      return;
    }

    try {
      const blob = await apiService.generateCBPFile(processedData);
      downloadBlob(blob, `cbp_output_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating CBP file');
    }
  };

  const tabs = [
    { id: 'upload', name: 'Data Upload', icon: Upload },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, disabled: processedData.length === 0 },
    { id: 'cbp', name: 'CBP Section', icon: Building, disabled: processedData.length === 0 },
    { id: 'china-post', name: 'China Post', icon: Plane, disabled: processedData.length === 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CNP Data Processing System</h1>
          <div className="mt-1 flex items-center space-x-4">
            <p className="text-gray-600">
              Complete workflow for processing CNP raw data with IODA integration
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CNP Data File</h2>
            
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
                  ? 'Processing...' 
                  : isDragActive
                  ? 'Drop the file here...'
                  : 'Drag & drop Sample Data.xlsx here, or click to select'
                }
              </p>
              <p className="text-sm text-gray-500">
                Upload the complete Excel file - the system will automatically process the CNP raw data sheet
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
                  <h3 className="text-sm font-semibold text-green-900">Processing Complete</h3>
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  Successfully processed {result.total_records} records with {result.new_entries} new entries added to database
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-green-100 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Internal Use Output</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.results?.internal_use?.records_processed || result.total_records} records ready
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-green-100 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">CBP Output</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.results?.cbp?.records_processed || result.total_records} records ready
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-x-3">
                  <button
                    onClick={handleGenerateChinaPost}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download Internal Use File
                  </button>
                  
                  <button
                    onClick={handleGenerateCBP}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Download CBP File
                  </button>
                </div>
              </div>
            )}

            {/* Information about workflow */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">CNP Data Processing Workflow</h3>
              <div className="text-xs text-blue-800 space-y-2">
                <p>• Upload the complete Excel file containing CNP raw data</p>
                <p>• System automatically extracts and processes the "Raw data provided by CNP" sheet</p>
                <p>• Data is merged with IODA China Post reference data using receptacle matching</p>
                <p>• Tariff calculations are performed (80% of declared value)</p>
                <p>• Both Internal Use and CBP format outputs are generated</p>
                <p>• All processed data is stored in the database for analytics and reporting</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && processedData.length > 0 && (
        <Dashboard 
          data={processedData} 
          processResult={result || {
            results: {
              china_post: { available: true, records_processed: processedData.length },
              cbp: { available: true, records_processed: processedData.length }
            },
            total_records: processedData.length
          }} 
        />
      )}

      {/* CBP Tab */}
      {activeTab === 'cbp' && processedData.length > 0 && (
        <CBPSection 
          data={processedData} 
          onDownload={handleGenerateCBP}
          isAvailable={true}
        />
      )}

      {/* China Post Tab */}
      {activeTab === 'china-post' && processedData.length > 0 && (
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
          <p className="text-sm text-gray-500">Upload and process a CNP data file to view analytics and reports.</p>
        </div>
      )}
    </div>
  );
};

export default DataIngestionSimple;