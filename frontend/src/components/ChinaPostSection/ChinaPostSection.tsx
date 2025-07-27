import React, { useState } from 'react';
import {
  Download,
  Eye,
  Search,
  DollarSign,
  Package,
  Plane,
  TrendingUp,
} from 'lucide-react';

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
  const itemsPerPage = 10;

  // Extract China Post-specific data
  const chinaPostData = data.map(item => ({
    awbNumber: item['*运单号 (AWB Number)'],
    departureStation: item['*始发站（Departure station）'],
    destination: item['*目的站（Destination）'],
    pieces: item['*件数(Pieces)'],
    weight: item['*重量 (Weight)'],
    airline: item['航司(Airline)'],
    flightNumber: item['航班号 (Flight Number)'],
    flightDate: item['航班日期 (Flight Date)'],
    totalMailItems: item['一个航班的邮件item总数 (Total mail items per flight)'],
    totalMailWeight: item['一个航班的邮件总重量 (Total mail weight per flight)'],
    rateType: item['*运价类型 (Rate Type)'],
    rate: item['*费率 (Rate)'],
    airFreight: item['*航空运费 (Air Freight)'],
    agentCharges: item['代理人的其他费用 (Agent\'s Other Charges)'],
    carrierCharges: item['承运人的其他费用 (Carrier\'s Other Charges)'],
    totalCharges: item['*总运费 (Total Charges)'],
  }));

  // Filter data
  const filteredData = chinaPostData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.awbNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.airline?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAirline = !selectedAirline || item.airline === selectedAirline;
    const matchesDestination = !selectedDestination || item.destination === selectedDestination;
    
    return matchesSearch && matchesAirline && matchesDestination;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Analytics
  const analytics = React.useMemo(() => {
    const totalWeight = chinaPostData.reduce((sum, item) => sum + (item.weight || 0), 0);
    const totalCharges = chinaPostData.reduce((sum, item) => sum + (item.totalCharges || 0), 0);
    const totalPieces = chinaPostData.reduce((sum, item) => sum + (item.pieces || 0), 0);
    const totalAirFreight = chinaPostData.reduce((sum, item) => sum + (item.airFreight || 0), 0);

    const uniqueAirlines = new Set(chinaPostData.map(item => item.airline)).size;
    const uniqueDestinations = new Set(chinaPostData.map(item => item.destination)).size;
    const uniqueFlights = new Set(chinaPostData.map(item => item.flightNumber)).size;

    // Group by rate type
    const rateTypeBreakdown = chinaPostData.reduce((acc, item) => {
      const rateType = item.rateType || 'Unknown';
      if (!acc[rateType]) {
        acc[rateType] = { count: 0, totalCharges: 0 };
      }
      acc[rateType].count += 1;
      acc[rateType].totalCharges += item.totalCharges || 0;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalPieces,
      totalAirFreight: Math.round(totalAirFreight * 100) / 100,
      uniqueAirlines,
      uniqueDestinations,
      uniqueFlights,
      averageWeight: Math.round((totalWeight / chinaPostData.length) * 100) / 100,
      averageCharges: Math.round((totalCharges / chinaPostData.length) * 100) / 100,
      rateTypeBreakdown,
    };
  }, [chinaPostData]);

  const uniqueAirlines = [...new Set(chinaPostData.map(item => item.airline))].filter(Boolean);
  const uniqueDestinations = [...new Set(chinaPostData.map(item => item.destination))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">China Post Section</h2>
          <p className="text-gray-600">China Post data source file information</p>
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
            <span>Download China Post File</span>
          </button>
        </div>
      </div>

      {!isAvailable && (
        <div className="card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">China Post Data Not Available</h3>
              <p className="text-sm text-yellow-700">
                The uploaded data doesn't contain all required China Post columns. Please ensure your data includes AWB numbers, stations, weights, rates, and all required Chinese fields.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-500">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Weight</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalWeight.toLocaleString()} kg</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Charges</p>
              <p className="text-2xl font-bold text-gray-900">${analytics.totalCharges.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pieces</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalPieces.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Airlines</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.uniqueAirlines}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Air Freight</p>
              <p className="text-2xl font-bold text-gray-900">${analytics.totalAirFreight.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Type Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Type Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analytics.rateTypeBreakdown).map(([rateType, data]: [string, any]) => (
            <div key={rateType} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">{rateType}</h4>
              <p className="text-sm text-gray-600">{data.count} shipments</p>
              <p className="text-sm font-medium text-gray-900">${data.totalCharges.toFixed(2)} total</p>
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
                placeholder="Search by AWB number, flight number, or airline..."
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
              <option value="">All Airlines</option>
              {uniqueAirlines.map(airline => (
                <option key={airline} value={airline}>{airline}</option>
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
          <h3 className="text-lg font-semibold text-gray-900">China Post Shipment Details</h3>
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} shipments
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AWB & Flight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight & Pieces
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges
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
                      <div className="text-sm font-medium text-gray-900">{item.awbNumber}</div>
                      <div className="text-sm text-gray-500">{item.flightNumber} - {item.airline}</div>
                      <div className="text-sm text-gray-400">{item.flightDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.departureStation} → {item.destination}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.weight} kg</div>
                      <div className="text-sm text-gray-500">{item.pieces} pieces</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.rateType}</div>
                      <div className="text-sm text-gray-500">Rate: {item.rate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">${item.totalCharges}</div>
                      <div className="text-sm text-gray-500">Freight: ${item.airFreight}</div>
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