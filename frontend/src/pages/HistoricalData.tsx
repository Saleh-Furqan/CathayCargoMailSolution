import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader, 
  Building,
  Plane,
  BarChart3,
  Filter,
  DollarSign,
  Scale,
  Package
} from 'lucide-react';
import { apiService } from '../services/api';
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
  const [processResult, setProcessResult] = useState<any>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

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
      setHistoricalData(response.data);
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Search },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'cbp', name: 'CBP Report', icon: Building },
    { id: 'china-post', name: 'China Post', icon: Plane },
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
                    {historicalData.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.awb_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.flight_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.destination}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.weight}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${parseFloat(record.total_charges || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && (
            <Dashboard 
              data={historicalData} 
              processResult={processResult} 
            />
          )}
          {activeTab === 'cbp' && (
            <CBPSection
              data={historicalData}
              isAvailable={processResult?.results.cbp.available || false}
              onDownload={() => {}}
            />
          )}
          {activeTab === 'china-post' && (
            <ChinaPostSection
              data={historicalData}
              isAvailable={processResult?.results.china_post.available || false}
              onDownload={() => {}}
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
