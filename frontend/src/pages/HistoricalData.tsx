import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader, 
  Building,
  Plane,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  Save,
  RotateCcw
} from 'lucide-react';
import { apiService } from '../services/api';
import { downloadBlob } from '../services/api';
import Dashboard from '../components/Dashboard/Dashboard';
import CBPSection from '../components/CBPSection/CBPSection';
import ChinaPostSection from '../components/ChinaPostSection/ChinaPostSection';
import Notification from '../components/Notification/Notification';

interface EditableCellProps {
  value: any;
  field: string;
  recordId: number;
  isEditing: boolean;
  onChange: (recordId: number, field: string, value: any) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, field, recordId, isEditing, onChange }) => {
  if (!isEditing) {
    return (
      <span>
        {field === '*总运费 (Total Charges)' && typeof value === 'number' 
          ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : String(value || '')
        }
      </span>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = field === '*总运费 (Total Charges)' || field === '*重量 (Weight)' 
      ? parseFloat(e.target.value) || 0 
      : e.target.value;
    onChange(recordId, field, newValue);
  };

  return (
    <input
      type={field === '*总运费 (Total Charges)' || field === '*重量 (Weight)' ? 'number' : 'text'}
      value={value || ''}
      onChange={handleChange}
      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      autoFocus
    />
  );
};

const HistoricalData: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'cbp' | 'china-post'>('overview');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [processResult, setProcessResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [editedData, setEditedData] = useState<Record<number, Record<string, any>>>({});
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = historicalData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(historicalData.length / recordsPerPage);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRecords(new Set()); // Clear selections when data changes
    setEditingRows(new Set()); // Clear editing state when data changes
    setEditedData({}); // Clear edited data when data changes
  }, [historicalData]);

  // Clear selections and exit edit mode when switching tabs
  useEffect(() => {
    setSelectedRecords(new Set());
    setEditingRows(new Set());
    setEditedData({});
    if (activeTab !== 'overview') {
      setIsEditMode(false);
    }
  }, [activeTab]);

  // Load initial data on component mount
  useEffect(() => {
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
    setStartDate(defaultStartDate.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    fetchHistoricalData();
  }, []);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      fetchHistoricalData();
    }
  };

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) return;

    try {
      setIsLoading(true);
      const response = await apiService.getHistoricalData(startDate, endDate, departure, destination);
      
      // Format data for consistency with ingestion format
      const formattedData = response.data.map(item => ({
        id: item.id, // Include database ID for deletion
        '*运单号 (AWB Number)': item.awb_number,
        '*始发站（Departure station）': item.departure_station,
        '*目的站（Destination）': item.destination,
        '*件数(Pieces)': parseFloat(item.pieces || 0),
        '*重量 (Weight)': parseFloat(item.weight || 0),
        '航司(Airline)': item.airline,
        '航班号 (Flight Number)': item.flight_number,
        '航班日期 (Flight Date)': item.flight_date,
        '一个航班的邮件item总数 (Total mail items per flight)': item.total_mail_items || '',
        '一个航班的邮件总重量 (Total mail weight per flight)': item.total_mail_weight || '',
        '*运价类型 (Rate Type)': item.rate_type,
        '*费率 (Rate)': parseFloat(item.rate || 0),
        '*航空运费 (Air Freight)': parseFloat(item.air_freight || 0),
        "代理人的其他费用 (Agent's Other Charges)": item.agent_charges || '',
        "承运人的其他费用 (Carrier's Other Charges)": item.carrier_charges || '',
        '*总运费 (Total Charges)': parseFloat(item.total_charges || 0),
        'Carrier Code': item.carrier_code || item.airline,
        'Flight/ Trip Number': item.flight_number,
        'Tracking Number': item.tracking_number || item.awb_number,
        'Arrival Port Code': item.arrival_port_code || item.destination,
        'Arrival Date': item.arrival_date || item.flight_date,
        'Declared Value (USD)': item.declared_value_usd || parseFloat(item.total_charges || 0)
      }));

      setHistoricalData(formattedData);

      setProcessResult({
        results: response.results,
        total_records: response.total_records
      });
      setNotification({
        message: `Successfully retrieved ${response.total_records} records`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setNotification({
        message: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateChinaPost = async () => {
    if (!historicalData.length) {
      setNotification({
        message: 'No data available to generate China Post file',
        type: 'warning'
      });
      return;
    }

    try {
      const blob = await apiService.generateChinaPostFile(historicalData);
      downloadBlob(blob, `china_post_historical_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
      setNotification({
        message: 'China Post file generated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error generating China Post file:', error);
      setNotification({
        message: `Error generating China Post file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleGenerateCBP = async () => {
    if (!historicalData.length) {
      setNotification({
        message: 'No data available to generate CBP file',
        type: 'warning'
      });
      return;
    }

    try {
      const blob = await apiService.generateCBPFile(historicalData);
      downloadBlob(blob, `cbp_historical_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
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
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedRecords(new Set()); // Clear selections when toggling edit mode
    setEditingRows(new Set()); // Clear editing state when toggling edit mode
    setEditedData({}); // Clear edited data when toggling edit mode
  };

  const handleStartRowEdit = (recordId: number, record: any) => {
    const newEditingRows = new Set(editingRows);
    newEditingRows.add(recordId);
    setEditingRows(newEditingRows);
    
    // Initialize edited data for this row
    const editableFields = [
      '*运单号 (AWB Number)',
      '航班日期 (Flight Date)',
      '*始发站（Departure station）',
      '*目的站（Destination）',
      '*重量 (Weight)',
      '*总运费 (Total Charges)'
    ];
    
    const initialData: Record<string, any> = {};
    editableFields.forEach(field => {
      initialData[field] = record[field];
    });
    
    setEditedData(prev => ({
      ...prev,
      [recordId]: initialData
    }));
  };

  const handleCancelRowEdit = (recordId: number) => {
    const newEditingRows = new Set(editingRows);
    newEditingRows.delete(recordId);
    setEditingRows(newEditingRows);
    
    // Remove edited data for this row
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[recordId];
      return newData;
    });
  };

  const handleFieldChange = (recordId: number, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: value
      }
    }));
  };

  const handleSaveRow = async (recordId: number) => {
    if (!editedData[recordId]) return;

    try {
      setSavingRows(prev => new Set(prev).add(recordId));
      
      await apiService.updateRecord(recordId, editedData[recordId]);
      
      setNotification({
        message: 'Record updated successfully',
        type: 'success'
      });

      // Update the local data
      setHistoricalData(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, ...editedData[recordId] }
          : record
      ));

      // Exit edit mode for this row
      handleCancelRowEdit(recordId);
    } catch (error) {
      console.error('Error updating record:', error);
      setNotification({
        message: `Error updating record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setSavingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleRecordSelect = (recordId: number, isSelected: boolean) => {
    const newSelectedRecords = new Set(selectedRecords);
    if (isSelected) {
      newSelectedRecords.add(recordId);
    } else {
      newSelectedRecords.delete(recordId);
    }
    setSelectedRecords(newSelectedRecords);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allIds = new Set(currentRecords.map(record => record.id));
      setSelectedRecords(allIds);
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) {
      setNotification({
        message: 'No records selected for deletion',
        type: 'warning'
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedRecords.size} selected record(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const ids = Array.from(selectedRecords);
      const response = await apiService.deleteRecords(ids);
      
      setNotification({
        message: response.message,
        type: 'success'
      });

      // Refresh data after deletion
      await fetchHistoricalData();
      setSelectedRecords(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error('Error deleting records:', error);
      setNotification({
        message: `Error deleting records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Search },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'cbp', name: 'CBP Report', icon: Building },
    { id: 'china-post', name: 'China Post', icon: Plane },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historical Data Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Analyze and track all shipment data over time
          </p>
        </div>
        {historicalData.length > 0 && activeTab === 'overview' && (
          <div className="flex space-x-3">
            <button
              onClick={handleToggleEditMode}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                isEditMode
                  ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              {isEditMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Records
                </>
              )}
            </button>
            {isEditMode && selectedRecords.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedRecords.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Filters */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure Station
            </label>
            <input
              type="text"
              placeholder="e.g., HKG, PVG..."
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              type="text"
              placeholder="e.g., LAX, JFK..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input-field w-full"
            />
          </div>
          <div>
            <button
              onClick={fetchHistoricalData}
              disabled={isLoading}
              className="btn-primary w-full h-10 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Filter className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Loading...' : 'Update Dashboard'}</span>
            </button>
          </div>
        </div>
        
        {/* Clear Filters */}
        {(departure || destination) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setDeparture('');
                setDestination('');
                // Auto-refetch data after clearing filters
                setTimeout(fetchHistoricalData, 100);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear additional filters
            </button>
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
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-cathay-teal text-cathay-teal'
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
      {historicalData.length > 0 ? (
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isEditMode && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={currentRecords.length > 0 && currentRecords.every(record => selectedRecords.has(record.id))}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AWB Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flight Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destination
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weight (kg)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Charges
                      </th>
                      {isEditMode && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRecords.map((record, index) => {
                      const isRowEditing = editingRows.has(record.id);
                      const isRowSaving = savingRows.has(record.id);
                      const rowData = isRowEditing ? { ...record, ...editedData[record.id] } : record;
                      
                      return (
                        <tr key={record.id || index} className={`hover:bg-gray-50 ${selectedRecords.has(record.id) ? 'bg-blue-50' : ''} ${isRowEditing ? 'bg-yellow-50' : ''}`}>
                          {isEditMode && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedRecords.has(record.id)}
                                onChange={(e) => handleRecordSelect(record.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={isRowEditing}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <EditableCell
                              value={rowData['*运单号 (AWB Number)']}
                              field="*运单号 (AWB Number)"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <EditableCell
                              value={rowData['航班日期 (Flight Date)']}
                              field="航班日期 (Flight Date)"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <EditableCell
                              value={rowData['*始发站（Departure station）']}
                              field="*始发站（Departure station）"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <EditableCell
                              value={rowData['*目的站（Destination）']}
                              field="*目的站（Destination）"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <EditableCell
                              value={rowData['*重量 (Weight)']}
                              field="*重量 (Weight)"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <EditableCell
                              value={rowData['*总运费 (Total Charges)']}
                              field="*总运费 (Total Charges)"
                              recordId={record.id}
                              isEditing={isRowEditing}
                              onChange={handleFieldChange}
                            />
                          </td>
                          {isEditMode && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                {isRowEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveRow(record.id)}
                                      disabled={isRowSaving}
                                      className="inline-flex items-center px-2 py-1 border border-green-300 rounded text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isRowSaving ? (
                                        <Loader className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Save className="h-3 w-3" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleCancelRowEdit(record.id)}
                                      disabled={isRowSaving}
                                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleStartRowEdit(record.id, record)}
                                    className="inline-flex items-center px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, historicalData.length)} of {historicalData.length} records
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'analytics' && (
            <Dashboard 
              data={historicalData} 
              processResult={processResult || {
                results: {
                  china_post: { available: true, records_processed: historicalData.length },
                  cbp: { available: true, records_processed: historicalData.length }
                },
                total_records: historicalData.length
              }} 
            />
          )}
          {activeTab === 'cbp' && (
            <CBPSection
              data={historicalData}
              isAvailable={true}
              onDownload={handleGenerateCBP}
            />
          )}
          {activeTab === 'china-post' && (
            <ChinaPostSection
              data={historicalData}
              isAvailable={true}
              onDownload={handleGenerateChinaPost}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date range to view historical data
          </p>
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

export default HistoricalData;
