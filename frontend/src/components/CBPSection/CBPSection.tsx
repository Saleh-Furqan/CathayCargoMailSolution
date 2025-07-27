import React, { useState } from 'react';
import {
  Download,
  Eye,
  Search,
  DollarSign,
  Package,
  Plane,
  MapPin,
} from 'lucide-react';

interface CBPSectionProps {
  data: any[];
  onDownload: () => void;
  isAvailable: boolean;
}

const CBPSection: React.FC<CBPSectionProps> = ({ data, onDownload, isAvailable }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract CBP-specific data
  const cbpData = data.map(item => ({
    carrierCode: item['Carrier Code'],
    flightTripNumber: item['Flight/ Trip Number'],
    trackingNumber: item['Tracking Number'],
    arrivalPortCode: item['Arrival Port Code'],
    arrivalDate: item['Arrival Date'],
    declaredValue: item['Declared Value (USD)'],
    // Additional fields for context
    awbNumber: item['*运单号 (AWB Number)'],
    origin: item['*始发站（Departure station）'],
    destination: item['*目的站（Destination）'],
    pieces: item['*件数(Pieces)'],
    weight: item['*重量 (Weight)'],
  }));

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

  // Analytics
  const analytics = React.useMemo(() => {
    const totalValue = cbpData.reduce((sum, item) => {
      const value = item.declaredValue;
      if (typeof value === 'string') {
        return sum + (parseFloat(value.replace('$', '').replace(',', '')) || 0);
      }
      return sum + (value || 0);
    }, 0);

    const totalPackages = cbpData.reduce((sum, item) => sum + (item.pieces || 0), 0);
    const uniqueCarriers = new Set(cbpData.map(item => item.carrierCode)).size;
    const uniquePorts = new Set(cbpData.map(item => item.arrivalPortCode)).size;

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalPackages,
      uniqueCarriers,
      uniquePorts,
      averageValue: Math.round((totalValue / cbpData.length) * 100) / 100,
    };
  }, [cbpData]);

  const uniqueCarriers = [...new Set(cbpData.map(item => item.carrierCode))].filter(Boolean);

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

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Declared Value</p>
              <p className="text-2xl font-bold text-gray-900">${analytics.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Packages</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalPackages.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Carriers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.uniqueCarriers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-500">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Arrival Ports</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.uniquePorts}</p>
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
                  Carrier & Flight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrival Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Declared Value
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
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.carrierCode}</div>
                      <div className="text-sm text-gray-500">{item.flightTripNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{item.trackingNumber}</div>
                    <div className="text-sm text-gray-500">{item.awbNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Port {item.arrivalPortCode}</div>
                      <div className="text-sm text-gray-500">{item.arrivalDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.pieces} pieces</div>
                      <div className="text-sm text-gray-500">{item.weight} kg</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {typeof item.declaredValue === 'string' ? item.declaredValue : `$${item.declaredValue}`}
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