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
  base_rate: number;
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
        category_rates: enabledCategories.map(config => ({
          category: config.category,
          rate: config.surcharge
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
      {/* Notification - positioned outside main content flow */}
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

      <div className="space-y-6">
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddBulkRate}
              className="inline-flex items-center px-4 py-2 border border-green-500 text-green-700 bg-green-50 rounded-md text-sm font-medium hover:bg-green-100"
              title="Configure base rate + surcharges for multiple goods categories at once"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </button>
          </div>
          <button
            onClick={handleBatchRecalculate}
            className="inline-flex items-center px-4 py-2 border border-orange-300 text-orange-700 bg-orange-50 rounded-md text-sm font-medium hover:bg-orange-100"
            title="Recalculate tariffs for all processed shipments using current rate configurations. Useful after updating rate rules."
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Recalculate All Tariffs
          </button>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
              showCalculator
                ? 'border-cathay-teal text-cathay-teal bg-teal-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
            title="Calculate tariffs for specific shipments using configured rates or system defaults"
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Goods Category</label>
              <select
                value={calculatorData.goods_category}
                onChange={(e) => setCalculatorData({...calculatorData, goods_category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              >
                {availableCategories.map(category => (
                  <option key={category} value={category}>
                    {formatDisplayValue(category)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Service</label>
              <select
                value={calculatorData.postal_service}
                onChange={(e) => setCalculatorData({...calculatorData, postal_service: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              >
                {availableServices.map(service => (
                  <option key={service} value={service}>
                    {formatDisplayValue(service)}
                  </option>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) - optional</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={calculatorData.weight}
                onChange={(e) => setCalculatorData({...calculatorData, weight: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                placeholder="0.00"
                title="Package weight for weight-based rate filtering. Leave empty to calculate without weight restrictions."
              />
            </div>
            
            <button
              onClick={handleCalculateTariff}
              className="btn-primary px-4 py-2 h-10"
            >
              Calculate
            </button>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ship Date (optional)</label>
            <input
              type="date"
              value={calculatorData.ship_date}
              onChange={(e) => setCalculatorData({...calculatorData, ship_date: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
            />
          </div>
          
          {calculationResult && (
            <div className={`mt-4 p-4 border rounded-md ${
              calculationResult.calculation_method === 'configured' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                calculationResult.calculation_method === 'configured' 
                  ? 'text-green-800' 
                  : 'text-yellow-800'
              }`}>
                Calculation Result ({calculationResult.calculation_method === 'configured' ? 'Configured Rate' : 'Fallback Rate'})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Route:</span>
                  <p className="font-medium">{calculationResult.origin_country} → {calculationResult.destination_country}</p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Category:</span>
                  <p className="font-medium">{formatDisplayValue(calculationResult.goods_category)}</p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Service:</span>
                  <p className="font-medium">{formatDisplayValue(calculationResult.postal_service)}</p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Rate Breakdown:</span>
                  <p className="font-medium">
                    {calculationResult.calculation_breakdown ? (
                      <div>
                        <div>Base: {calculationResult.calculation_breakdown.base_percentage.toFixed(1)}%</div>
                        {calculationResult.calculation_breakdown.surcharge_percentage > 0 && (
                          <div className="text-amber-600">
                            Surcharge: +{calculationResult.calculation_breakdown.surcharge_percentage.toFixed(1)}%
                          </div>
                        )}
                        <div className="font-semibold">
                          Total: {calculationResult.calculation_breakdown.combined_percentage.toFixed(1)}%
                        </div>
                      </div>
                    ) : calculationResult.base_rate ? (
                      `${(calculationResult.base_rate * 100).toFixed(1)}%`
                    ) : (
                      '80% (system fallback - no configured rate found)'
                    )}
                  </p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Weight:</span>
                  <p className="font-medium">{calculationResult.weight ? `${calculationResult.weight} kg` : 'Not specified'}</p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Declared Value:</span>
                  <p className="font-medium">${calculationResult.declared_value.toFixed(2)}</p>
                </div>
                <div>
                  <span className={calculationResult.calculation_method === 'configured' ? 'text-green-600' : 'text-yellow-600'}>Tariff Amount:</span>
                  <p className="font-medium text-lg">${calculationResult.calculated_tariff.toFixed(2)}</p>
                  {calculationResult.calculation_breakdown && calculationResult.calculation_breakdown.surcharge_percentage > 0 && (
                    <div className="text-xs mt-1">
                      <div>Base: ${calculationResult.calculation_breakdown.base_amount.toFixed(2)}</div>
                      <div className="text-amber-600">Surcharge: +${calculationResult.calculation_breakdown.surcharge_amount.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
              {calculationResult.calculation_method === 'fallback' && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                  <strong>Using Fallback Rate:</strong> No base tariff rate found for this route/service combination. 
                  The system is using the default fallback rate. Configure a base rate (and optional category surcharges) above for more accurate calculations.
                </div>
              )}
              {calculationResult.has_surcharge && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  <strong>Surcharge Applied:</strong> This calculation includes a category-specific surcharge for {calculationResult.goods_category} goods.
                </div>
              )}
              {calculationResult.message && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {calculationResult.message}
                </div>
              )}
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
                        {route.shipment_count > 0 
                          ? `$${route.total_declared_value.toLocaleString()} declared value`
                          : 'No shipment data - configured rate only'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {route.shipment_count > 0 ? route.shipment_count.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {route.shipment_count > 0 
                          ? `${(route.historical_rate * 100).toFixed(1)}%`
                          : 'No data'
                        }
                      </span>
                      <div className="text-xs text-gray-500">
                        {route.shipment_count > 0 
                          ? `Based on ${route.shipment_count} shipment${route.shipment_count !== 1 ? 's' : ''}`
                          : 'No shipment history'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {route.configured_rate ? (
                      <div>
                        <span className="text-sm font-medium text-cathay-teal">
                          {(route.configured_rate.tariff_rate * 100).toFixed(1)}%
                          {route.configured_rate.category_surcharge > 0 && (
                            <span className="text-amber-600 ml-1">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bulk Configure Category Rates
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Configure a base rate and category-specific surcharges for multiple goods categories at once.
            </p>
            
            <div className="space-y-6">
              {/* Route Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Route Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Origin Country *
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
                      Destination Country *
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                          {formatDisplayValue(service)}
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
                </div>
              </div>
              
              {/* Base Rate Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Base Rate Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Tariff Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={bulkRateConfig.base_rate}
                      onChange={(e) => setBulkRateConfig({
                        ...bulkRateConfig,
                        base_rate: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Base rate as decimal (e.g., 0.5 for 50%)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkRateConfig.min_weight}
                      onChange={(e) => setBulkRateConfig({
                        ...bulkRateConfig,
                        min_weight: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkRateConfig.max_weight}
                      onChange={(e) => setBulkRateConfig({
                        ...bulkRateConfig,
                        max_weight: parseFloat(e.target.value) || 999999
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
                      step="0.01"
                      min="0"
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
                      step="0.01"
                      min="0"
                      value={bulkRateConfig.maximum_tariff}
                      onChange={(e) => setBulkRateConfig({
                        ...bulkRateConfig,
                        maximum_tariff: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional maximum cap
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Category Surcharges Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Category Surcharges</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Enable and configure surcharges for specific goods categories. Each enabled category will create a separate tariff rate.
                </p>
                <div className="space-y-3">
                  {bulkRateConfig.category_configs.map((config, index) => (
                    <div key={config.category} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${index}`}
                          checked={config.enabled}
                          onChange={(e) => {
                            const updated = [...bulkRateConfig.category_configs];
                            updated[index].enabled = e.target.checked;
                            setBulkRateConfig({
                              ...bulkRateConfig,
                              category_configs: updated
                            });
                          }}
                          className="h-4 w-4 text-cathay-teal focus:ring-cathay-teal border-gray-300 rounded"
                        />
                        <label htmlFor={`category-${index}`} className="ml-2 text-sm font-medium text-gray-700 w-32">
                          {config.category}
                        </label>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Surcharge:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={config.surcharge}
                            onChange={(e) => {
                              const updated = [...bulkRateConfig.category_configs];
                              updated[index].surcharge = parseFloat(e.target.value) || 0;
                              setBulkRateConfig({
                                ...bulkRateConfig,
                                category_configs: updated
                              });
                            }}
                            disabled={!config.enabled}
                            className={`w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent ${
                              !config.enabled ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            placeholder="0.00"
                          />
                          <span className="text-sm text-gray-500">
                            (+{(config.surcharge * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Total: {((bulkRateConfig.base_rate + config.surcharge) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-2 mt-0.5">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-800">
                      <strong>How it works:</strong> This will create a base rate (goods_category = '*') plus individual surcharge rates for each enabled category.
                      When calculating tariffs, the system will use the base rate + category surcharge for matching categories.
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={bulkRateConfig.notes}
                  onChange={(e) => setBulkRateConfig({
                    ...bulkRateConfig,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                  placeholder="Optional notes about these tariff rates..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setBulkRateConfig(null);
                  setShowBulkForm(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBulkRate}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Bulk Rates
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
