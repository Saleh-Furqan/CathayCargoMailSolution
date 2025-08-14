import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  Building,
  Plane,
} from 'lucide-react';
import { DataFile } from '../types';
import { apiService, downloadBlob, ProcessDataResponse } from '../services/api';
import Dashboard from '../components/Dashboard/Dashboard';
import CBPSection from '../components/CBPSection/CBPSection';
import ChinaPostSection from '../components/ChinaPostSection/ChinaPostSection';
import Notification from '../components/Notification/Notification';

const DataIngestion: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<DataFile[]>([]);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [processResult, setProcessResult] = useState<ProcessDataResponse | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'cbp' | 'china-post'>('upload');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck();
        await apiService.getColumns(); // Just call it but don't store
        setIsBackendConnected(true);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setIsBackendConnected(false);
      }
    };

    checkBackendConnection();
  }, []);

  const fetchProcessedData = async () => {
    try {
      console.log('fetchProcessedData: Starting to fetch most recent upload data...');
      
      // Get data from the most recent upload only (not session-based)
      const response = await apiService.getRecentUploadData();
      console.log('fetchProcessedData: Response received:', response);
      console.log('fetchProcessedData: Response data length:', response.data?.length || 0);
      console.log('fetchProcessedData: Upload ID:', response.upload_id);
      
      // Format data for the dashboard (already in correct format from backend)
      const formattedData = response.data.map((item: any) => ({
        id: item.id,
        // Keep existing field mappings for compatibility
        '*运单号 (AWB Number)': item.pawb,
        '*始发站（Departure station）': item.host_origin_station,
        '*目的站（Destination）': item.host_destination_station,
        '*件数(Pieces)': parseFloat(item.number_of_packets || 0),
        '*重量 (Weight)': parseFloat(item.bag_weight || 0),
        '航司(Airline)': item.flight_carrier_1,
        '航班号 (Flight Number)': item.flight_number_1,
        '航班日期 (Flight Date)': item.flight_date_1,
        '一个航班的邮件item总数 (Total mail items per flight)': item.number_of_packets || '',
        '一个航班的邮件总重量 (Total mail weight per flight)': item.bag_weight || '',
        '*运价类型 (Rate Type)': item.postal_service,
        '*费率 (Rate)': parseFloat(item.tariff_rate_used || 0),
        '*航空运费 (Air Freight)': parseFloat(item.tariff_amount || 0),
        "代理人的其他费用 (Agent's Other Charges)": '',
        "承运人的其他费用 (Carrier's Other Charges)": '',
        '*总运费 (Total Charges)': parseFloat(item.tariff_amount || 0),
        // Map to backend fields for components
        sequence_number: item.sequence_number,
        pawb: item.pawb,
        cardit: item.cardit,
        tracking_number: item.tracking_number,
        receptacle_id: item.receptacle_id,
        host_origin_station: item.host_origin_station,
        host_destination_station: item.host_destination_station,
        flight_carrier_1: item.flight_carrier_1,
        flight_number_1: item.flight_number_1,
        flight_date_1: item.flight_date_1,
        flight_carrier_2: item.flight_carrier_2,
        flight_number_2: item.flight_number_2,
        flight_date_2: item.flight_date_2,
        flight_carrier_3: item.flight_carrier_3,
        flight_number_3: item.flight_number_3,
        flight_date_3: item.flight_date_3,
        arrival_date: item.arrival_date,
        arrival_date_formatted: item.arrival_date_formatted,
        arrival_uld_number: item.arrival_uld_number,
        bag_weight: item.bag_weight,
        bag_number: item.bag_number,
        declared_content: item.declared_content,
        hs_code: item.hs_code,
        declared_value: item.declared_value,
        declared_value_usd: item.declared_value_usd,
        currency: item.currency,
        number_of_packets: item.number_of_packets,
        tariff_amount: item.tariff_amount,
        goods_category: item.goods_category,
        postal_service: item.postal_service,
        shipment_date: item.shipment_date,
        tariff_rate_used: item.tariff_rate_used,
        tariff_calculation_method: item.tariff_calculation_method,
        carrier_code: item.carrier_code,
        flight_trip_number: item.flight_trip_number,
        arrival_port_code: item.arrival_port_code,
        file_upload_id: item.file_upload_id
      }));

      console.log('fetchProcessedData: Formatted data length:', formattedData.length);
      setProcessedData(formattedData);
      console.log('fetchProcessedData: Data set in state successfully (from most recent upload)');
      
    } catch (error) {
      console.error('fetchProcessedData: Error fetching processed data:', error);
      console.error('fetchProcessedData: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setNotification({
        message: `Error fetching processed data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const processFileData = async (file: File, fileId: string) => {
    try {
      console.log('Starting to process file:', file.name, 'Size:', file.size, 'bytes');
      console.log('File type:', file.type);
      console.log('File last modified:', new Date(file.lastModified));
      
      setProcessingFile(fileId);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing' as const } : f
      ));

      // Check if this is a CNP raw data file and process accordingly
      console.log('Processing CNP raw data file...');
      console.log('Calling apiService.uploadCNPFile...');
      
      const result = await apiService.uploadCNPFile(file);
      console.log('Backend processing result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result || {}));
      
      setProcessResult(result);
      
      // Fetch the processed data from the backend after successful processing
      console.log('Fetching processed data...');
      await fetchProcessedData();
      console.log('Processed data fetched successfully');

      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? {
              ...f,
              status: 'completed' as const,
              total_records: result.total_records,
              processed_records: result.total_records,
              error_records: 0,
              validation_errors: []
            }
          : f
      ));

      // Show success notification
      setNotification({
        message: `Successfully processed ${result.total_records} records!`,
        type: 'success'
      });

      // Auto-switch to dashboard after successful processing
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 1000);

    } catch (error) {
      console.error('File processing error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });

      // Show error notification
      setNotification({
        message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });

      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? {
              ...f,
              status: 'failed' as const,
              validation_errors: [
                {
                  row_number: 0,
                  field: 'file',
                  error_type: 'processing_error',
                  message: error instanceof Error ? error.message : 'Unknown error occurred'
                }
              ]
            }
          : f
      ));
    } finally {
      setProcessingFile(null);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const newFile: DataFile = {
        id: Math.random().toString(36).substring(2, 11),
        filename: file.name,
        file_type: 'template_data',
        upload_date: new Date().toISOString(),
        total_records: 0,
        processed_records: 0,
        error_records: 0,
        validation_errors: [],
        status: 'uploaded'
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Process file immediately
      processFileData(file, newFile.id);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const getFileTypeIcon = () => {
    return <FileSpreadsheet className="h-5 w-5 text-blue-600" />;
  };

  const getFileTypeLabel = () => {
    return 'Template Data';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const handleGenerateChinaPost = async () => {
    if (!uploadedFiles.length || !processResult) {
      setNotification({
        message: 'Please upload and process data first',
        type: 'warning'
      });
      return;
    }

    try {
      // Check if we have processed files
      if (uploadedFiles.length === 0) {
        setNotification({
          message: 'No files available for processing',
          type: 'warning'
        });
        return;
      }
      
      // Create a temporary file input to get the file again (or use stored file data)
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xlsx,.xls';
      
      // For the new workflow, we need to process the file again to generate the output
      // This could be optimized by storing the file data or processed results
      setNotification({
        message: 'Generating Internal Use file... This may take a moment.',
        type: 'info'
      });

      // Note: In a production system, you would store the file or processed data
      // For now, ask user to re-upload the file for generation
      fileInput.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          try {
            const blob = await apiService.generateChinaPostFile();
            downloadBlob(blob, `internal_use_output_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
            setNotification({
              message: 'Internal Use file generated successfully',
              type: 'success'
            });
          } catch (error) {
            console.error('Error generating Internal Use file:', error);
            setNotification({
              message: `Error generating Internal Use file: ${error instanceof Error ? error.message : 'Unknown error'}`,
              type: 'error'
            });
          }
        }
      };
      
      fileInput.click();
      
    } catch (error) {
      console.error('Error generating China Post file:', error);
      setNotification({
        message: `Error generating China Post file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleGenerateCBP = async () => {
    if (!uploadedFiles.length || !processResult) {
      setNotification({
        message: 'Please upload and process data first',
        type: 'warning'
      });
      return;
    }

    try {
      // Create a temporary file input to get the file again
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xlsx,.xls';
      
      setNotification({
        message: 'Generating CBP file... This may take a moment.',
        type: 'info'
      });

      fileInput.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          try {
            const blob = await apiService.generateCBPFile();
            downloadBlob(blob, `cbp_output_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
            setNotification({
              message: 'CBP file generated successfully',
              type: 'success'
            });
          } catch (error) {
            console.error('Error generating CBP file:', error);
            setNotification({
              message: `Error generating CBP file: ${error instanceof Error ? error.message : 'Unknown error'}`,
              type: 'error'
            });
          }
        }
      };
      
      fileInput.click();
      
    } catch (error) {
      console.error('Error generating CBP file:', error);
      setNotification({
        message: `Error generating CBP file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const tabs = [
    { id: 'upload', name: 'Data Upload', icon: Upload },
    { id: 'dashboard', name: 'Analytics', icon: BarChart3, disabled: !processResult },
    { id: 'cbp', name: 'CBP Section', icon: Building, disabled: !processResult?.results?.cbp?.available && !processResult?.results?.internal_use?.available },
    { id: 'china-post', name: 'China Post', icon: Plane, disabled: !processResult?.results?.china_post?.available && !processResult?.results?.internal_use?.available },
  ];

  // Add error boundary handling
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error caught:', error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">The application encountered an error. Please check the console for details.</p>
          <button 
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
            className="btn-primary"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mail Processing System</h1>
          <div className="mt-1 flex items-center space-x-4">
            <p className="text-gray-600">
              Complete solution for China Post and CBP data processing with analytics
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
                    ? 'border-cathay-teal text-cathay-teal'
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Data Files</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-cathay-teal bg-cathay-teal/5 scale-105'
                  : 'border-gray-300 hover:border-cathay-teal hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive
                  ? 'Drop the files here...'
                  : 'Drag & drop files here, or click to select'}
              </p>
              <p className="text-sm text-gray-500">
                Upload CNP raw data file (Excel format with "Raw data provided by CNP" sheet only)
                <br />
                <span className="text-xs text-blue-600">Note: Upload the entire Excel file - the system will automatically process the first sheet</span>
              </p>
            </div>

            {/* Processing Results */}
            {processResult && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-900">Processing Complete</h3>
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  Processed {processResult.total_records} records successfully
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3 rounded-md ${
                    (processResult.results.internal_use?.available || processResult.results.china_post?.available)
                      ? 'bg-green-100 border border-green-200' 
                      : 'bg-red-100 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Internal Use Output</span>
                      {(processResult.results.internal_use?.available || processResult.results.china_post?.available) ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    {(processResult.results.internal_use?.records_processed || processResult.results.china_post?.records_processed) && (
                      <p className="text-xs text-gray-600 mt-1">
                        {processResult.results.internal_use?.records_processed || processResult.results.china_post?.records_processed} records ready
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-md ${
                    processResult.results.cbp?.available
                      ? 'bg-green-100 border border-green-200' 
                      : 'bg-red-100 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">CBP Output</span>
                      {processResult.results.cbp?.available ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    {processResult.results.cbp?.records_processed && (
                      <p className="text-xs text-gray-600 mt-1">
                        {processResult.results.cbp.records_processed} records ready
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Information about new workflow */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">New Data Processing Workflow</h3>
              <div className="text-xs text-blue-800 space-y-2">
                <p>• Upload the CNP raw data file (Excel format with "Raw data provided by CNP" sheet)</p>
                <p>• The system will automatically merge it with IODA China Post data</p>
                <p>• Generate both internal use and CBP output files in the correct format</p>
                <p>• No need to manually format or merge data - everything is automated!</p>
              </div>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Uploaded Files</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getFileTypeIcon()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{getFileTypeLabel()}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(file.upload_date)}
                          </span>
                        </div>
                        {file.total_records > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {file.processed_records} of {file.total_records} records processed
                            {file.error_records > 0 && (
                              <span className="text-red-600 ml-1">
                                ({file.error_records} errors)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        processingFile === file.id ? 'processing' : file.status
                      )}`}>
                        {getStatusIcon(processingFile === file.id ? 'processing' : file.status)}
                        <span className="ml-1">
                          {processingFile === file.id ? 'Processing' : file.status.replace('_', ' ')}
                        </span>
                      </span>
                      <button
                        onClick={() => setSelectedFile(file)}
                        className="text-cathay-teal hover:text-cathay-teal-dark"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedFile ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">File Details</h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Filename
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedFile.filename}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    File Type
                  </label>
                  <div className="mt-1 flex items-center space-x-2">
                    {getFileTypeIcon()}
                    <span className="text-sm text-gray-900">{getFileTypeLabel()}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Upload Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedFile.upload_date)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedFile.status)}`}>
                    {getStatusIcon(selectedFile.status)}
                    <span className="ml-1">{selectedFile.status.replace('_', ' ')}</span>
                  </span>
                </div>
                
                {selectedFile.total_records > 0 && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Processing Summary
                      </label>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Records:</span>
                          <span className="font-medium">{selectedFile.total_records}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Processed:</span>
                          <span className="font-medium text-green-600">{selectedFile.processed_records}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Errors:</span>
                          <span className="font-medium text-red-600">{selectedFile.error_records}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cathay-teal h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(selectedFile.processed_records / selectedFile.total_records) * 100}%`
                        }}
                      ></div>
                    </div>
                  </>
                )}
                
                {selectedFile.validation_errors.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Validation Errors
                    </label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {selectedFile.validation_errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                          <p className="font-medium text-red-800">Row {error.row_number}: {error.field}</p>
                          <p className="text-red-600">{error.message}</p>
                          {error.value && (
                            <p className="text-red-500 italic">Value: "{error.value}"</p>
                          )}
                        </div>
                      ))}
                      {selectedFile.validation_errors.length > 5 && (
                        <p className="text-xs text-gray-500">
                          +{selectedFile.validation_errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 space-y-2">
                  <button className="w-full btn-primary py-2 text-sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  <button className="w-full btn-secondary py-2 text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </button>
                  {selectedFile.error_records > 0 && (
                    <button className="w-full btn-secondary py-2 text-sm text-red-600 border-red-300 hover:bg-red-50">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Download Error Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No file selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a file from the list to view details and processing status.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <Dashboard data={processedData} analyticsData={null} processResult={processResult} />
      )}

      {/* CBP Tab */}
      {activeTab === 'cbp' && (
        <CBPSection 
          data={processedData} 
          onDownload={handleGenerateCBP}
          isAvailable={processResult?.results?.cbp?.available || processResult?.results?.internal_use?.available || false}
        />
      )}

      {/* China Post Tab */}
      {activeTab === 'china-post' && (
        <ChinaPostSection 
          data={processedData} 
          onDownload={handleGenerateChinaPost}
          isAvailable={processResult?.results?.china_post?.available || processResult?.results?.internal_use?.available || false}
        />
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

export default DataIngestion;
