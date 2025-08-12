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
  X
} from 'lucide-react';
import { apiService } from '../services/api';
import { downloadBlob } from '../services/api';
import Dashboard from '../components/Dashboard/Dashboard';
import CBPSection from '../components/CBPSection/CBPSection';
import ChinaPostSection from '../components/ChinaPostSection/ChinaPostSection';
import Notification from '../components/Notification/Notification';


const HistoricalData: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'cbp' | 'china-post'>('overview');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [rawBackendData, setRawBackendData] = useState<any[]>([]); // Store raw backend data for CBP/China Post
  const [processResult, setProcessResult] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
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
  }, [historicalData, rawBackendData]);

  // Clear selections and exit edit mode when switching tabs
  useEffect(() => {
    setSelectedRecords(new Set());
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

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) return;

    try {
      setIsLoading(true);
      
      // Fetch both historical data and analytics from backend with same date range
      const [historyResponse, analyticsResponse] = await Promise.all([
        apiService.getHistoricalData(startDate, endDate),
        apiService.getAnalytics(startDate, endDate)
      ]);
      
      // Format data using NEW CNP+IODA backend structure - NO FRONTEND PROCESSING
      const formattedData = historyResponse.data.map((item: any) => ({
        id: item.id, // Database ID for deletion
        
        // Core identification (from backend ProcessedShipment model)
        'PAWB': item.pawb || '',
        'CARDIT': item.cardit || '',
        'Tracking Number': item.tracking_number || '',
        'Receptacle': item.receptacle_id || '',
        'Classification': item.goods_category || '',
        
        // Flight and routing (NEW CNP+IODA structure)
        'Origin Station': item.host_origin_station || '',
        'Destination Station': item.host_destination_station || '',
        'Flight Carrier 1': item.flight_carrier_1 || '',
        'Flight Number 1': item.flight_number_1 || '',
        'Flight Date 1': item.flight_date_1 || '',
        'Flight Carrier 2': item.flight_carrier_2 || '',
        'Flight Number 2': item.flight_number_2 || '',
        'Flight Date 2': item.flight_date_2 || '',
        'Arrival Date': item.arrival_date || '',
        'Arrival ULD': item.arrival_uld_number || '',
        
        // Package details (NEW structure)
        'Bag Weight (kg)': item.bag_weight || '',
        'Bag Number': item.bag_number || '',
        'Declared Content': item.declared_content || '',
        'HS Code': item.hs_code || '',
        'Declared Value': item.declared_value || '',
        'Currency': item.currency || '',
        'Number of Packets': item.number_of_packets || '',
        'Tariff Amount': item.tariff_amount || '',
        
        // CBD export fields (computed by backend)
        'Carrier Code': item.carrier_code || '',
        'Flight/Trip Number': item.flight_trip_number || '',
        'Arrival Port Code': item.arrival_port_code || '',
        'Arrival Date Formatted': item.arrival_date_formatted || '',
        'Declared Value (USD)': item.declared_value_usd || ''
      }));

      setHistoricalData(formattedData);
      setRawBackendData(historyResponse.data); // Store raw backend data for CBP/China Post sections
      setAnalyticsData(analyticsResponse); // Set backend analytics data

      setProcessResult({
        results: historyResponse.results,
        total_records: historyResponse.total_records
      });
      setNotification({
        message: `Successfully retrieved ${historyResponse.total_records} records`,
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
      // Backend generates file directly from database - no frontend data needed
      const blob = await apiService.generateChinaPostFile();
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
      // Backend generates file directly from database - no frontend data needed
      const blob = await apiService.generateCBDFile();
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

      {/* Date Range Selector */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="card p-4">
                  <div className="text-sm font-medium text-gray-600">Total Records</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analyticsData?.analytics?.total_shipments?.toLocaleString() || historicalData.length.toLocaleString()}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-medium text-gray-600">Total Weight</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analyticsData?.analytics?.total_weight?.toLocaleString() || '0'} kg
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-medium text-gray-600">Declared Value</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${analyticsData?.analytics?.total_declared_value?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-medium text-gray-600">Carriers</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analyticsData?.analytics?.unique_carriers || '0'}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-sm font-medium text-gray-600">Total Tariff</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${analyticsData?.analytics?.total_tariff?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
              
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
                        ID / PAWB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CARDIT / Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classification
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route & Station
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flight Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Arrival & ULD
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bag & Receptacle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content & Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tariff & Packets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CBD Fields
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRecords.map((record, index) => {
                      return (
                        <tr key={record.id || index} className={`hover:bg-gray-50 ${selectedRecords.has(record.id) ? 'bg-blue-50' : ''}`}>
                          {isEditMode && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedRecords.has(record.id)}
                                onChange={(e) => handleRecordSelect(record.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">ID: {record['PAWB']}</div>
                            <div className="text-sm text-gray-500">PAWB: {record['PAWB'] || 'N/A'}</div>
                            <div className="text-xs text-gray-400">Seq: {record[''] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">CARDIT: {record['CARDIT'] || 'N/A'}</div>
                            <div className="text-sm text-gray-500 font-mono">Tracking: {record['Tracking Number'] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              {record['Classification'] || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record['Origin Station'] || 'N/A'} → {record['Destination Station'] || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record['Flight Carrier 1'] || 'N/A'} {record['Flight Number 1'] || ''}
                            </div>
                            <div className="text-xs text-gray-500">{record['Flight Date 1'] || 'N/A'}</div>
                            {record['Flight Carrier 2'] && (
                              <div className="text-xs text-gray-400">
                                Leg 2: {record['Flight Carrier 2']} {record['Flight Number 2']}
                              </div>
                            )}
                            {record['Flight Carrier 3'] && (
                              <div className="text-xs text-gray-400">
                                Leg 3: {record['Flight Carrier 3']} {record['Flight Number 3']}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">Arrival: {record['Arrival Date'] || 'N/A'}</div>
                            <div className="text-xs text-gray-500">ULD: {record['Arrival ULD'] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">Bag: {record['Bag Number'] || 'N/A'}</div>
                            <div className="text-sm font-medium text-gray-900">{record['Bag Weight (kg)'] || 'N/A'} kg</div>
                            <div className="text-xs text-gray-500">Receptacle: {record['Receptacle'] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900" title={record['Declared Content'] || 'N/A'}>
                              {record['Declared Content'] ? 
                                (record['Declared Content'].length > 15 ? 
                                  record['Declared Content'].substring(0, 15) + '...' : 
                                  record['Declared Content']
                                ) : 'N/A'
                              }
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {record['Declared Value'] || 'N/A'} {record['Currency'] || ''}
                            </div>
                            <div className="text-xs text-gray-500">HS: {record['HS Code'] || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              Tariff: ${record['Tariff Amount'] || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Packets: {record['Number of Packets'] || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-900">
                              Carrier: {record['Carrier Code'] || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Flight: {record['Flight/Trip Number'] || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Port: {record['Arrival Port Code'] || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              USD: {record['Declared Value (USD)'] || 'N/A'}
                            </div>
                          </td>
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
              analyticsData={analyticsData} 
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
              data={rawBackendData}
              isAvailable={true}
              onDownload={handleGenerateCBP}
            />
          )}
          {activeTab === 'china-post' && (
            <ChinaPostSection
              data={rawBackendData}
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
