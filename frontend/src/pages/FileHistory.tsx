import React, { useState, useEffect } from 'react';
import { Download, Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, Calendar, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';

interface FileHistoryRecord {
  id: number;
  created_at: string;
  original_filename: string;
  file_size_bytes: number;
  file_size_mb: number;
  upload_timestamp: string;
  processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  processing_started_at: string;
  processing_completed_at: string;
  processing_error: string | null;
  processing_duration_seconds: number | null;
  records_imported: number;
  records_skipped: number;
  chinapost_records: number;
  cbd_records: number;
  has_original_file: boolean;
  has_chinapost_export: boolean;
  has_cbd_export: boolean;
  uploaded_by: string;
  upload_notes: string;
}

const FileHistory: React.FC = () => {
  const [fileHistory, setFileHistory] = useState<FileHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFileHistory();
  }, []);

  const fetchFileHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFileHistory();
      setFileHistory(response.files || []);
    } catch (error) {
      console.error('Error fetching file history:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileId: number, fileType: 'original' | 'chinapost' | 'cbd') => {
    const downloadKey = `${fileId}-${fileType}`;
    
    try {
      setDownloadingFiles(prev => new Set(prev).add(downloadKey));
      
      const blob = await apiService.downloadHistoryFile(fileId, fileType);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename
      const file = fileHistory.find(f => f.id === fileId);
      const baseFilename = file?.original_filename?.replace(/\.[^/.]+$/, "") || `file_${fileId}`;
      let filename = `${baseFilename}_${fileType}.xlsx`;
      
      if (fileType === 'original') {
        filename = file?.original_filename || `original_${fileId}.xlsx`;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error(`Error downloading ${fileType} file:`, error);
      alert(`Failed to download ${fileType} file. Please try again.`);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file record? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiService.deleteFileHistory(fileId);
      setFileHistory(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file record. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = fileHistory.filter(file => {
    const matchesSearch = file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploaded_by.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || file.processing_status === statusFilter;
    
    const matchesDate = !dateFilter || 
                       new Date(file.upload_timestamp).toDateString() === new Date(dateFilter).toDateString();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <span className="text-gray-600">Loading file history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-8 w-8 text-emerald-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">File History</h1>
            <p className="text-gray-600 mt-1">Track and download your imported files and generated exports</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="processed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredFiles.length} of {fileHistory.length} files
        </p>
      </div>

      {/* File History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {fileHistory.length === 0 
                ? "No files have been uploaded yet." 
                : "No files match your current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    {/* File Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <Upload className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.original_filename}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.file_size_bytes)} • Uploaded {formatDate(file.upload_timestamp)}
                          </p>
                          {file.uploaded_by && (
                            <p className="text-xs text-gray-500">By: {file.uploaded_by}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.processing_status)}
                        <span className="text-sm text-gray-900">{getStatusText(file.processing_status)}</span>
                      </div>
                      {file.processing_duration_seconds && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {file.processing_duration_seconds}s
                        </p>
                      )}
                      {file.processing_error && (
                        <p className="text-xs text-red-600 mt-1" title={file.processing_error}>
                          Error: {file.processing_error.substring(0, 50)}...
                        </p>
                      )}
                    </td>

                    {/* Processing Results */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p>Records: {file.records_imported}</p>
                        {file.records_skipped > 0 && (
                          <p className="text-yellow-600">Skipped: {file.records_skipped}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          <p>CHINAPOST: {file.chinapost_records}</p>
                          <p>CBD: {file.cbd_records}</p>
                        </div>
                      </div>
                    </td>

                    {/* Downloads */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {file.has_original_file && (
                          <button
                            onClick={() => downloadFile(file.id, 'original')}
                            disabled={downloadingFiles.has(`${file.id}-original`)}
                            className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {downloadingFiles.has(`${file.id}-original`) ? 'Downloading...' : 'Original'}
                          </button>
                        )}
                        {file.has_chinapost_export && (
                          <button
                            onClick={() => downloadFile(file.id, 'chinapost')}
                            disabled={downloadingFiles.has(`${file.id}-chinapost`)}
                            className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {downloadingFiles.has(`${file.id}-chinapost`) ? 'Downloading...' : 'CHINAPOST'}
                          </button>
                        )}
                        {file.has_cbd_export && (
                          <button
                            onClick={() => downloadFile(file.id, 'cbd')}
                            disabled={downloadingFiles.has(`${file.id}-cbd`)}
                            className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {downloadingFiles.has(`${file.id}-cbd`) ? 'Downloading...' : 'CBD'}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileHistory;
