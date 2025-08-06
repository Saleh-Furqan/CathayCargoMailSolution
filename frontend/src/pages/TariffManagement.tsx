import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Globe, TrendingUp, RotateCcw, Save, CheckCircle, X } from 'lucide-react';
import { apiService } from '../services/api';
import CountryFlag from '../components/CountryFlag/CountryFlag';
interface Country {
  id: number;
  code: string;
  name: string;
}

interface TariffRate {
  id: number;
  origin_country_id: number;
  destination_country_id: number;
  origin_country: Country;
  destination_country: Country;
  rate_percentage: number;
  is_custom: boolean;
  last_updated: string;
}

interface TariffSummary {
  shipment_summary: {
    total_shipments: number;
    total_declared_value: number;
    total_tariff_amount: number;
    average_tariff_rate: number;
  };
  rate_summary: {
    total_rates: number;
    custom_rates: number;
    default_rates: number;
  };
}

const TariffManagement: React.FC = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [tariffRates, setTariffRates] = useState<TariffRate[]>([]);
  const [tariffSummary, setTariffSummary] = useState<TariffSummary | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<number | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<number | null>(null);
  const [newRate, setNewRate] = useState<string>('50.0'); // Change to string to avoid input issues
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<number | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<number | null>(null);
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
      const [countriesData, ratesData, summaryData] = await Promise.all([
        apiService.getCountries(),
        apiService.getTariffRates(),
        apiService.getTariffSummary()
      ]);

      setCountries(countriesData as Country[]);
      setTariffRates(ratesData as TariffRate[]);
      setTariffSummary(summaryData as TariffSummary);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateTariffRate = async () => {
    if (!selectedOrigin || !selectedDestination) {
      alert('Please select both origin and destination countries');
      return;
    }

    const rateValue = parseFloat(newRate);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
      alert('Rate percentage must be a valid number between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      await apiService.updateTariffRate({
        origin_country_id: selectedOrigin,
        destination_country_id: selectedDestination,
        rate_percentage: rateValue,
      });

      await fetchData(); // Refresh data
      setSelectedOrigin(null);
      setSelectedDestination(null);
      setNewRate('50.0');
      showNotification('Tariff rate updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating tariff rate:', error);
      showNotification('Error updating tariff rate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetAllRates = async () => {
    if (!confirm('Are you sure you want to reset all tariff rates to 50%? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await apiService.resetTariffRates();

      await fetchData(); // Refresh data
      showNotification('All tariff rates have been reset to 50%', 'success');
    } catch (error) {
      console.error('Error resetting tariff rates:', error);
      showNotification('Error resetting tariff rates', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRates = tariffRates.filter(rate => {
    // Text search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const textMatch = (
        rate.origin_country.name.toLowerCase().includes(search) ||
        rate.origin_country.code.toLowerCase().includes(search) ||
        rate.destination_country.name.toLowerCase().includes(search) ||
        rate.destination_country.code.toLowerCase().includes(search)
      );
      if (!textMatch) return false;
    }

    // Origin country filter
    if (originFilter && rate.origin_country_id !== originFilter) {
      return false;
    }

    // Destination country filter
    if (destinationFilter && rate.destination_country_id !== destinationFilter) {
      return false;
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
    <div className="p-6 max-w-7xl mx-auto">
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

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Tariff Management</h1>
        </div>
        <p className="text-gray-600">Manage tariff rates between countries and view tariff impact on shipments</p>
      </div>

      {/* Summary Cards */}
      {tariffSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shipments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tariffSummary.shipment_summary.total_shipments}
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
                  ${tariffSummary.shipment_summary.total_declared_value.toLocaleString()}
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
                  ${tariffSummary.shipment_summary.total_tariff_amount.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Custom Rates</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tariffSummary.rate_summary.custom_rates} / {tariffSummary.rate_summary.total_rates}
                </p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Rate Update Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Update Tariff Rate</h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origin Country <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOrigin || ''}
              onChange={(e) => setSelectedOrigin(Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select origin...</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Country <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDestination || ''}
              onChange={(e) => setSelectedDestination(Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select destination...</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Percentage <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter rate percentage"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>

          <div className="lg:col-span-2 flex items-end gap-3">
            <button
              onClick={updateTariffRate}
              disabled={saving || !selectedOrigin || !selectedDestination}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Updating...' : 'Update Rate'}
            </button>
            <button
              onClick={resetAllRates}
              disabled={saving}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Tariff Rates Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Tariff Rates</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48"
                />
              </div>
              
              <select
                value={originFilter || ''}
                onChange={(e) => setOriginFilter(Number(e.target.value) || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-40"
              >
                <option value="">All Origins</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.code}
                  </option>
                ))}
              </select>
              
              <select
                value={destinationFilter || ''}
                onChange={(e) => setDestinationFilter(Number(e.target.value) || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-40"
              >
                <option value="">All Destinations</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.code}
                  </option>
                ))}
              </select>
              
              {(searchTerm || originFilter || destinationFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setOriginFilter(null);
                    setDestinationFilter(null);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredRates.length} of {tariffRates.length} tariff rates
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CountryFlag countryCode={rate.origin_country.code} size={24} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {rate.origin_country.name}
                        </div>
                        <div className="text-xs text-gray-500">{rate.origin_country.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CountryFlag countryCode={rate.destination_country.code} size={24} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {rate.destination_country.name}
                        </div>
                        <div className="text-xs text-gray-500">{rate.destination_country.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold ${
                      rate.rate_percentage === 50 ? 'text-gray-900' : 'text-blue-600'
                    }`}>
                      {rate.rate_percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rate.is_custom
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rate.is_custom ? 'Custom' : 'Default'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(rate.last_updated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrigin(rate.origin_country_id);
                        setSelectedDestination(rate.destination_country_id);
                        setNewRate(rate.rate_percentage.toString());
                        // Scroll to update form
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRates.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {tariffRates.length === 0 ? 'No tariff rates found' : 'No rates match your search criteria'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TariffManagement;
