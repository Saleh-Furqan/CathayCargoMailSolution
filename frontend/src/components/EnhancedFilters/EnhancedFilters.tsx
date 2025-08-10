import React, { useState, useEffect } from 'react';
import { Filter, X, HelpCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatDisplayValue, getFieldExplanation } from '../../utils/displayHelpers';

interface EnhancedFiltersProps {
  onFiltersChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  showDateFilters?: boolean;
  className?: string;
}

export interface FilterValues {
  startDate?: string;
  endDate?: string;
  goodsCategory?: string;
  postalService?: string;
  calculationMethod?: string;
}

const EnhancedFilters: React.FC<EnhancedFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  showDateFilters = true,
  className = ''
}) => {
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['*']);
  const [availableServices, setAvailableServices] = useState<string[]>(['*']);
  const [showFilters, setShowFilters] = useState(false);

  // Load available categories and services
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [categoriesResponse, servicesResponse] = await Promise.all([
          apiService.getTariffCategories(),
          apiService.getTariffServices()
        ]);
        
        setAvailableCategories(categoriesResponse.categories || ['*']);
        setAvailableServices(servicesResponse.services || ['*']);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterValues = {};
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== '' && value !== '*' && value !== 'all');

  return (
    <div className={`cathay-card ${className}`}>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-medium text-slate-900">Enhanced Filters</h3>
            {hasActiveFilters && (
              <span className="cathay-badge-success">
                Active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {showDateFilters && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="cathay-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="cathay-input w-full"
                  />
                </div>
              </>
            )}

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Goods Category
                </label>
                <span 
                  title={getFieldExplanation('goods_category', formatDisplayValue(filters.goodsCategory))}
                  data-tooltip={getFieldExplanation('goods_category', formatDisplayValue(filters.goodsCategory))}
                >
                  <HelpCircle className="h-3 w-3 text-gray-400 cathay-tooltip-trigger cursor-help" />
                </span>
              </div>
              <select
                value={filters.goodsCategory || '*'}
                onChange={(e) => handleFilterChange('goodsCategory', e.target.value)}
                className="cathay-select w-full"
              >
                {availableCategories.map(category => (
                  <option key={category} value={category}>
                    {formatDisplayValue(category)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Postal Service
                </label>
                <span 
                  title={getFieldExplanation('postal_service', formatDisplayValue(filters.postalService))}
                  data-tooltip={getFieldExplanation('postal_service', formatDisplayValue(filters.postalService))}
                >
                  <HelpCircle className="h-3 w-3 text-gray-400 cathay-tooltip-trigger cursor-help" />
                </span>
              </div>
              <select
                value={filters.postalService || '*'}
                onChange={(e) => handleFilterChange('postalService', e.target.value)}
                className="cathay-select w-full"
              >
                {availableServices.map(service => (
                  <option key={service} value={service}>
                    {formatDisplayValue(service)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Calculation Method
                </label>
                <span 
                  title={getFieldExplanation('tariff_calculation')}
                  data-tooltip={getFieldExplanation('tariff_calculation')}
                >
                  <HelpCircle className="h-3 w-3 text-gray-400 cathay-tooltip-trigger cursor-help" />
                </span>
              </div>
              <select
                value={filters.calculationMethod || 'all'}
                onChange={(e) => handleFilterChange('calculationMethod', e.target.value)}
                className="cathay-select w-full"
              >
                <option value="all">All Methods</option>
                <option value="configured">Configured Rates</option>
                <option value="fallback">System Rates</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={clearFilters}
                className="cathay-btn-outline inline-flex items-center px-3 py-2 text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedFilters;