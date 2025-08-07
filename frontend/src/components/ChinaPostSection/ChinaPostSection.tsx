import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
  Search,
  DollarSign,
  Package,
  Plane,
  TrendingUp,
} from 'lucide-react';
import { apiService } from '../../services/api';

interface ChinaPostSectionProps {
  data: any[];
  onDownload: () => void;
  isAvailable: boolean;
}

const ChinaPostSection: React.FC<ChinaPostSectionProps> = ({ data, onDownload, isAvailable }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [analytics, setAnalytics] = useState<any>(null);
  const itemsPerPage = 10;

  // Use backend-provided data - NO FRONTEND PROCESSING
  const chinaPostData = data.map(item => ({
    sequenceNumber: item.sequence_number || '',
    pawb: item.pawb || '',
    cardit: item.cardit || '',
    trackingNumber: item.tracking_number || '',
    receptacle: item.receptacle_id || '',
    originStation: item.host_origin_station || '',
    destinationStation: item.host_destination_station || '',
    weight: item.bag_weight || '',
    flightCarrier: item.flight_carrier_1 || '',
    flightNumber: item.flight_number_1 || '',
    flightDate: item.flight_date_1 || '',
    // Additional flight legs
    flightCarrier2: item.flight_carrier_2 || '',
    flightNumber2: item.flight_number_2 || '',
    flightDate2: item.flight_date_2 || '',
    flightCarrier3: item.flight_carrier_3 || '',
    flightNumber3: item.flight_number_3 || '',
    flightDate3: item.flight_date_3 || '',
    arrivalDate: item.arrival_date || '',
    arrivalUld: item.arrival_uld_number || '',
    bagNumber: item.bag_number || '',
    declaredContent: item.declared_content || '',
    hsCode: item.hs_code || '',
    declaredValue: item.declared_value || '',
    currency: item.currency || '',
    numberOfPackets: item.number_of_packets || '',
    tariffAmount: item.tariff_amount || '',
  }));

  // Filter data
  const filteredData = chinaPostData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.pawb?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.flightCarrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAirline = !selectedAirline || item.flightCarrier === selectedAirline;
    const matchesDestination = !selectedDestination || item.destinationStation === selectedDestination;
    
    return matchesSearch && matchesAirline && matchesDestination;
  });

  // Fetch analytics from backend - NO FRONTEND CALCULATIONS
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsData = await apiService.getChinaPostAnalytics();
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error fetching China Post analytics:', error);
        // Set empty analytics on error
        setAnalytics({
          total_weight: 0,
          total_declared_value: 0,
          total_records: 0,
          total_tariff: 0,
          unique_carriers: 0,
          unique_destinations: 0,
          unique_flights: 0,
          average_weight: 0,
          average_value: 0,
          currency_breakdown: {}
        });
      }
    };

    if (data.length > 0) {
      fetchAnalytics();
    }
  }, [data]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const uniqueAirlines = [...new Set(chinaPostData.map(item => item.flightCarrier))].filter(Boolean);
  const uniqueDestinations = [...new Set(chinaPostData.map(item => item.destinationStation))].filter(Boolean);

  // Use backend analytics or show loading state
  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cathay-teal mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading China Post analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CHINAPOST Export Section</h2>
          <p className="text-gray-600">Complete CHINAPOST export format with IODA data integration</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onDownload}
            disabled={!isAvailable}
            className={`btn-primary px-4 py-2 flex items-center space-x-2 ${
              !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Download CHINAPOST Export</span>
          </button>
        </div>
      </div>

      {!isAvailable && (
        <div className="card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">CHINAPOST Export Data Not Available</h3>
              <p className="text-sm text-yellow-700">
                The uploaded data hasn't been processed yet. Please upload CNP data to generate CHINAPOST export format.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards - All data from backend */}
      <div className="flex flex-wrap gap-4 sm:gap-6">
        {/* Total Weight - Dynamic width based on number */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.total_weight > 999999 ? 'min-w-[200px]' :
          analytics.total_weight > 99999 ? 'min-w-[180px]' :
          analytics.total_weight > 9999 ? 'min-w-[160px]' : 'min-w-[140px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-red-500 flex-shrink-0">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Total Weight</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">{analytics.total_weight.toLocaleString()} kg</p>
            </div>
          </div>
        </div>

        {/* Total Declared Value - Dynamic width for currency */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.total_declared_value > 99999999 ? 'min-w-[280px]' :
          analytics.total_declared_value > 9999999 ? 'min-w-[250px]' :
          analytics.total_declared_value > 999999 ? 'min-w-[220px]' :
          analytics.total_declared_value > 99999 ? 'min-w-[200px]' :
          analytics.total_declared_value > 9999 ? 'min-w-[180px]' : 'min-w-[160px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-green-500 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Declared Value</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">${analytics.total_declared_value.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Total Records - Dynamic width */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.total_records > 999999 ? 'min-w-[200px]' :
          analytics.total_records > 99999 ? 'min-w-[180px]' :
          analytics.total_records > 9999 ? 'min-w-[160px]' : 'min-w-[140px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-500 flex-shrink-0">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Total Records</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">{analytics.total_records.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Carriers - Compact for small numbers */}
        <div className="card p-6 flex-shrink-0 min-w-[120px]">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-purple-500 flex-shrink-0">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Carriers</p>
              <p className="text-xl font-bold text-gray-900 leading-none">{analytics.unique_carriers}</p>
            </div>
          </div>
        </div>

        {/* Total Tariff - Dynamic width for currency */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.total_tariff > 99999999 ? 'min-w-[280px]' :
          analytics.total_tariff > 9999999 ? 'min-w-[250px]' :
          analytics.total_tariff > 999999 ? 'min-w-[220px]' :
          analytics.total_tariff > 99999 ? 'min-w-[200px]' :
          analytics.total_tariff > 9999 ? 'min-w-[180px]' : 'min-w-[160px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-orange-500 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Total Tariff</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">${analytics.total_tariff.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Breakdown - All data from backend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analytics.currency_breakdown).map(([currency, data]: [string, any]) => (
            <div key={currency} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">{currency}</h4>
              <p className="text-sm text-gray-600">{data.count} shipments</p>
              <p className="text-sm font-medium text-gray-900">${data.totalValue.toFixed(2)} total value</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by PAWB, flight number, tracking number, or carrier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <select
              value={selectedAirline}
              onChange={(e) => setSelectedAirline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
            >
              <option value="">All Carriers</option>
              {uniqueAirlines.map(carrier => (
                <option key={carrier} value={carrier}>{carrier}</option>
              ))}
            </select>
          </div>
          <div className="lg:w-48">
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
            >
              <option value="">All Destinations</option>
              {uniqueDestinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">CHINAPOST Export Details</h3>
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} shipments
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seq#
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PAWB
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CARDIT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin → Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flight Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrival Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receptacle & Bag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content & HS Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Declared Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packets & Tariff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{startIndex + index + 1}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.pawb || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.cardit || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.originStation || 'N/A'} → {item.destinationStation || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.flightCarrier || 'N/A'} {item.flightNumber || ''}
                      </div>
                      <div className="text-sm text-gray-500">{item.flightDate || 'N/A'}</div>
                      {/* Show additional flight legs if available */}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.arrivalDate || 'N/A'}</div>
                      <div className="text-sm text-gray-500">ULD: {item.arrivalUld || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.receptacle || 'N/A'}</div>
                      <div className="text-sm text-gray-500">
                        Bag: {item.bagNumber || 'N/A'} ({item.weight || 0} kg)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{item.trackingNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900" title={item.declaredContent || 'N/A'}>
                        {item.declaredContent ? 
                          (item.declaredContent.length > 20 ? 
                            item.declaredContent.substring(0, 20) + '...' : 
                            item.declaredContent
                          ) : 'N/A'
                        }
                      </div>
                      <div className="text-sm text-gray-500">HS: {item.hsCode || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.declaredValue || 'N/A'} {item.currency || ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        Packets: {item.numberOfPackets || 'N/A'}
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        Tariff: ${item.tariffAmount || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-cathay-teal hover:text-cathay-teal-dark">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChinaPostSection;