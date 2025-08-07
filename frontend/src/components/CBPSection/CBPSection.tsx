import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
  Search,
  DollarSign,
  Package,
  Plane,
  MapPin,
} from 'lucide-react';
import { apiService } from '../../services/api';

interface CBPSectionProps {
  data: any[];
  onDownload: () => void;
  isAvailable: boolean;
}

const CBPSection: React.FC<CBPSectionProps> = ({ data, onDownload, isAvailable }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [analytics, setAnalytics] = useState<any>(null);
  const itemsPerPage = 10;

  // Use backend-provided data - NO FRONTEND PROCESSING
  const cbpData = data.map(item => ({
    carrierCode: item.carrier_code || '',
    flightTripNumber: item.flight_trip_number || '',
    trackingNumber: item.tracking_number || '',
    arrivalPortCode: item.arrival_port_code || '',
    arrivalDate: item.arrival_date_formatted || item.arrival_date || '',
    declaredValue: item.declared_value_usd || item.declared_value || '',
    // Additional backend fields for context
    pawb: item.pawb || '',
    cardit: item.cardit || '',
    receptacle: item.receptacle_id || '',
    weight: item.bag_weight || '',
    content: item.declared_content || '',
  }));

  // Fetch analytics from backend - NO FRONTEND CALCULATIONS
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsData = await apiService.getCBPAnalytics();
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error fetching CBP analytics:', error);
        // Set empty analytics on error
        setAnalytics({
          total_value: 0,
          total_records: 0,
          unique_carriers: 0,
          unique_ports: 0,
          average_value: 0
        });
      }
    };

    if (data.length > 0) {
      fetchAnalytics();
    }
  }, [data]);

  // Filter data
  const filteredData = cbpData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.flightTripNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.carrierCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCarrier = !selectedCarrier || item.carrierCode === selectedCarrier;
    
    return matchesSearch && matchesCarrier;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const uniqueCarriers = [...new Set(cbpData.map(item => item.carrierCode))].filter(Boolean);

  // Use backend analytics or show loading state
  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cathay-teal mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading CBP analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CBP Reporting Section</h2>
          <p className="text-gray-600">Customs and Border Protection compliance data</p>
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
            <span>Download CBP Report</span>
          </button>
        </div>
      </div>

      {!isAvailable && (
        <div className="card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">CBP Data Not Available</h3>
              <p className="text-sm text-yellow-700">
                The uploaded data doesn't contain all required CBP columns. Please ensure your data includes carrier code, flight/trip number, tracking number, arrival port code, arrival date, and declared value.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards - All data from backend */}
      <div className="flex flex-wrap gap-4 sm:gap-6">
        {/* Total Declared Value - Dynamic width for large currency amounts */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.total_value > 999999999 ? 'min-w-[320px]' :
          analytics.total_value > 99999999 ? 'min-w-[300px]' :
          analytics.total_value > 9999999 ? 'min-w-[280px]' :
          analytics.total_value > 999999 ? 'min-w-[250px]' :
          analytics.total_value > 99999 ? 'min-w-[220px]' :
          analytics.total_value > 9999 ? 'min-w-[200px]' : 'min-w-[180px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-500 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Total Declared Value</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">${analytics.total_value.toLocaleString()}</p>
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
            <div className="p-3 rounded-lg bg-green-500 flex-shrink-0">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Total Records</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">{analytics.total_records.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Unique Carriers - Compact for small numbers */}
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

        {/* Arrival Ports - Compact for small numbers */}
        <div className="card p-6 flex-shrink-0 min-w-[120px]">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-orange-500 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Ports</p>
              <p className="text-xl font-bold text-gray-900 leading-none">{analytics.unique_ports}</p>
            </div>
          </div>
        </div>

        {/* Average Value - Dynamic width for currency */}
        <div className={`card p-6 flex-shrink-0 ${
          analytics.average_value > 9999999 ? 'min-w-[240px]' :
          analytics.average_value > 999999 ? 'min-w-[220px]' :
          analytics.average_value > 99999 ? 'min-w-[200px]' :
          analytics.average_value > 9999 ? 'min-w-[180px]' : 'min-w-[160px]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-teal-500 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 leading-tight mb-1">Average Value</p>
              <p className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">${analytics.average_value.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by tracking number, flight number, or carrier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cathay-teal focus:border-transparent"
            >
              <option value="">All Carriers</option>
              {uniqueCarriers.map(carrier => (
                <option key={carrier} value={carrier}>{carrier}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">CBP Shipment Details</h3>
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} shipments
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flight/Trip Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrival Port Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrival Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Declared Value (USD)
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
                    <div className="text-sm font-medium text-gray-900">{item.carrierCode || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.flightTripNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{item.trackingNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.arrivalPortCode || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{item.arrivalDate || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.declaredValue ? (
                        typeof item.declaredValue === 'string' 
                          ? item.declaredValue.startsWith('$') ? item.declaredValue : `$${item.declaredValue}`
                          : `$${item.declaredValue}`
                      ) : 'N/A'}
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

export default CBPSection;