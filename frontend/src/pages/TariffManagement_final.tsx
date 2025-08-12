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
  Calculator,
  Plus
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatDisplayValue } from '../utils/displayHelpers';

interface TariffRoute {
  origin: string;
  destination: string;
  route: string;
  shipment_count: number;
  total_declared_value: number;
  total_tariff_amount: number;
  historical_rate: number;
  start_date?: string;
  end_date?: string;
  configured_rate?: TariffRateConfig;
  has_configured_rate: boolean;
}

interface TariffRateConfig {
  id: number;
  origin_country: string;
  destination_country: string;
  goods_category: string;
  postal_service: string;
  start_date: string;
  end_date: string;
  min_weight: number;
  max_weight: number;
  tariff_rate: number;
  category_surcharge: number;
  minimum_tariff: number;
  maximum_tariff?: number;
  currency: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CategoryConfig {
  category: string;
  surcharge: number;
  enabled: boolean;
}

interface BulkRateConfig {
  origin: string;
  destination: string;
  postal_service: string;
  start_date: string;
  end_date: string;
  min_weight: number;
  max_weight: number;
  minimum_tariff: number;
  maximum_tariff: number;
  notes: string;
  category_configs: CategoryConfig[];
}

interface TariffCalculation {
  origin_country: string;
  destination_country: string;
  goods_category?: string;
  postal_service?: string;
  ship_date?: string;
  declared_value: number;
  weight?: number;
  base_rate?: number;
  surcharge_rate?: number;
  combined_rate?: number;
  minimum_tariff?: number;
  maximum_tariff?: number;
  calculated_tariff: number;
  currency?: string;
  calculation_method?: string;
  has_surcharge?: boolean;
  calculation_breakdown?: {
    base_percentage: number;
    surcharge_percentage: number;
    combined_percentage: number;
    base_amount: number;
    surcharge_amount: number;
    total_amount: number;
  };
  message?: string;
}

const TariffManagement: React.FC = () => {
  const [routes, setRoutes] = useState<TariffRoute[]>([]);
  const [configuredRates, setConfiguredRates] = useState<TariffRateConfig[]>([]);
  const [systemDefaults, setSystemDefaults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRateConfig, setBulkRateConfig] = useState<BulkRateConfig | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    origin: '',
    destination: '',
    declared_value: '',
    weight: '',
    goods_category: '*',
    postal_service: '*',
    ship_date: '',
  });
  const [calculationResult, setCalculationResult] = useState<TariffCalculation | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['*']);
  const [availableServices, setAvailableServices] = useState<string[]>(['*']);
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
      
      const [routesResponse, ratesResponse, defaultsResponse, categoriesResponse, servicesResponse] = await Promise.all([
        apiService.getTariffRoutes(),
        apiService.getTariffRates(),
        apiService.getTariffSystemDefaults(),
        apiService.getTariffCategories(),
        apiService.getTariffServices()
      ]);
      
      const baseRoutes = routesResponse.routes || [];
      const configuredRatesData = ratesResponse.tariff_rates || [];
      
      // Create a map of existing routes for quick lookup
      const existingRoutesMap = new Map();
      baseRoutes.forEach((route: TariffRoute) => {
        const key = `${route.origin}-${route.destination}`;
        existingRoutesMap.set(key, route);
      });
      
      // Add routes from configured rates that don't exist in shipment data
      const allRoutes = [...baseRoutes];
      configuredRatesData.forEach((rate: TariffRateConfig) => {
        const key = `${rate.origin_country}-${rate.destination_country}`;
        if (!existingRoutesMap.has(key)) {
          // Create a synthetic route for the configured rate
          const syntheticRoute: TariffRoute = {
            origin: rate.origin_country,
            destination: rate.destination_country,
            route: `${rate.origin_country} → ${rate.destination_country}`,
            shipment_count: 0,
            total_declared_value: 0,
            total_tariff_amount: 0,
            historical_rate: 0.8, // Default fallback rate
            configured_rate: rate,
            has_configured_rate: true
          };
          allRoutes.push(syntheticRoute);
          existingRoutesMap.set(key, syntheticRoute);
        }
      });
      
      setRoutes(allRoutes);
      setConfiguredRates(configuredRatesData);
      setSystemDefaults(defaultsResponse);
      setAvailableCategories(categoriesResponse.categories || ['*']);
      setAvailableServices(servicesResponse.services || ['*']);
      
      showNotification(`Loaded ${allRoutes.length} routes (${baseRoutes.length} with shipments, ${allRoutes.length - baseRoutes.length} configured only) and ${ratesResponse.total_rates} configured rates`, 'success');
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
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize category configs for all non-All categories
    const categoryConfigs = availableCategories
      .filter(cat => cat !== '*')
      .map(category => ({
        category,
        surcharge: 0,
        enabled: false
      }));
    
    // Set up bulk rate config with existing data if available
    setBulkRateConfig({
      origin: route.origin,
      destination: route.destination,
      postal_service: existing?.postal_service || '*',
      start_date: existing?.start_date || today,
      end_date: existing?.end_date || '2099-12-31',
      min_weight: existing?.min_weight || 0,
      max_weight: existing?.max_weight || 999999,
      base_rate: existing?.tariff_rate || route.historical_rate || defaults?.default_tariff_rate || 0.8,
      minimum_tariff: existing?.minimum_tariff || defaults?.default_minimum_tariff || 0,
      maximum_tariff: existing?.maximum_tariff || defaults?.suggested_maximum_tariff || 100,
      notes: existing?.notes || '',
      category_configs: categoryConfigs
    });
    setShowBulkForm(true);
  };

  const handleAddBulkRate = () => {
    const defaults = systemDefaults?.system_defaults;
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize category configs for all non-All categories
    const categoryConfigs = availableCategories
      .filter(cat => cat !== '*')
      .map(category => ({
        category,
        surcharge: 0,
        enabled: false
      }));
    
    setBulkRateConfig({
      origin: '',
      destination: '',
      postal_service: '*',
      start_date: today,
      end_date: '2099-12-31',
      min_weight: 0,
      max_weight: 999999,
      base_rate: defaults?.default_tariff_rate || 0.8,
      minimum_tariff: defaults?.default_minimum_tariff || 0,
      maximum_tariff: defaults?.suggested_maximum_tariff || 100,
      notes: '',
      category_configs: categoryConfigs
    });
    setShowBulkForm(true);
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
        parseFloat(calculatorData.declared_value),
        parseFloat(calculatorData.weight) || undefined,
        calculatorData.goods_category !== '*' ? calculatorData.goods_category : undefined,
        calculatorData.postal_service !== '*' ? calculatorData.postal_service : undefined,
        calculatorData.ship_date || undefined
      );
      setCalculationResult(result);
      if (result.message) {
        showNotification(result.message, 'info');
      }
    } catch (error) {
      console.error('Error calculating tariff:', error);
      showNotification(`Error calculating tariff: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleBatchRecalculate = async () => {
    if (!window.confirm('This will recalculate tariffs for all processed shipments using current rate configurations. Continue?')) {
      return;
    }

    try {
      showNotification('Starting batch recalculation...', 'success');
      const result = await apiService.batchRecalculateTariffs();
      
      if (result.success) {
        showNotification(
          `${result.message}. Updated: ${result.updated_count}, Skipped: ${result.skipped_count}`, 
          'success'
        );
      } else {
        showNotification(`Batch recalculation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error during batch recalculation:', error);
      showNotification(`Batch recalculation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleSaveBulkRate = async () => {
    if (!bulkRateConfig) return;

    // Validation
    if (!bulkRateConfig.origin || !bulkRateConfig.destination) {
      showNotification('Please select both origin and destination countries', 'error');
      return;
    }

    const enabledCategories = bulkRateConfig.category_configs.filter(config => config.enabled);
    if (enabledCategories.length === 0) {
      showNotification('Please enable at least one category configuration', 'error');
      return;
    }

    try {
      const bulkData = {
        origin_country: bulkRateConfig.origin,
        destination_country: bulkRateConfig.destination,
        postal_service: bulkRateConfig.postal_service,
        start_date: bulkRateConfig.start_date,
        end_date: bulkRateConfig.end_date,
        min_weight: bulkRateConfig.min_weight,
        max_weight: bulkRateConfig.max_weight,
        base_rate: bulkRateConfig.base_rate,
        minimum_tariff: bulkRateConfig.minimum_tariff,
        maximum_tariff: bulkRateConfig.maximum_tariff > 0 ? bulkRateConfig.maximum_tariff : undefined,
        notes: bulkRateConfig.notes,
        category_configs: enabledCategories.map(config => ({
          category: config.category,
          surcharge: config.surcharge
        }))
      };

      const result = await apiService.createBulkTariffRates(bulkData);
      showNotification(
        `Created ${result.total_created} tariff rates for ${bulkRateConfig.origin} → ${bulkRateConfig.destination}`, 
        'success'
      );
      
      setBulkRateConfig(null);
      setShowBulkForm(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating bulk tariff rates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error creating bulk rates: ${errorMessage}`, 'error');
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
    <>
      {/* Notification */}
      {notification && (
        <div className={`fixed notification-position right-4 z-[9999] p-4 rounded-md shadow-lg flex items-center gap-3 ${
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

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="text-cathay-teal" />
            Tariff Rate Management
          </h1>
          <p className="text-gray-600 mt-2">
            Configure and manage tariff rates for different shipping routes and goods categories
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleAddBulkRate}
            className="bg-cathay-teal text-white px-4 py-2 rounded-md hover:bg-cathay-teal-dark flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Rate
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculator
          </button>
          <button
            onClick={handleBatchRecalculate}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Batch Recalculate
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
            />
          </div>
        </div>

        {/* Routes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Route
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Rate
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
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {route.route}
                          </div>
                          <div className="text-sm text-gray-500">
                            {route.origin} → {route.destination}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.shipment_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${route.total_declared_value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.start_date || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.end_date || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {route.has_configured_rate && route.configured_rate ? (
                        <div>
                          <span className="text-sm font-medium text-green-600">
                            {((route.configured_rate.tariff_rate + route.configured_rate.category_surcharge) * 100).toFixed(1)}%
                            {route.configured_rate.category_surcharge > 0 && (
                              <span className="text-xs text-blue-600 ml-1">
                                +{(route.configured_rate.category_surcharge * 100).toFixed(1)}%
                              </span>
                            )}
                          </span>
                          <div className="text-xs text-gray-500">
                            {route.configured_rate.category_surcharge > 0 && (
                              <div>
                                Base: {(route.configured_rate.tariff_rate * 100).toFixed(1)}% + 
                                Surcharge: {(route.configured_rate.category_surcharge * 100).toFixed(1)}% = 
                                Total: {((route.configured_rate.tariff_rate + route.configured_rate.category_surcharge) * 100).toFixed(1)}%
                              </div>
                            )}
                            Min: ${route.configured_rate.minimum_tariff}
                            {route.configured_rate.maximum_tariff && (
                              `, Max: $${route.configured_rate.maximum_tariff}`
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm text-orange-600 font-medium">Using Fallback</span>
                          <div className="text-xs text-gray-500">
                            {route.shipment_count > 0 
                              ? `System will use ${(route.historical_rate * 100).toFixed(1)}% rate`
                              : 'System will use 80% default rate'
                            }
                          </div>
                        </div>
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

        {/* Bulk Rate Configuration Modal */}
        {showBulkForm && bulkRateConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Rate Configuration
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Configure rates for {bulkRateConfig.origin || 'Origin'} → {bulkRateConfig.destination || 'Destination'}
              </p>
              
              <div className="space-y-6">
                {/* Base Configuration */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Base Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Origin Country
                      </label>
                      <select
                        value={bulkRateConfig.origin}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          origin: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      >
                        <option value="">Select Origin Country</option>
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destination Country
                      </label>
                      <select
                        value={bulkRateConfig.destination}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          destination: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      >
                        <option value="">Select Destination Country</option>
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Service
                      </label>
                      <select
                        value={bulkRateConfig.postal_service}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          postal_service: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      >
                        {availableServices.map(service => (
                          <option key={service} value={service}>
                            {service === '*' ? 'All Postal Services' : service}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={bulkRateConfig.start_date}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          start_date: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={bulkRateConfig.end_date}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          end_date: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight Range (g)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={bulkRateConfig.min_weight}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            min_weight: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={bulkRateConfig.max_weight}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            max_weight: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                          placeholder="Max"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={(bulkRateConfig.base_rate * 100).toFixed(2)}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          base_rate: (parseFloat(e.target.value) || 0) / 100
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Tariff ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkRateConfig.minimum_tariff}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          minimum_tariff: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Tariff ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkRateConfig.maximum_tariff}
                        onChange={(e) => setBulkRateConfig({
                          ...bulkRateConfig,
                          maximum_tariff: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={bulkRateConfig.notes}
                      onChange={(e) => setBulkRateConfig({
                        ...bulkRateConfig,
                        notes: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      rows={2}
                      placeholder="Optional notes about this rate configuration"
                    />
                  </div>
                </div>

                {/* Category Configuration */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Category Configuration</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Enabled
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Surcharge (%)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Combined Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Maximum Tariff
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bulkRateConfig.category_configs.map((config, index) => (
                          <tr key={config.category}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => {
                                  const newConfigs = [...bulkRateConfig.category_configs];
                                  newConfigs[index] = { ...config, enabled: e.target.checked };
                                  setBulkRateConfig({
                                    ...bulkRateConfig,
                                    category_configs: newConfigs
                                  });
                                }}
                                className="h-4 w-4 text-cathay-teal border-gray-300 rounded focus:ring-cathay-teal"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {config.category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={(config.surcharge * 100).toFixed(2)}
                                onChange={(e) => {
                                  const newConfigs = [...bulkRateConfig.category_configs];
                                  newConfigs[index] = { 
                                    ...config, 
                                    surcharge: (parseFloat(e.target.value) || 0) / 100 
                                  };
                                  setBulkRateConfig({
                                    ...bulkRateConfig,
                                    category_configs: newConfigs
                                  });
                                }}
                                disabled={!config.enabled}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cathay-teal disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {config.enabled ? (
                                <span className="font-medium">
                                  {((bulkRateConfig.base_rate + config.surcharge) * 100).toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {config.enabled && bulkRateConfig.maximum_tariff > 0 ? (
                                <span className="text-green-600">
                                  ${bulkRateConfig.maximum_tariff}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setBulkRateConfig(null);
                    setShowBulkForm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBulkRate}
                  className="px-4 py-2 text-sm font-medium text-white bg-cathay-teal hover:bg-cathay-teal-dark rounded-md"
                >
                  <Save className="h-4 w-4 inline mr-2" />
                  Create Rates
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tariff Calculator Modal */}
        {showCalculator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tariff Calculator
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Origin Country
                    </label>
                    <select
                      value={calculatorData.origin}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        origin: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    >
                      <option value="">Select Origin Country</option>
                      {uniqueStations.map(station => (
                        <option key={station} value={station}>{station}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destination Country
                    </label>
                    <select
                      value={calculatorData.destination}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        destination: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    >
                      <option value="">Select Destination Country</option>
                      {uniqueStations.map(station => (
                        <option key={station} value={station}>{station}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Declared Value ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={calculatorData.declared_value}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        declared_value: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      placeholder="Enter declared value"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (g) - Optional
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={calculatorData.weight}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        weight: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                      placeholder="Enter weight"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goods Category
                    </label>
                    <select
                      value={calculatorData.goods_category}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        goods_category: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    >
                      {availableCategories.map(category => (
                        <option key={category} value={category}>
                          {category === '*' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Service
                    </label>
                    <select
                      value={calculatorData.postal_service}
                      onChange={(e) => setCalculatorData({
                        ...calculatorData,
                        postal_service: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    >
                      {availableServices.map(service => (
                        <option key={service} value={service}>
                          {service === '*' ? 'All Postal Services' : service}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ship Date - Optional
                  </label>
                  <input
                    type="date"
                    value={calculatorData.ship_date}
                    onChange={(e) => setCalculatorData({
                      ...calculatorData,
                      ship_date: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleCalculateTariff}
                  className="w-full bg-cathay-teal text-white py-2 px-4 rounded-md hover:bg-cathay-teal-dark"
                >
                  Calculate Tariff
                </button>

                {calculationResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Calculation Result</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Declared Value:</span>
                        <span className="font-medium">${calculationResult.declared_value.toFixed(2)}</span>
                      </div>
                      {calculationResult.base_rate && (
                        <div className="flex justify-between">
                          <span>Base Rate:</span>
                          <span className="font-medium">{(calculationResult.base_rate * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {calculationResult.surcharge_rate && calculationResult.surcharge_rate > 0 && (
                        <div className="flex justify-between">
                          <span>Surcharge Rate:</span>
                          <span className="font-medium">{(calculationResult.surcharge_rate * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {calculationResult.combined_rate && (
                        <div className="flex justify-between">
                          <span>Combined Rate:</span>
                          <span className="font-medium">{(calculationResult.combined_rate * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {calculationResult.minimum_tariff && (
                        <div className="flex justify-between">
                          <span>Minimum Tariff:</span>
                          <span className="font-medium">${calculationResult.minimum_tariff.toFixed(2)}</span>
                        </div>
                      )}
                      {calculationResult.maximum_tariff && (
                        <div className="flex justify-between">
                          <span>Maximum Tariff:</span>
                          <span className="font-medium">${calculationResult.maximum_tariff.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Calculated Tariff:</span>
                        <span className="font-bold text-lg text-cathay-teal">
                          ${calculationResult.calculated_tariff.toFixed(2)}
                        </span>
                      </div>
                      {calculationResult.calculation_method && (
                        <div className="text-xs text-gray-500 mt-2">
                          Method: {calculationResult.calculation_method}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCalculator(false);
                    setCalculationResult(null);
                    setCalculatorData({
                      origin: '',
                      destination: '',
                      declared_value: '',
                      weight: '',
                      goods_category: '*',
                      postal_service: '*',
                      ship_date: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TariffManagement;
