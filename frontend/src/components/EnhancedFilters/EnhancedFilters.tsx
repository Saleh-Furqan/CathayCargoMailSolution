import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { apiService } from '../../services/api';

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
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">Enhanced Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-800"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goods Category
              </label>
              <select
                value={filters.goodsCategory || '*'}
                onChange={(e) => handleFilterChange('goodsCategory', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                value={filters.postalService || '*'}
                onChange={(e) => handleFilterChange('postalService', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableServices.map(service => (
                  <option key={service} value={service}>
                    {service === '*' ? 'All Services' : service}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Method
              </label>
              <select
                value={filters.calculationMethod || 'all'}
                onChange={(e) => handleFilterChange('calculationMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="configured">Configured Rates</option>
                <option value="fallback">Fallback Rates</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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