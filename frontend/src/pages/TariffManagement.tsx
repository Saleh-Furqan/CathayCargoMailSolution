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
  rate: number;
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
  tariff_rate?: number;
  minimum_tariff?: number;
  maximum_tariff?: number;
  calculated_tariff: number;
  currency?: string;
  calculation_method?: string;
  has_category_specific_rate?: boolean;
  rate_details?: any;
  message?: string;
}

const TariffManagement: React.FC = () => {
  const [routes, setRoutes] = useState<TariffRoute[]>([]);
  const [, setConfiguredRates] = useState<TariffRateConfig[]>([]);
  const [systemDefaults, setSystemDefaults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [showPresetFilters, setShowPresetFilters] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRateConfig, setBulkRateConfig] = useState<BulkRateConfig | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [originalPeriodConfig, setOriginalPeriodConfig] = useState<{start_date: string, end_date: string} | null>(null);
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
  const [showRateDetails, setShowRateDetails] = useState<{
    route: TariffRoute;
    categoryRates: { category: string; rate: number; }[];
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleShowRateDetails = async (route: TariffRoute) => {
    if (!route.has_configured_rate || !route.configured_rate) {
      showNotification('No configured rates for this route', 'info');
      return;
    }

    try {
      // Fetch all rates for this specific route and time period
      const allRatesResponse = await apiService.getTariffRates();
      const allRates = allRatesResponse.tariff_rates || [];
      
      // Filter rates for this specific route and time period
      const routeRates = allRates.filter((rate: TariffRateConfig) => 
        rate.origin_country === route.origin && 
        rate.destination_country === route.destination &&
        rate.start_date === route.configured_rate?.start_date &&
        rate.end_date === route.configured_rate?.end_date
      );

      const categoryRates = routeRates.map((rate: TariffRateConfig) => ({
        category: rate.goods_category,
        rate: rate.tariff_rate
      }));

      setShowRateDetails({
        route,
        categoryRates
      });
    } catch (error) {
      console.error('Error fetching rate details:', error);
      showNotification('Error loading rate details', 'error');
    }
  };

  const checkForDateConflicts = (origin: string, destination: string, startDate: string, endDate: string, excludeCurrentPeriod: boolean = false) => {
    const conflictingRoutes = routes.filter(route => {
      // Skip if this is the same route we're currently editing (use original dates for comparison)
      if (excludeCurrentPeriod && 
          originalPeriodConfig &&
          route.origin === origin && 
          route.destination === destination &&
          route.start_date === originalPeriodConfig.start_date &&
          route.end_date === originalPeriodConfig.end_date) {
        return false;
      }
      
      return route.origin === origin && 
             route.destination === destination &&
             route.start_date && 
             route.end_date &&
             ((startDate <= route.end_date && endDate >= route.start_date));
    });
    
    return conflictingRoutes;
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
        let existingRoute = existingRoutesMap.get(key);
        
        if (!existingRoute) {
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
            has_configured_rate: true,
            start_date: rate.start_date,
            end_date: rate.end_date
          };
          allRoutes.push(syntheticRoute);
          existingRoutesMap.set(key, syntheticRoute);
        } else {
          // If route exists but this is a different date range, create a separate entry
          const isDifferentDateRange = existingRoute.start_date !== rate.start_date || 
                                      existingRoute.end_date !== rate.end_date;
          
          if (isDifferentDateRange) {
            const additionalRoute: TariffRoute = {
              origin: rate.origin_country,
              destination: rate.destination_country,
              route: `${rate.origin_country} → ${rate.destination_country}`,
              shipment_count: 0,
              total_declared_value: 0,
              total_tariff_amount: 0,
              historical_rate: existingRoute.historical_rate,
              configured_rate: rate,
              has_configured_rate: true,
              start_date: rate.start_date,
              end_date: rate.end_date
            };
            allRoutes.push(additionalRoute);
          } else if (!existingRoute.configured_rate) {
            // Update existing route with this rate if it doesn't have one
            existingRoute.configured_rate = rate;
            existingRoute.has_configured_rate = true;
            existingRoute.start_date = rate.start_date;
            existingRoute.end_date = rate.end_date;
          }
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

  const handleEditRate = async (route: TariffRoute) => {
    const existing = route.configured_rate;
    const defaults = systemDefaults?.system_defaults;
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize category configs for all non-All categories
    let categoryConfigs = availableCategories
      .filter(cat => cat !== '*')
      .map(category => ({
        category,
        rate: 0,
        enabled: false
      }));
    
    // If there's an existing rate, fetch ONLY the rates for this specific time period
    if (existing) {
      try {
        // Fetch all rates for this specific origin-destination-postal_service-date combination
        const allRatesResponse = await apiService.getTariffRates();
        const allRates = allRatesResponse.tariff_rates || [];
        
        // Filter rates for this SPECIFIC time period only
        const periodRates = allRates.filter((rate: TariffRateConfig) => 
          rate.origin_country === route.origin && 
          rate.destination_country === route.destination &&
          rate.postal_service === existing.postal_service &&
          rate.start_date === existing.start_date &&
          rate.end_date === existing.end_date
        );
        
        // Update category configs with ONLY this period's rate values
        categoryConfigs = availableCategories
          .filter(cat => cat !== '*')
          .map(category => {
            // Find existing rate for this category in THIS period only
            const existingCategoryRate = periodRates.find((rate: TariffRateConfig) => 
              rate.goods_category === category
            );
            
            if (existingCategoryRate) {
              return {
                category,
                rate: existingCategoryRate.tariff_rate || 0,
                enabled: true
              };
            } else {
              return {
                category,
                rate: 0,
                enabled: false
              };
            }
          });
        
      } catch (error) {
        console.error('Error loading existing category configurations:', error);
        showNotification('Warning: Could not load existing category configurations', 'error');
      }
    }
    
    // Set up bulk rate config with existing data if available
    setBulkRateConfig({
      origin: route.origin,
      destination: route.destination,
      postal_service: existing?.postal_service || '*',
      start_date: existing?.start_date || today,
      end_date: existing?.end_date || '2099-12-31',
      min_weight: existing?.min_weight || 0,
      max_weight: existing?.max_weight || 999999,
      minimum_tariff: existing?.minimum_tariff || defaults?.default_minimum_tariff || 0,
      maximum_tariff: existing?.maximum_tariff || defaults?.suggested_maximum_tariff || 100,
      notes: existing?.notes || '',
      category_configs: categoryConfigs
    });
    setIsEditingExisting(!!existing); // Set editing flag based on whether we have existing data
    
    // Store original period configuration for proper conflict detection
    if (existing) {
      setOriginalPeriodConfig({
        start_date: existing.start_date,
        end_date: existing.end_date
      });
    } else {
      setOriginalPeriodConfig(null);
    }
    
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
        rate: 0,
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
      minimum_tariff: defaults?.default_minimum_tariff || 0,
      maximum_tariff: defaults?.suggested_maximum_tariff || 100,
      notes: '',
      category_configs: categoryConfigs
    });
    setIsEditingExisting(false); // This is a new rate creation
    setOriginalPeriodConfig(null); // No original period for new creation
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

    // Validate dates
    if (bulkRateConfig.start_date >= bulkRateConfig.end_date) {
      showNotification('Start date must be before end date', 'error');
      return;
    }

    // Check for date conflicts and prevent saving if conflicts exist
    const conflicts = checkForDateConflicts(
      bulkRateConfig.origin, 
      bulkRateConfig.destination, 
      bulkRateConfig.start_date, 
      bulkRateConfig.end_date, 
      isEditingExisting
    );
    
    if (conflicts.length > 0) {
      showNotification(
        `Cannot save: Date range conflicts with ${conflicts.length} existing period(s). Please choose non-overlapping dates.`, 
        'error'
      );
      return;
    }

    try {
      if (isEditingExisting && originalPeriodConfig) {
        // For editing: First delete the old period rates, then create new ones
        await handleUpdateExistingPeriod();
      } else {
        // For new creation: Use the normal bulk creation
        await handleCreateNewPeriod();
      }
    } catch (error) {
      console.error('Error saving tariff rates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error saving rates: ${errorMessage}`, 'error');
    }
  };

  const handleCreateNewPeriod = async () => {
    if (!bulkRateConfig) return;
    
    const enabledCategories = bulkRateConfig.category_configs.filter(config => config.enabled);
    
    const bulkData = {
      origin_country: bulkRateConfig.origin,
      destination_country: bulkRateConfig.destination,
      postal_service: bulkRateConfig.postal_service,
      start_date: bulkRateConfig.start_date,
      end_date: bulkRateConfig.end_date,
      min_weight: bulkRateConfig.min_weight,
      max_weight: bulkRateConfig.max_weight,
      minimum_tariff: bulkRateConfig.minimum_tariff,
      maximum_tariff: bulkRateConfig.maximum_tariff > 0 ? bulkRateConfig.maximum_tariff : undefined,
      notes: bulkRateConfig.notes,
      category_rates: enabledCategories.map(config => ({
        category: config.category,
        rate: config.rate
      }))
    };

    const result = await apiService.createBulkTariffRates(bulkData);
    
    if (result.errors && result.errors.length > 0) {
      showNotification(`Issues: ${result.errors.join(' ')}`, 'error');
    } else {
      showNotification(
        `Successfully created ${result.total_created} tariff rates for ${bulkRateConfig.origin} → ${bulkRateConfig.destination}`, 
        'success'
      );
      setBulkRateConfig(null);
      setIsEditingExisting(false);
      setOriginalPeriodConfig(null);
      setShowBulkForm(false);
    }
    
    fetchData(); // Refresh data
  };

  const handleUpdateExistingPeriod = async () => {
    if (!bulkRateConfig || !originalPeriodConfig) return;
    
    try {
      const allRatesResponse = await apiService.getTariffRates();
      const allRates = allRatesResponse.tariff_rates || [];
      
      // Find all rates for the original period
      const originalPeriodRates = allRates.filter((rate: TariffRateConfig) => 
        rate.origin_country === bulkRateConfig.origin && 
        rate.destination_country === bulkRateConfig.destination &&
        rate.postal_service === bulkRateConfig.postal_service &&
        rate.start_date === originalPeriodConfig.start_date &&
        rate.end_date === originalPeriodConfig.end_date
      );
      
      const enabledCategories = bulkRateConfig.category_configs.filter(config => config.enabled);
      const disabledCategories = bulkRateConfig.category_configs.filter(config => !config.enabled);
      
      // Step 1: Delete rates for categories that are now disabled
      for (const disabledCategory of disabledCategories) {
        const rateToDelete = originalPeriodRates.find((rate: TariffRateConfig) => rate.goods_category === disabledCategory.category);
        if (rateToDelete) {
          await apiService.deleteTariffRate(rateToDelete.id);
        }
      }
      
      // Step 2: Update or create rates for enabled categories
      for (const enabledCategory of enabledCategories) {
        const existingRate = originalPeriodRates.find((rate: TariffRateConfig) => rate.goods_category === enabledCategory.category);
        
        if (existingRate) {
          // Update existing rate
          await apiService.updateTariffRate(existingRate.id, {
            tariff_rate: enabledCategory.rate,
            minimum_tariff: bulkRateConfig.minimum_tariff,
            maximum_tariff: bulkRateConfig.maximum_tariff > 0 ? bulkRateConfig.maximum_tariff : undefined,
            notes: `${bulkRateConfig.notes} (Updated via edit)`,
            is_active: true
          });
        } else {
          // Create new rate for this category within the SAME period (use original dates)
          await apiService.createTariffRate({
            origin_country: bulkRateConfig.origin,
            destination_country: bulkRateConfig.destination,
            goods_category: enabledCategory.category,
            postal_service: bulkRateConfig.postal_service,
            start_date: originalPeriodConfig.start_date, // Use original dates to stay in same period
            end_date: originalPeriodConfig.end_date,     // Use original dates to stay in same period
            min_weight: bulkRateConfig.min_weight,
            max_weight: bulkRateConfig.max_weight,
            tariff_rate: enabledCategory.rate,
            minimum_tariff: bulkRateConfig.minimum_tariff,
            maximum_tariff: bulkRateConfig.maximum_tariff > 0 ? bulkRateConfig.maximum_tariff : undefined,
            currency: 'USD',
            notes: `${bulkRateConfig.notes} (Added via edit)`
          });
        }
      }
      
      // Step 3: Update date ranges for all remaining rates if dates changed
      if (bulkRateConfig.start_date !== originalPeriodConfig.start_date || 
          bulkRateConfig.end_date !== originalPeriodConfig.end_date) {
        
        // For date changes, we need to recreate the rates since updateTariffRate doesn't support date changes
        // Get all remaining rates for this period
        const currentRatesResponse = await apiService.getTariffRates();
        const currentRates = currentRatesResponse.tariff_rates || [];
        
        const ratesToUpdateDates = currentRates.filter((rate: TariffRateConfig) => 
          rate.origin_country === bulkRateConfig.origin && 
          rate.destination_country === bulkRateConfig.destination &&
          rate.postal_service === bulkRateConfig.postal_service &&
          rate.start_date === originalPeriodConfig.start_date &&
          rate.end_date === originalPeriodConfig.end_date
        );
        
        // Delete old rates and recreate with new dates
        for (const rate of ratesToUpdateDates) {
          await apiService.deleteTariffRate(rate.id);
          
          // Recreate with new dates
          await apiService.createTariffRate({
            origin_country: rate.origin_country,
            destination_country: rate.destination_country,
            goods_category: rate.goods_category,
            postal_service: rate.postal_service,
            start_date: bulkRateConfig.start_date,
            end_date: bulkRateConfig.end_date,
            min_weight: rate.min_weight,
            max_weight: rate.max_weight,
            tariff_rate: rate.tariff_rate,
            minimum_tariff: rate.minimum_tariff,
            maximum_tariff: rate.maximum_tariff,
            currency: rate.currency,
            notes: `${rate.notes} (Date updated via edit)`
          });
        }
      }
      
      showNotification(
        `Successfully updated tariff rates for ${bulkRateConfig.origin} → ${bulkRateConfig.destination}`, 
        'success'
      );
      
      setBulkRateConfig(null);
      setIsEditingExisting(false);
      setOriginalPeriodConfig(null);
      setShowBulkForm(false);
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error updating existing period:', error);
      throw error;
    }
  };

  const filteredRoutes = routes.filter(route => {
    let matchesSearch = true;
    let matchesOrigin = true;
    let matchesDestination = true;

    // General search term filter (if provided)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      matchesSearch = route.route.toLowerCase().includes(search) ||
                     route.origin.toLowerCase().includes(search) ||
                     route.destination.toLowerCase().includes(search);
    }

    // Origin filter (if provided)
    if (originFilter) {
      const originSearch = originFilter.toLowerCase();
      matchesOrigin = route.origin.toLowerCase().includes(originSearch);
    }

    // Destination filter (if provided)
    if (destinationFilter) {
      const destinationSearch = destinationFilter.toLowerCase();
      matchesDestination = route.destination.toLowerCase().includes(destinationSearch);
    }

    return matchesSearch && matchesOrigin && matchesDestination;
  });

  const uniqueStations = React.useMemo(() => {
    const stations = new Set<string>();
    routes.forEach(route => {
      stations.add(route.origin);
      stations.add(route.destination);
    });
    return Array.from(stations).sort();
  }, [routes]);

  // Get common route pairs for preset filters
  const commonRoutePairs = React.useMemo(() => {
    const routeCounts = new Map<string, number>();
    routes.forEach(route => {
      const routeKey = `${route.origin}-${route.destination}`;
      routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + route.shipment_count);
    });
    
    // Get top 6 most common routes
    return Array.from(routeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([routeKey]) => {
        const [origin, destination] = routeKey.split('-');
        return { origin, destination };
      });
  }, [routes]);

  const handlePresetFilter = (origin: string, destination: string) => {
    setOriginFilter(origin);
    setDestinationFilter(destination);
    setSearchTerm(''); // Clear general search when using preset
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setOriginFilter('');
    setDestinationFilter('');
  };

  // Handle keyboard shortcuts for search
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Clear filters with Escape key
    if (event.key === 'Escape') {
      clearAllFilters();
    }
  };

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
            Configure and manage tariff rates for different shipping routes and goods categories.
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
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Filter Routes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* General Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  General Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search routes (general)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Search across all route information • Press ESC to clear</p>
              </div>

              {/* Origin Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origin Country
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Filter by origin..."
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    list="origin-filter-list"
                  />
                  <datalist id="origin-filter-list">
                    {uniqueStations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-gray-500 mt-1">Filter by specific origin country</p>
              </div>

              {/* Destination Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Country
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Filter by destination..."
                    value={destinationFilter}
                    onChange={(e) => setDestinationFilter(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                    list="destination-filter-list"
                  />
                  <datalist id="destination-filter-list">
                    {uniqueStations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-gray-500 mt-1">Filter by specific destination country</p>
              </div>
            </div>

            {/* Quick Preset Filters */}
            {commonRoutePairs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Quick route filters:</span>
                  <button
                    onClick={() => setShowPresetFilters(!showPresetFilters)}
                    className="text-sm text-cathay-teal hover:text-cathay-teal-dark"
                  >
                    {showPresetFilters ? 'Hide' : 'Show'} common routes
                  </button>
                </div>
                
                {showPresetFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {commonRoutePairs.map((pair, index) => (
                      <button
                        key={index}
                        onClick={() => handlePresetFilter(pair.origin, pair.destination)}
                        className="text-xs bg-gray-100 hover:bg-cathay-teal hover:text-white text-gray-700 px-2 py-1 rounded transition-colors duration-200"
                      >
                        {pair.origin} → {pair.destination}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Filters Display */}
            {(searchTerm || originFilter || destinationFilter) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      General: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  
                  {originFilter && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Origin: "{originFilter}"
                      <button
                        onClick={() => setOriginFilter('')}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  
                  {destinationFilter && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Destination: "{destinationFilter}"
                      <button
                        onClick={() => setDestinationFilter('')}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 ml-2"
                  >
                    <X className="h-4 w-4" />
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span>
                  Showing <span className="font-medium text-cathay-teal">{filteredRoutes.length}</span> of <span className="font-medium">{routes.length}</span> routes
                  {(searchTerm || originFilter || destinationFilter) && (
                    <span className="ml-2 text-cathay-teal font-medium">
                      (filtered)
                    </span>
                  )}
                </span>
                
                {filteredRoutes.length === 0 && routes.length > 0 && (
                  <span className="text-orange-600 font-medium">
                    No routes match your search criteria
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Routes Table */}
        {filteredRoutes.length === 0 && routes.length > 0 && (searchTerm || originFilter || destinationFilter) ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No routes found</h3>
            <p className="text-gray-600 mb-4">
              No routes match your current search criteria. Try adjusting your filters or clearing them to see all routes.
            </p>
            <button
              onClick={clearAllFilters}
              className="bg-cathay-teal text-white px-4 py-2 rounded-md hover:bg-cathay-teal-dark"
            >
              Clear all filters
            </button>
          </div>
        ) : (
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
                    Rate Details
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
                {filteredRoutes.map((route, routeIndex) => (
                  <tr key={`${route.route}-${route.start_date}-${route.end_date}`} className={routeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {route.route}
                          </div>
                          <div className="text-sm text-gray-500">
                            {route.origin} → {route.destination}
                            {route.start_date && route.end_date && (
                              <span className="ml-2 text-xs text-blue-600">
                                ({route.start_date} to {route.end_date})
                              </span>
                            )}
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
                      {route.start_date || (
                        <span className="text-gray-400 italic">No config</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.end_date || (
                        <span className="text-gray-400 italic">No config</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {route.has_configured_rate ? (
                        <button
                          onClick={() => handleShowRateDetails(route)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          View Rates
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No rates</span>
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
        )}

        {/* Bulk Rate Configuration Modal */}
        {showBulkForm && bulkRateConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isEditingExisting ? 'Edit Rate Configuration' : 'Bulk Rate Configuration'}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
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
                      <p className="text-xs text-gray-500 mb-2">Type a custom country code or select from existing ones below</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={bulkRateConfig.origin}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            origin: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                          placeholder="Enter or select origin country"
                          list="origin-countries"
                        />
                        <datalist id="origin-countries">
                          {uniqueStations.map(station => (
                            <option key={station} value={station}>{station}</option>
                          ))}
                        </datalist>
                        <select
                          value={bulkRateConfig.origin}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            origin: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent text-sm"
                        >
                          <option value="">Or select from existing...</option>
                          {uniqueStations.map(station => (
                            <option key={station} value={station}>{station}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destination Country
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Type a custom country code or select from existing ones below</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={bulkRateConfig.destination}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            destination: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                          placeholder="Enter or select destination country"
                          list="destination-countries"
                        />
                        <datalist id="destination-countries">
                          {uniqueStations.map(station => (
                            <option key={station} value={station}>{station}</option>
                          ))}
                        </datalist>
                        <select
                          value={bulkRateConfig.destination}
                          onChange={(e) => setBulkRateConfig({
                            ...bulkRateConfig,
                            destination: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent text-sm"
                        >
                          <option value="">Or select from existing...</option>
                          {uniqueStations.map(station => (
                            <option key={station} value={station}>{station}</option>
                          ))}
                        </select>
                      </div>
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
                      {bulkRateConfig.origin && bulkRateConfig.destination && bulkRateConfig.start_date && bulkRateConfig.end_date && (() => {
                        const conflicts = checkForDateConflicts(bulkRateConfig.origin, bulkRateConfig.destination, bulkRateConfig.start_date, bulkRateConfig.end_date, isEditingExisting);
                        return conflicts.length > 0 ? (
                          <div className="mt-1 text-xs text-red-600">
                            ⚠️ Date range conflicts with {conflicts.length} existing rate(s)
                          </div>
                        ) : null;
                      })()}
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
                      {bulkRateConfig.origin && bulkRateConfig.destination && bulkRateConfig.start_date && bulkRateConfig.end_date && (() => {
                        const conflicts = checkForDateConflicts(bulkRateConfig.origin, bulkRateConfig.destination, bulkRateConfig.start_date, bulkRateConfig.end_date, isEditingExisting);
                        return conflicts.length > 0 ? (
                          <div className="mt-1 text-xs text-red-600">
                            Conflicts: {conflicts.map(c => `${c.start_date} to ${c.end_date}`).join(', ')}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-green-600">
                            ✓ No date conflicts detected
                          </div>
                        );
                      })()}
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
                        Category Rate (%)
                      </label>
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
                            Rate (%)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Effective Rate
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
                                value={(config.rate * 100).toFixed(2)}
                                onChange={(e) => {
                                  const newConfigs = [...bulkRateConfig.category_configs];
                                  newConfigs[index] = { 
                                    ...config, 
                                    rate: (parseFloat(e.target.value) || 0) / 100 
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
                                  {(config.rate * 100).toFixed(2)}%
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
                    setIsEditingExisting(false);
                    setOriginalPeriodConfig(null);
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
                  {isEditingExisting ? 'Save Changes' : 'Create Rates'}
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
                    <p className="text-xs text-gray-500 mb-2">Type a custom country code or select from existing ones below</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={calculatorData.origin}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          origin: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                        placeholder="Enter or select origin country"
                        list="calc-origin-countries"
                      />
                      <datalist id="calc-origin-countries">
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </datalist>
                      <select
                        value={calculatorData.origin}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          origin: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent text-sm"
                      >
                        <option value="">Or select from existing...</option>
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destination Country
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Type a custom country code or select from existing ones below</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={calculatorData.destination}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          destination: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
                        placeholder="Enter or select destination country"
                        list="calc-destination-countries"
                      />
                      <datalist id="calc-destination-countries">
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </datalist>
                      <select
                        value={calculatorData.destination}
                        onChange={(e) => setCalculatorData({
                          ...calculatorData,
                          destination: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cathay-teal focus:border-transparent text-sm"
                      >
                        <option value="">Or select from existing...</option>
                        {uniqueStations.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                    </div>
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
                      {calculationResult.tariff_rate && (
                        <div className="flex justify-between">
                          <span>Tariff Rate:</span>
                          <span className="font-medium">{(calculationResult.tariff_rate * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {calculationResult.has_category_specific_rate && (
                        <div className="flex justify-between">
                          <span>Rate Type:</span>
                          <span className="font-medium text-green-600">Category-Specific</span>
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

        {/* Rate Details Popup */}
        {showRateDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Rate Details
                </h3>
                <button
                  onClick={() => setShowRateDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Route:</span> {showRateDetails.route.origin} → {showRateDetails.route.destination}
                </p>
                {showRateDetails.route.start_date && showRateDetails.route.end_date && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Period:</span> {showRateDetails.route.start_date} to {showRateDetails.route.end_date}
                  </p>
                )}
                {showRateDetails.route.configured_rate && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Service:</span> {showRateDetails.route.configured_rate.postal_service === '*' ? 'All Services' : showRateDetails.route.configured_rate.postal_service}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Enabled Categories & Rates</h4>
                {showRateDetails.categoryRates.length > 0 ? (
                  <div className="space-y-2">
                    {showRateDetails.categoryRates.map((categoryRate, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          {categoryRate.category}
                        </span>
                        <span className="text-sm font-semibold text-cathay-teal">
                          {(categoryRate.rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No category rates configured</p>
                )}

                {showRateDetails.route.configured_rate && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Minimum Tariff:</span>
                        <span className="font-medium">${showRateDetails.route.configured_rate.minimum_tariff}</span>
                      </div>
                      {showRateDetails.route.configured_rate.maximum_tariff && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Maximum Tariff:</span>
                          <span className="font-medium">${showRateDetails.route.configured_rate.maximum_tariff}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weight Range:</span>
                        <span className="font-medium">{showRateDetails.route.configured_rate.min_weight}g - {showRateDetails.route.configured_rate.max_weight}g</span>
                      </div>
                      {showRateDetails.route.configured_rate.notes && (
                        <div className="pt-2">
                          <span className="text-gray-600">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{showRateDetails.route.configured_rate.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowRateDetails(null)}
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
