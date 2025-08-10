/**
 * Display helpers for improving UI clarity
 */

/**
 * Convert backend wildcard values to user-friendly display text
 */
export const formatDisplayValue = (value: string | null | undefined, _context?: string): string => {
  if (!value || value === '*' || value === 'All') {
    return 'All';
  }
  return value;
};

/**
 * Convert user display values back to backend format
 */
export const formatBackendValue = (value: string): string => {
  if (value === 'All' || value === '' || !value) {
    return '*';
  }
  return value;
};

/**
 * Get explanation tooltip for different field types
 */
export const getFieldExplanation = (fieldType: string, value?: string): string => {
  const explanations: Record<string, string> = {
    'goods_category': value === 'All' || value === '*' 
      ? 'Applies to all goods categories (Documents, Electronics, Clothing, etc.)'
      : `Applies specifically to ${value} shipments`,
    'postal_service': value === 'All' || value === '*'
      ? 'Applies to all postal services (EMS, E-packet, Regular Mail, etc.)'
      : `Applies specifically to ${value} service`,
    'tariff_calculation': value === 'configured'
      ? 'Tariff calculated using configured rate for this route/category/service'
      : value === 'fallback'
      ? 'Tariff calculated using system fallback rate (no specific configuration found)'
      : 'Method used to calculate the tariff amount',
    'min_weight': 'Minimum weight (in kg) for this rate to apply',
    'max_weight': 'Maximum weight (in kg) for this rate to apply',
    'tariff_rate': 'Percentage of declared value charged as tariff (e.g., 0.8 = 80%)',
    'origin_destination': 'Route from origin country/station to destination country/station'
  };
  
  return explanations[fieldType] || '';
};

/**
 * Get status badge configuration
 */
export const getStatusBadge = (method: string): { 
  className: string; 
  label: string; 
  explanation: string 
} => {
  switch (method) {
    case 'configured':
      return {
        className: 'status-configured cathay-badge',
        label: 'Configured Rate',
        explanation: 'Calculated using a specific rate configured for this route, category, and service'
      };
    case 'fallback':
      return {
        className: 'status-fallback cathay-badge',
        label: 'System Rate',
        explanation: 'Calculated using the system fallback rate (no specific configuration found)'
      };
    default:
      return {
        className: 'status-error cathay-badge',
        label: 'Unknown',
        explanation: 'Unable to determine calculation method'
      };
  }
};

/**
 * Format currency values with proper decimals
 */
export const formatCurrency = (value: number | string | null | undefined, currency: string = 'USD'): string => {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0.00`;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return `${currency} 0.00`;
  }
  
  return `${currency} ${numValue.toFixed(2)}`;
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '0%';
  }
  
  // Convert decimal to percentage (0.8 -> 80%)
  return `${(numValue * 100).toFixed(1)}%`;
};

/**
 * Format weight values
 */
export const formatWeight = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '0 kg';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '0 kg';
  }
  
  return `${numValue.toFixed(2)} kg`;
};

/**
 * Create tooltip component properties
 */
export const createTooltipProps = (explanation: string) => {
  return {
    'data-tooltip': explanation,
    className: 'cathay-tooltip-trigger cursor-help'
  };
};