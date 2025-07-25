import React, { useState, useCallback } from 'react';
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
  Database,
  GitMerge,
  Package,
} from 'lucide-react';
import { DataFile } from '../types';

const DataIngestion: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<DataFile[]>([]);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      // Determine file type based on filename
      let fileType: 'cardit' | 'awb_master' | 'event_data' = 'cardit';
      if (file.name.toLowerCase().includes('awb') || file.name.toLowerCase().includes('master')) {
        fileType = 'awb_master';
      } else if (file.name.toLowerCase().includes('event')) {
        fileType = 'event_data';
      }

      const newFile: DataFile = {
        id: Math.random().toString(36).substr(2, 9),
        filename: file.name,
        file_type: fileType,
        upload_date: new Date().toISOString(),
        total_records: 0,
        processed_records: 0,
        error_records: 0,
        validation_errors: [],
        status: 'uploaded'
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Simulate file processing
      setTimeout(() => {
        setProcessingFile(newFile.id);
        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id ? { ...f, status: 'processing' as const } : f
        ));
        
        setTimeout(() => {
          const totalRecords = Math.floor(Math.random() * 1000) + 100;
          const errorRecords = Math.floor(Math.random() * 50);
          const processedRecords = totalRecords - errorRecords;
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? {
                  ...f,
                  status: errorRecords > 0 ? 'partial_success' as const : 'completed' as const,
                  total_records: totalRecords,
                  processed_records: processedRecords,
                  error_records: errorRecords,
                  validation_errors: errorRecords > 0 ? [
                    {
                      row_number: 15,
                      field: 'declared_value',
                      error_type: 'invalid_format',
                      message: 'Invalid currency format',
                      value: 'ABC'
                    },
                    {
                      row_number: 23,
                      field: 'receptacle_id',
                      error_type: 'missing',
                      message: 'Receptacle ID is required'
                    }
                  ] : []
                }
              : f
          ));
          setProcessingFile(null);
        }, 3000);
      }, 1000);
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

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'cardit':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'awb_master':
        return <Database className="h-5 w-5 text-green-600" />;
      case 'event_data':
        return <GitMerge className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'cardit':
        return 'CARDIT Data';
      case 'awb_master':
        return 'AWB Master';
      case 'event_data':
        return 'Event Data';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'partial_success':
        return 'text-yellow-600 bg-yellow-100';
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
      case 'partial_success':
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Ingestion</h1>
          <p className="mt-1 text-gray-600">
            Upload and process CARDIT, AWB Master, and Event data files
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary px-4 py-2">
            <Download className="h-4 w-4 mr-2" />
            Download Templates
          </button>
          <button className="btn-secondary px-4 py-2">
            <FileText className="h-4 w-4 mr-2" />
            Data Guide
          </button>
        </div>
      </div>

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
                Supported formats: Excel (.xlsx, .xls), CSV (.csv)
              </p>
            </div>

            {/* File Type Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">CARDIT Data</h3>
                </div>
                <p className="text-xs text-blue-800">
                  Invoice data from postal services with receptacle and package information
                </p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-900">AWB Master</h3>
                </div>
                <p className="text-xs text-green-800">
                  Cathay flight data with AWB numbers and routing information
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <GitMerge className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900">Event Data</h3>
                </div>
                <p className="text-xs text-purple-800">
                  Flight events including departures, arrivals, and deliveries
                </p>
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
                        {getFileTypeIcon(file.file_type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{getFileTypeLabel(file.file_type)}</span>
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
                    {getFileTypeIcon(selectedFile.file_type)}
                    <span className="text-sm text-gray-900">{getFileTypeLabel(selectedFile.file_type)}</span>
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
    </div>
  );
};

export default DataIngestion;
