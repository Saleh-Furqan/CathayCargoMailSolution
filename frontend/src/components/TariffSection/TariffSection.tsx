import React from 'react';
import { DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { formatDate } from '../../utils/displayHelpers';

interface TariffInfo {
  tariff_rate: number;
  tariff_amount: number;
  declared_value_usd: string;
  departure_station: string;
  destination: string;
  arrival_date?: string;
}

interface TariffSectionProps {
  data?: TariffInfo[];
  title?: string;
  showDetails?: boolean;
}

const TariffSection: React.FC<TariffSectionProps> = ({ 
  data = [], 
  title = "Tariff Information",
  showDetails = true 
}) => {

  // Calculate summary statistics
  const totalDeclaredValue = data.reduce((sum, item) => {
    // Clean the declared value string by removing currency symbols and spaces
    const cleanedValue = String(item.declared_value_usd || '0')
      .replace('$', '')
      .replace(',', '')
      .replace(' ', '');
    return sum + (parseFloat(cleanedValue) || 0);
  }, 0);

  const totalTariffAmount = data.reduce((sum, item) => {
    return sum + (item.tariff_amount || 0);
  }, 0);

  const averageTariffRate = data.length > 0 
    ? data.reduce((sum, item) => sum + item.tariff_rate, 0) / data.length 
    : 0;

  const highestTariffRate = data.length > 0 
    ? Math.max(...data.map(item => item.tariff_rate)) 
    : 0;

  const lowestTariffRate = data.length > 0 
    ? Math.min(...data.map(item => item.tariff_rate)) 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Declared Value</p>
              <p className="text-xl font-bold text-blue-900">
                ${totalDeclaredValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Tariff Amount</p>
              <p className="text-xl font-bold text-green-900">
                ${totalTariffAmount.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Average Tariff Rate</p>
              <p className="text-xl font-bold text-purple-900">
                {averageTariffRate.toFixed(1)}%
              </p>
            </div>
            <Calculator className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Rate Range */}
      {data.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tariff Rate Range</h4>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Lowest:</span>
              <span className="font-semibold text-green-600 ml-1">{lowestTariffRate.toFixed(1)}%</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Highest:</span>
              <span className="font-semibold text-red-600 ml-1">{highestTariffRate.toFixed(1)}%</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Average:</span>
              <span className="font-semibold text-blue-600 ml-1">{averageTariffRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {showDetails && data.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Shipment Tariff Details</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Declared Value
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrival Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tariff Rate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tariff Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((item, index) => { // Show only first 10 for performance
                  // Clean the declared value string by removing currency symbols and spaces
                  const cleanedValue = String(item.declared_value_usd || '0')
                    .replace('$', '')
                    .replace(',', '')
                    .replace(' ', '');
                  const declaredValue = parseFloat(cleanedValue) || 0;
                  const effectiveRate = declaredValue > 0 ? (item.tariff_amount / declaredValue * 100) : 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.departure_station} → {item.destination}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        ${declaredValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.arrival_date)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          item.tariff_rate === 50 ? 'text-gray-600' : 'text-blue-600'
                        }`}>
                          {item.tariff_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        ${item.tariff_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          effectiveRate === item.tariff_rate ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {effectiveRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.length > 10 && (
              <div className="px-4 py-2 text-sm text-gray-500 text-center border-t">
                Showing 10 of {data.length} shipments
              </div>
            )}
          </div>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-8">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tariff data available</p>
        </div>
      )}
    </div>
  );
};

export default TariffSection;
