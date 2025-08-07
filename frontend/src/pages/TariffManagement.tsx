import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  TrendingUp, 
  Edit3, 
  Save, 
  X, 
  Search,
  AlertTriangle,
  CheckCircle,
  Calculator
} from 'lucide-react';
import { apiService } from '../services/api';

interface TariffRoute {
  origin: string;
  destination: string;
  route: string;
  shipment_count: number;
  total_declared_value: number;
  total_tariff_amount: number;
  historical_rate: number;
  configured_rate?: TariffRateConfig;
  has_configured_rate: boolean;
}

interface TariffRateConfig {
  id: number;
  origin_country: string;
  destination_country: string;
  tariff_rate: number;
  minimum_tariff: number;
  maximum_tariff?: number;
  currency: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface EditingRate {
  origin: string;
  destination: string;
  tariff_rate: number;
  minimum_tariff: number;
  maximum_tariff: number;
  notes: string;
}

interface TariffCalculation {
  origin_country: string;
  destination_country: string;
  declared_value: number;
  tariff_rate: number;
  minimum_tariff: number;
  maximum_tariff?: number;
  calculated_tariff: number;
  currency: string;
}

const TariffManagement: React.FC = () => {
  const [routes, setRoutes] = useState<TariffRoute[]>([]);
  const [configuredRates, setConfiguredRates] = useState<TariffRateConfig[]>([]);
  const [systemDefaults, setSystemDefaults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRate, setEditingRate] = useState<EditingRate | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    origin: '',
    destination: '',
    declared_value: '',
  });
  const [calculationResult, setCalculationResult] = useState<TariffCalculation | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [routesResponse, ratesResponse, defaultsResponse] = await Promise.all([
        apiService.getTariffRoutes(),
        apiService.getTariffRates(),
        apiService.getTariffSystemDefaults()
      ]);
      
      setRoutes(routesResponse.routes || []);
      setConfiguredRates(ratesResponse.tariff_rates || []);
      setSystemDefaults(defaultsResponse);
      
      showNotification(`Loaded ${routesResponse.total_routes} routes and ${ratesResponse.total_rates} configured rates`, 'success');
    } catch (error) {
      console.error('Error fetching tariff data:', error);
      showNotification('Error loading tariff data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRate = (route: TariffRoute) => {
    const existing = route.configured_rate;
    const defaults = systemDefaults?.system_defaults;
    
    setEditingRate({
      origin: route.origin,
      destination: route.destination,
      tariff_rate: existing?.tariff_rate || route.historical_rate || defaults?.default_tariff_rate || 0,
      minimum_tariff: existing?.minimum_tariff || defaults?.default_minimum_tariff || 0,
      maximum_tariff: existing?.maximum_tariff || defaults?.suggested_maximum_tariff || 100,
      notes: existing?.notes || ''
    });
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;

    try {
      const rateData = {
        origin_country: editingRate.origin,
        destination_country: editingRate.destination,
        tariff_rate: editingRate.tariff_rate,
        minimum_tariff: editingRate.minimum_tariff,
        maximum_tariff: editingRate.maximum_tariff > 0 ? editingRate.maximum_tariff : undefined,
        notes: editingRate.notes
      };

      await apiService.createTariffRate(rateData);
      showNotification(`Tariff rate saved for ${editingRate.origin} → ${editingRate.destination}`, 'success');
      
      setEditingRate(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving tariff rate:', error);
      showNotification(`Error saving tariff rate: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDeactivateRate = async (rateId: number, route: string) => {
    if (!window.confirm(`Are you sure you want to deactivate the tariff rate for ${route}?`)) {
      return;
    }

    try {
      await apiService.deleteTariffRate(rateId);
      showNotification(`Tariff rate deactivated for ${route}`, 'success');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deactivating tariff rate:', error);
      showNotification(`Error deactivating tariff rate: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleCalculateTariff = async () => {
    if (!calculatorData.origin || !calculatorData.destination || !calculatorData.declared_value) {
      showNotification('Please fill in all calculator fields', 'error');
      return;
    }

    try {
      const result = await apiService.calculateTariff(
        calculatorData.origin,
        calculatorData.destination,
        parseFloat(calculatorData.declared_value)
      );
      setCalculationResult(result);
    } catch (error) {
      console.error('Error calculating tariff:', error);
      showNotification(`Error calculating tariff: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const filteredRoutes = routes.filter(route => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return route.route.toLowerCase().includes(search) ||
             route.origin.toLowerCase().includes(search) ||
             route.destination.toLowerCase().includes(search);
    }
    return true;
  });

  const uniqueStations = React.useMemo(() => {
    const stations = new Set<string>();
    routes.forEach(route => {
      stations.add(route.origin);
      stations.add(route.destination);
    });
    return Array.from(stations).sort();
  }, [routes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cathay-teal"></div>
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
            <Settings className="h-8 w-8 text-cathay-teal" />
            <h1 className="text-3xl font-bold text-gray-900">Tariff Rate Management</h1>
          </div>
          <p className="text-gray-600">Configure tariff rates between countries and stations</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
              showCalculator
                ? 'border-cathay-teal text-cathay-teal bg-teal-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Tariff Calculator
          </button>
        </div>
      </div>

      {/* System Stats Banner */}
      {systemDefaults && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">System Analytics</h3>
              <p className="text-xs text-blue-600">
                Based on {systemDefaults.system_stats.total_shipments} processed shipments • 
                Average Rate: {(systemDefaults.system_stats.average_rate * 100).toFixed(1)}% • 
                Total Value: ${systemDefaults.system_stats.total_declared_value.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Routes</p>
              <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
            </div>
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Configured Rates</p>
              <p className="text-2xl font-bold text-gray-900">{configuredRates.length}</p>
            </div>
            <Settings className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unconfigured Routes</p>
              <p className="text-2xl font-bold text-gray-900">
                {routes.filter(r => !r.has_configured_rate).length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Stations</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueStations.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tariff Calculator */}
      {showCalculator && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tariff Calculator</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
              <select
                value={calculatorData.origin}
                onChange={(e) => setCalculatorData({...calculatorData, origin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              >
                <option value="">Select Origin</option>
                {uniqueStations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <select
                value={calculatorData.destination}
                onChange={(e) => setCalculatorData({...calculatorData, destination: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              >
                <option value="">Select Destination</option>
                {uniqueStations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declared Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={calculatorData.declared_value}
                onChange={(e) => setCalculatorData({...calculatorData, declared_value: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            
            <button
              onClick={handleCalculateTariff}
              className="btn-primary px-4 py-2 h-10"
            >
              Calculate
            </button>
          </div>
          
          {calculationResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Calculation Result</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Route:</span>
                  <p className="font-medium">{calculationResult.origin_country} → {calculationResult.destination_country}</p>
                </div>
                <div>
                  <span className="text-green-600">Rate:</span>
                  <p className="font-medium">{(calculationResult.tariff_rate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-green-600">Declared Value:</span>
                  <p className="font-medium">${calculationResult.declared_value.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-green-600">Tariff Amount:</span>
                  <p className="font-medium text-lg">${calculationResult.calculated_tariff.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Routes Table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Routes & Tariff Rates</h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent w-full sm:w-64"
              />
            </div>
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
                  Shipments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Historical Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configured Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoutes.map((route, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{route.route}</div>
                      <div className="text-xs text-gray-500">
                        ${route.total_declared_value.toLocaleString()} declared value
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {route.shipment_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {(route.historical_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {route.configured_rate ? (
                      <div>
                        <span className="text-sm font-medium text-cathay-teal">
                          {(route.configured_rate.tariff_rate * 100).toFixed(1)}%
                        </span>
                        <div className="text-xs text-gray-500">
                          Min: ${route.configured_rate.minimum_tariff}
                          {route.configured_rate.maximum_tariff && (
                            `, Max: $${route.configured_rate.maximum_tariff}`
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not configured</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {route.has_configured_rate ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Needs Setup
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditRate(route)}
                      className="text-cathay-teal hover:text-cathay-teal-dark"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {route.configured_rate && (
                      <button
                        onClick={() => handleDeactivateRate(route.configured_rate!.id, route.route)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configure Tariff Rate
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {editingRate.origin} → {editingRate.destination}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tariff Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={editingRate.tariff_rate}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    tariff_rate: parseFloat(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter as decimal (e.g., 0.8 for 80%)
                  {systemDefaults && (
                    <span className="block">
                      System default: {systemDefaults.system_defaults.default_tariff_rate} 
                      ({(systemDefaults.system_defaults.default_tariff_rate * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Tariff ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingRate.minimum_tariff}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    minimum_tariff: parseFloat(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Tariff ($) - Optional
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingRate.maximum_tariff}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    maximum_tariff: parseFloat(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingRate.notes}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                  placeholder="Optional notes about this tariff rate..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingRate(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRate}
                className="px-4 py-2 bg-cathay-teal text-white rounded-md text-sm font-medium hover:bg-cathay-teal-dark flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TariffManagement;