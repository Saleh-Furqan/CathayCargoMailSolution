import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Globe, TrendingUp, BarChart3 } from 'lucide-react';
import { apiService } from '../services/api';

interface TariffData {
  route: string;
  origin: string;
  destination: string;
  total_shipments: number;
  total_declared_value: number;
  total_tariff_amount: number;
  average_tariff_rate: number;
}

interface TariffSummary {
  total_shipments: number;
  total_declared_value: number;
  total_tariff_amount: number;
  average_tariff_rate: number;
  unique_routes: number;
}

const TariffManagement: React.FC = () => {
  const [tariffData, setTariffData] = useState<TariffData[]>([]);
  const [tariffSummary, setTariffSummary] = useState<TariffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    // Set default date range (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    setStartDate(defaultStartDate.toISOString().split('T')[0]);
    setEndDate(defaultEndDate.toISOString().split('T')[0]);
    
    fetchTariffData();
  }, []);

  const fetchTariffData = async () => {
    try {
      setLoading(true);
      
      // Get historical data to analyze tariff information
      const response = await apiService.getHistoricalData(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate || new Date().toISOString().split('T')[0]
      );

      // Process the data to create tariff analysis
      const processedTariffData = processTariffData(response.data);
      setTariffData(processedTariffData);
      
      // Calculate summary statistics
      const summary = calculateTariffSummary(response.data);
      setTariffSummary(summary);

      if (response.data.length > 0) {
        showNotification(`Loaded tariff data for ${response.data.length} shipments`, 'success');
      } else {
        showNotification('No tariff data found for the selected date range', 'info');
      }
    } catch (error) {
      console.error('Error fetching tariff data:', error);
      showNotification('Error loading tariff data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processTariffData = (shipments: any[]): TariffData[] => {
    // Group shipments by route and calculate tariff statistics
    const routeMap = new Map<string, {
      origin: string;
      destination: string;
      shipments: any[];
      totalDeclaredValue: number;
      totalTariffAmount: number;
    }>();

    shipments.forEach(shipment => {
      const origin = shipment.host_origin_station || shipment.departure_station || 'Unknown';
      const destination = shipment.host_destination_station || shipment.destination || 'Unknown';
      const route = `${origin} → ${destination}`;
      
      const declaredValue = parseFloat(shipment.declared_value || shipment.declared_value_usd || shipment.total_charges || '0');
      const tariffAmount = parseFloat(shipment.tariff_amount || shipment.total_charges || '0');

      if (!routeMap.has(route)) {
        routeMap.set(route, {
          origin,
          destination,
          shipments: [],
          totalDeclaredValue: 0,
          totalTariffAmount: 0
        });
      }

      const routeData = routeMap.get(route)!;
      routeData.shipments.push(shipment);
      routeData.totalDeclaredValue += declaredValue;
      routeData.totalTariffAmount += tariffAmount;
    });

    // Convert to array and calculate rates
    return Array.from(routeMap.entries()).map(([route, data]) => ({
      route,
      origin: data.origin,
      destination: data.destination,
      total_shipments: data.shipments.length,
      total_declared_value: Math.round(data.totalDeclaredValue * 100) / 100,
      total_tariff_amount: Math.round(data.totalTariffAmount * 100) / 100,
      average_tariff_rate: data.totalDeclaredValue > 0 
        ? Math.round((data.totalTariffAmount / data.totalDeclaredValue) * 100 * 100) / 100
        : 0
    }));
  };

  const calculateTariffSummary = (shipments: any[]): TariffSummary => {
    const totalDeclaredValue = shipments.reduce((sum, shipment) => {
      return sum + parseFloat(shipment.declared_value || shipment.declared_value_usd || shipment.total_charges || '0');
    }, 0);

    const totalTariffAmount = shipments.reduce((sum, shipment) => {
      return sum + parseFloat(shipment.tariff_amount || shipment.total_charges || '0');
    }, 0);

    const uniqueRoutes = new Set(shipments.map(shipment => {
      const origin = shipment.host_origin_station || shipment.departure_station || 'Unknown';
      const destination = shipment.host_destination_station || shipment.destination || 'Unknown';
      return `${origin} → ${destination}`;
    })).size;

    return {
      total_shipments: shipments.length,
      total_declared_value: Math.round(totalDeclaredValue * 100) / 100,
      total_tariff_amount: Math.round(totalTariffAmount * 100) / 100,
      average_tariff_rate: totalDeclaredValue > 0 
        ? Math.round((totalTariffAmount / totalDeclaredValue) * 100 * 100) / 100
        : 0,
      unique_routes: uniqueRoutes
    };
  };

  const filteredTariffData = tariffData.filter(data => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return data.route.toLowerCase().includes(search) ||
             data.origin.toLowerCase().includes(search) ||
             data.destination.toLowerCase().includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tariff Analysis Dashboard</h1>
          </div>
          <p className="text-gray-600">Analyze tariff calculations and revenue impact from processed shipment data</p>
        </div>
        {tariffSummary && (
          <div className="text-sm text-gray-500">
            <p>Analysis Period: {startDate} to {endDate}</p>
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
              onClick={fetchTariffData}
              disabled={loading}
              className="btn-primary w-full h-10 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <TrendingUp className="h-5 w-5" />
              )}
              <span>{loading ? 'Loading...' : 'Update Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {tariffSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shipments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tariffSummary.total_shipments.toLocaleString()}
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Declared Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${tariffSummary.total_declared_value.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tariff Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${tariffSummary.total_tariff_amount.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Routes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tariffSummary.unique_routes}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg Rate: {tariffSummary.average_tariff_rate}%
                </p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tariff Analysis Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Tariff Analysis by Route</h2>
            
            {/* Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search routes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48"
                />
              </div>
              
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredTariffData.length} routes with tariff data
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Shipments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Declared Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tariff Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTariffData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {data.route}
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.origin} → {data.destination}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {data.total_shipments.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      ${data.total_declared_value.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600">
                      ${data.total_tariff_amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      data.average_tariff_rate >= 75 ? 'bg-red-100 text-red-800' :
                      data.average_tariff_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {data.average_tariff_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTariffData.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tariff data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                {tariffData.length === 0 
                  ? 'No shipment data found for the selected date range.' 
                  : 'No routes match your search criteria.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TariffManagement;
