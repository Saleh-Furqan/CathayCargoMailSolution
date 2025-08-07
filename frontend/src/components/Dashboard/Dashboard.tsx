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

const Dashboard: React.FC<DashboardProps> = ({ data, processResult }) => {
  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (!data.length) return null;

    const totalPackages = data.reduce((sum, item) => sum + (item['*件数(Pieces)'] || 0), 0);
    const totalWeight = data.reduce((sum, item) => sum + (item['*重量 (Weight)'] || 0), 0);
    const totalCharges = data.reduce((sum, item) => sum + (item['*总运费 (Total Charges)'] || 0), 0);
    const totalDeclaredValue = data.reduce((sum, item) => {
      const value = item['Declared Value (USD)'];
      if (typeof value === 'string') {
        return sum + parseFloat(value.replace('$', '').replace(',', '')) || 0;
      }
      return sum + (value || 0);
    }, 0);

    // Group by airline
    const airlineData = data.reduce((acc, item) => {
      const airline = item['航司(Airline)'] || 'Unknown';
      if (!acc[airline]) {
        acc[airline] = { name: airline, packages: 0, weight: 0, charges: 0 };
      }
      acc[airline].packages += item['*件数(Pieces)'] || 0;
      acc[airline].weight += item['*重量 (Weight)'] || 0;
      acc[airline].charges += item['*总运费 (Total Charges)'] || 0;
      return acc;
    }, {} as Record<string, any>);

    // Group by destination
    const destinationData = data.reduce((acc, item) => {
      const dest = item['*目的站（Destination）'] || 'Unknown';
      if (!acc[dest]) {
        acc[dest] = { name: dest, packages: 0, weight: 0, value: 0, totalRate: 0, count: 0 };
      }
      acc[dest].packages += item['*件数(Pieces)'] || 0;
      acc[dest].weight += item['*重量 (Weight)'] || 0;
      acc[dest].totalRate += item['*费率 (Rate)'] || 0;
      acc[dest].count += 1;
      const declaredValue = item['Declared Value (USD)'];
      if (typeof declaredValue === 'string') {
        acc[dest].value += parseFloat(declaredValue.replace('$', '').replace(',', '')) || 0;
      } else {
        acc[dest].value += declaredValue || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate average rates for destinations
    const destinationDataWithAvg = Object.values(destinationData).map((dest: any) => ({
      ...dest,
      avgRate: dest.count > 0 ? Math.round((dest.totalRate / dest.count) * 100) / 100 : 0
    }));

    // Group by rate type
    const rateTypeData = data.reduce((acc, item) => {
      const rateType = item['*运价类型 (Rate Type)'] || 'Unknown';
      if (!acc[rateType]) {
        acc[rateType] = { name: rateType, count: 0, value: 0 };
      }
      acc[rateType].count += 1;
      acc[rateType].value += item['*总运费 (Total Charges)'] || 0;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalPackages,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalDeclaredValue: Math.round(totalDeclaredValue * 100) / 100,
      averageWeight: Math.round((totalWeight / data.length) * 100) / 100,
      averageValue: Math.round((totalDeclaredValue / data.length) * 100) / 100,
      airlineData: Object.values(airlineData),
      destinationData: destinationDataWithAvg,
      rateTypeData: Object.values(rateTypeData),
      uniqueCarriers: new Set(data.map(item => item['Carrier Code'])).size,
      uniqueDestinations: new Set(data.map(item => item['*目的站（Destination）'])).size,
    };
  }, [data]);

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
          title="Total Packages"
          value={analytics.totalPackages.toLocaleString()}
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
          title="Total Charges"
          value={`$${analytics.totalCharges.toLocaleString()}`}
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
          title="Average Package Weight"
          value={`${analytics.averageWeight} kg`}
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
                (processResult.results.china_post?.available || processResult.results.internal_use?.available) ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {(processResult.results.china_post?.available || processResult.results.internal_use?.available) ? 
                  <CheckCircle className="h-5 w-5 text-white" /> :
                  <AlertTriangle className="h-5 w-5 text-white" />
                }
              </div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">China Post Processing</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Status: <span className={`font-semibold ${
                  (processResult.results.china_post?.available || processResult.results.internal_use?.available) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(processResult.results.china_post?.available || processResult.results.internal_use?.available) ? 'Ready' : 'Not Available'}
                </span>
              </p>
              {(processResult.results.china_post?.records_processed || processResult.results.internal_use?.records_processed) && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Records: <span className="font-semibold text-gray-900">{processResult.results.china_post?.records_processed || processResult.results.internal_use?.records_processed}</span>
                </p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                processResult.results.cbp?.available ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {processResult.results.cbp?.available ? 
                  <CheckCircle className="h-5 w-5 text-white" /> :
                  <AlertTriangle className="h-5 w-5 text-white" />
                }
              </div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">CBP Processing</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Status: <span className={`font-semibold ${
                  processResult.results.cbp?.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {processResult.results.cbp?.available ? 'Ready' : 'Not Available'}
                </span>
              </p>
              {processResult.results.cbp?.records_processed && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Records: <span className="font-semibold text-gray-900">{processResult.results.cbp.records_processed}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Revenue by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.destinationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Package Distribution by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Package Distribution by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.destinationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, packages }) => `${name}: ${packages}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="packages"
              >
                {analytics.destinationData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Average Tariff Rate by Destination */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Average Tariff Rate by Destination</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.destinationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}/kg`, 'Avg Rate']} />
              <Bar dataKey="avgRate" fill="#10B981" />
            </BarChart>
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
      </div>

      {/* Tariff Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Revenue vs Weight Efficiency by Destination</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.destinationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="value" fill="#3B82F6" name="Revenue ($)" />
            <Bar yAxisId="right" dataKey="avgRate" fill="#F59E0B" name="Rate ($/kg)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;