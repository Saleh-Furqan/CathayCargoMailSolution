import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader, 
  Building,
  Plane,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiService } from '../services/api';
import { downloadBlob } from '../services/api';
import Dashboard from '../components/Dashboard/Dashboard';
import CBPSection from '../components/CBPSection/CBPSection';
import ChinaPostSection from '../components/ChinaPostSection/ChinaPostSection';
import TariffSection from '../components/TariffSection/TariffSection';
import Notification from '../components/Notification/Notification';

const HistoricalData: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'cbp' | 'china-post' | 'tariff'>('overview');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [processResult, setProcessResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
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
  }, [historicalData]);

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
      const response = await apiService.getHistoricalData(startDate, endDate);
      
      // Format data for consistency with ingestion format
      const formattedData = response.data.map(item => {
        const declaredValue = parseFloat(item.declared_value_usd || item.total_charges || 0);
        const tariffRate = parseFloat(item.tariff_rate || 50); // Default tariff rate if not provided
        const tariffAmount = (declaredValue * tariffRate) / 100;
        
        return {
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
          'Declared Value (USD)': declaredValue,
          // Tariff-specific fields for TariffSection component
          declared_value_usd: declaredValue.toString(),
          departure_station: item.departure_station,
          destination: item.destination,
          tariff_rate: tariffRate,
          tariff_amount: tariffAmount
        };
      });

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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Search },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'cbp', name: 'CBP Report', icon: Building },
    { id: 'china-post', name: 'China Post', icon: Plane },
    { id: 'tariff', name: 'Tariff Analysis', icon: Filter },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Historical Data Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Analyze and track all shipment data over time
        </p>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AWB Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flight Date
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record['*运单号 (AWB Number)']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record['航班日期 (Flight Date)']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record['*目的站（Destination）']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record['*重量 (Weight)']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${record['*总运费 (Total Charges)'].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
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
          {activeTab === 'tariff' && (
            <TariffSection
              data={historicalData}
              title="Historical Tariff Analysis"
              showDetails={true}
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

      {/* Quick Actions - Only visible when data is available and not on CBP or China Post tabs */}
      {historicalData.length > 0 && activeTab !== 'cbp' && activeTab !== 'china-post' && (
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <button 
            onClick={handleGenerateChinaPost}
            className="btn-primary px-4 py-3 rounded-full shadow-lg flex items-center space-x-2"
          >
            <Plane className="h-4 w-4" />
            <span>China Post</span>
          </button>
          <button 
            onClick={handleGenerateCBP}
            className="btn-primary px-4 py-3 rounded-full shadow-lg flex items-center space-x-2"
          >
            <Building className="h-4 w-4" />
            <span>CBP Report</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoricalData;
