import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Package,
  DollarSign,
  Globe,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface DashboardProps {
  data: any[];
  analyticsData: any;
  processResult: any;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon, color }) => (
  <div className="card p-6">
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-gray-600 leading-none">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {change && (
          <p className={`text-sm leading-none ${
            changeType === 'positive' ? 'text-green-600' :
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </p>
        )}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ data, analyticsData, processResult }) => {
  // Use backend-provided analytics data, with fallback if not available
  const analytics = React.useMemo(() => {
    if (!data.length) return null;

    // If backend analytics available, use it
    if (analyticsData && analyticsData.analytics) {
      return {
        totalShipments: analyticsData.analytics?.total_shipments || 0,
        totalWeight: analyticsData.analytics?.total_weight || 0,
        totalDeclaredValue: isNaN(analyticsData.analytics?.total_declared_value) ? 0 : (analyticsData.analytics?.total_declared_value || 0),
        totalTariff: isNaN(analyticsData.analytics?.total_tariff) ? 0 : (analyticsData.analytics?.total_tariff || 0),
        uniqueDestinations: analyticsData.analytics?.unique_destinations || 0,
        uniqueCarriers: analyticsData.analytics?.unique_carriers || 0,
        uniqueReceptacles: analyticsData.analytics?.unique_receptacles || 0,
        destinationData: (analyticsData.breakdown?.by_destination || []).map((item: any) => ({
          ...item,
          value: isNaN(item.value) ? 0 : item.value
        })),
        carrierData: (analyticsData.breakdown?.by_carrier || []).map((item: any) => ({
          ...item,
          value: isNaN(item.value) ? 0 : item.value
        })),
        currencyData: analyticsData.breakdown?.by_currency || [],
      };
    }

    // Minimal fallback: avoid processing frontend data
    console.warn('Dashboard: Backend analytics not available, showing minimal fallback data');
    return {
      totalShipments: data.length,
      totalWeight: 0,
      totalDeclaredValue: 0,
      totalTariff: 0,
      uniqueDestinations: 0,
      uniqueCarriers: 0,
      uniqueReceptacles: 0,
      destinationData: [],
      carrierData: [],
      currencyData: [],
    };
  }, [analyticsData, data]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No data to analyze</h3>
        <p className="text-sm text-gray-500">Upload and process data to see analytics dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Business Analytics Dashboard</h2>
          <p className="text-gray-600 leading-relaxed">Insights from your processed cargo mail data</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 flex-shrink-0">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Shipments"
          value={analytics.totalShipments.toLocaleString()}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Weight (kg)"
          value={analytics.totalWeight.toLocaleString()}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Total Tariff"
          value={`$${analytics.totalTariff.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-500"
        />
        <StatCard
          title="Declared Value"
          value={`$${analytics.totalDeclaredValue.toLocaleString()}`}
          icon={Globe}
          color="bg-orange-500"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Unique Receptacles"
          value={analytics.uniqueReceptacles}
          icon={Package}
          color="bg-indigo-500"
        />
        <StatCard
          title="Unique Destinations"
          value={analytics.uniqueDestinations}
          icon={Globe}
          color="bg-pink-500"
        />
        <StatCard
          title="Carrier Codes"
          value={analytics.uniqueCarriers}
          icon={Plane}
          color="bg-teal-500"
        />
      </div>

      {/* Processing Status */}
      {processResult && processResult.results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                processResult.results.chinapost_export?.available ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {processResult.results.chinapost_export?.available ? 
                  <CheckCircle className="h-5 w-5 text-white" /> :
                  <AlertTriangle className="h-5 w-5 text-white" />
                }
              </div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">CHINAPOST Export</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Status: <span className={`font-semibold ${
                  processResult.results.chinapost_export?.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {processResult.results.chinapost_export?.available ? 'Ready' : 'Not Available'}
                </span>
              </p>
              {processResult.results.chinapost_export?.records_processed && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Records: <span className="font-semibold text-gray-900">{processResult.results.chinapost_export.records_processed}</span>
                </p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                processResult.results.cbd_export?.available ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {processResult.results.cbd_export?.available ? 
                  <CheckCircle className="h-5 w-5 text-white" /> :
                  <AlertTriangle className="h-5 w-5 text-white" />
                }
              </div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">CBD Export</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Status: <span className={`font-semibold ${
                  processResult.results.cbd_export?.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {processResult.results.cbd_export?.available ? 'Ready' : 'Not Available'}
                </span>
              </p>
              {processResult.results.cbd_export?.records_processed && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Records: <span className="font-semibold text-gray-900">{processResult.results.cbd_export.records_processed}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Value by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Value by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.destinationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Shipments Distribution by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Shipments Distribution by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.destinationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.destinationData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weight Distribution by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Weight Distribution by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.destinationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Total Weight']} />
              <Bar dataKey="weight" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Carrier Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Shipments by Carrier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.carrierData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}`, 'Count']} />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Currency Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Currency Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analytics.currencyData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, count }) => `${name}: ${count}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {analytics.currencyData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;