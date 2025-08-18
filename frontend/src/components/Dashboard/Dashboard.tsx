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
  Line,
  ComposedChart,
  Legend,
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
  Activity,
  Target,
  BarChart3,
  Users,
  MapPin,
  Scale,
  Calculator,
} from 'lucide-react';
import { formatDateTime } from '../../utils/displayHelpers';

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
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon, color, subtitle }) => (
  <div className="card p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-gray-600 leading-none">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-none">{subtitle}</p>
        )}
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
  // Fetch analytics from most recent upload only
  const [recentAnalytics, setRecentAnalytics] = React.useState<any>(null);
  
  React.useEffect(() => {
    const fetchRecentAnalytics = async () => {
      try {
        // Get analytics for the most recent upload only (no date filtering)
        const analytics = await fetch('http://localhost:5001/get-analytics-data').then(res => res.json());
        setRecentAnalytics(analytics);
      } catch (error) {
        console.error('Error fetching recent analytics:', error);
      }
    };

    if (data.length > 0) {
      fetchRecentAnalytics();
    }
  }, [data]);

  // Calculate additional KPIs from the analytics data - now using backend-calculated metrics
  const calculateKPIs = (analyticsData: any) => {
    if (!analyticsData || !analyticsData.analytics) return null;
    
    const analytics = analyticsData.analytics;
    const breakdown = analyticsData.breakdown || {};
    
    // Use backend-calculated metrics when available, fallback to frontend calculation
    const averageWeight = analytics.average_weight_per_shipment || (analytics.total_weight > 0 ? analytics.total_weight / analytics.total_shipments : 0);
    const averageValue = analytics.average_value_per_shipment || (analytics.total_declared_value > 0 ? analytics.total_declared_value / analytics.total_shipments : 0);
    const averageTariff = analytics.average_tariff_per_shipment || (analytics.total_tariff > 0 ? analytics.total_tariff / analytics.total_shipments : 0);
    const tariffToValueRatio = analytics.tariff_to_value_ratio || (analytics.total_declared_value > 0 ? (analytics.total_tariff / analytics.total_declared_value) * 100 : 0);
    const revenuePerKg = analytics.revenue_per_kg || (analytics.total_weight > 0 ? analytics.total_tariff / analytics.total_weight : 0);
    const shipmentDensity = analytics.shipment_density || averageWeight;
    
    // Calculate fill rates and utilization
    const destinationData = breakdown.by_destination || [];
    const carrierData = breakdown.by_carrier || [];
    const categoryData = breakdown.by_category || [];
    
    // Top performing routes and carriers
    const topDestination = destinationData.length > 0 ? destinationData.reduce((prev: any, curr: any) => prev.value > curr.value ? prev : curr) : null;
    const topCarrier = carrierData.length > 0 ? carrierData.reduce((prev: any, curr: any) => prev.count > curr.count ? prev : curr) : null;
    
    return {
      averageWeight,
      averageValue,
      averageTariff,
      tariffToValueRatio,
      revenuePerKg,
      shipmentDensity,
      topDestination,
      topCarrier,
      destinationCount: destinationData.length,
      carrierCount: carrierData.length,
      categoryCount: categoryData.length,
    };
  };

  // Use backend-provided analytics data from most recent upload, with fallback if not available
  const analytics = React.useMemo(() => {
    if (!data.length) return null;

    // If backend analytics from most recent upload available, use it
    if (recentAnalytics && recentAnalytics.analytics) {
      return {
        totalShipments: recentAnalytics.analytics?.total_shipments || 0,
        totalWeight: recentAnalytics.analytics?.total_weight || 0,
        totalDeclaredValue: isNaN(recentAnalytics.analytics?.total_declared_value) ? 0 : (recentAnalytics.analytics?.total_declared_value || 0),
        totalTariff: isNaN(recentAnalytics.analytics?.total_tariff) ? 0 : (recentAnalytics.analytics?.total_tariff || 0),
        uniqueDestinations: recentAnalytics.analytics?.unique_destinations || 0,
        uniqueCarriers: recentAnalytics.analytics?.unique_carriers || 0,
        uniqueReceptacles: recentAnalytics.analytics?.unique_receptacles || 0,
        uniqueCategories: recentAnalytics.analytics?.unique_categories || 0,
        uniqueServices: recentAnalytics.analytics?.unique_services || 0,
        destinationData: (recentAnalytics.breakdown?.by_destination || []).map((item: any) => ({
          ...item,
          value: isNaN(item.value) ? 0 : item.value
        })),
        carrierData: (recentAnalytics.breakdown?.by_carrier || []).map((item: any) => ({
          ...item,
          value: isNaN(item.value) ? 0 : item.value
        })),
        currencyData: recentAnalytics.breakdown?.by_currency || [],
        categoryData: recentAnalytics.breakdown?.by_category || [],
        serviceData: recentAnalytics.breakdown?.by_service || [],
        methodData: recentAnalytics.breakdown?.by_calculation_method || [],
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
      uniqueCategories: 0,
      uniqueServices: 0,
      destinationData: [],
      carrierData: [],
      currencyData: [],
      categoryData: [],
      serviceData: [],
      methodData: [],
    };
  }, [recentAnalytics, data]);

  const kpis = React.useMemo(() => {
    return calculateKPIs(recentAnalytics);
  }, [recentAnalytics]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Logistics Analytics Dashboard</h2>
          <p className="text-gray-600 leading-relaxed">Comprehensive insights and KPIs for cargo operations</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 flex-shrink-0">
          <Clock className="h-4 w-4" />
          <span>Last updated: {formatDateTime(new Date().toISOString()).split(' ')[1]}</span>
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary KPIs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Total Shipments"
            value={analytics.totalShipments.toLocaleString()}
            subtitle="Processed packages"
            icon={Package}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Weight"
            value={`${analytics.totalWeight.toLocaleString()} kg`}
            subtitle="Cargo weight"
            icon={Scale}
            color="bg-green-500"
          />
          <StatCard
            title="Revenue (Tariff)"
            value={`$${analytics.totalTariff.toLocaleString()}`}
            subtitle="Total tariff collected"
            icon={DollarSign}
            color="bg-purple-500"
          />
          <StatCard
            title="Declared Value"
            value={`$${analytics.totalDeclaredValue.toLocaleString()}`}
            subtitle="Total cargo value"
            icon={Target}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Operational KPIs */}
      {kpis && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational KPIs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Avg Weight/Shipment"
              value={`${kpis.averageWeight.toFixed(2)} kg`}
              subtitle="Package density"
              icon={BarChart3}
              color="bg-indigo-500"
            />
            <StatCard
              title="Revenue/kg"
              value={`$${kpis.revenuePerKg.toFixed(2)}`}
              subtitle="Yield per kg"
              icon={TrendingUp}
              color="bg-cyan-500"
            />
            <StatCard
              title="Tariff Rate"
              value={`${kpis.tariffToValueRatio.toFixed(2)}%`}
              subtitle="Tariff to value ratio"
              icon={Calculator}
              color="bg-rose-500"
            />
            <StatCard
              title="Avg Tariff/Shipment"
              value={`$${kpis.averageTariff.toFixed(2)}`}
              subtitle="Revenue per package"
              icon={Activity}
              color="bg-teal-500"
            />
          </div>
        </div>
      )}

      {/* Network KPIs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Coverage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <StatCard
            title="Active Routes"
            value={analytics.uniqueDestinations}
            subtitle="Destinations served"
            icon={Globe}
            color="bg-pink-500"
          />
          <StatCard
            title="Carriers"
            value={analytics.uniqueCarriers}
            subtitle="Partner airlines"
            icon={Plane}
            color="bg-amber-500"
          />
          <StatCard
            title="Receptacles"
            value={analytics.uniqueReceptacles}
            subtitle="Container units"
            icon={Package}
            color="bg-emerald-500"
          />
          <StatCard
            title="Categories"
            value={analytics.uniqueCategories || 0}
            subtitle="Goods types"
            icon={Users}
            color="bg-violet-500"
          />
          <StatCard
            title="Services"
            value={analytics.uniqueServices || 0}
            subtitle="Postal services"
            icon={MapPin}
            color="bg-slate-500"
          />
        </div>
      </div>

      {/* Processing Status */}
      {processResult && processResult.results && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
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
        </div>
      )}

      {/* Enhanced Charts Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenue by Destination */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Revenue by Destination</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.destinationData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weight vs Revenue by Destination */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Weight vs Revenue by Destination</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.destinationData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="weight" fill="#10B981" name="Weight (kg)" />
                <Line yAxisId="right" type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={3} name="Revenue ($)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Carrier Performance */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Carrier Volume</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.carrierData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}`, 'Shipments']} />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Goods Category Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Goods Category Mix</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {analytics.categoryData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Service Type Performance */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">Service Type Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.serviceData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="tariff" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Currency Distribution */}
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
      </div>

      {/* Summary Insights */}
      {kpis && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.topDestination && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Top Revenue Route</p>
                <p className="text-lg font-bold text-blue-900">{kpis.topDestination.name}</p>
                <p className="text-sm text-blue-700">${kpis.topDestination.value.toLocaleString()} revenue</p>
              </div>
            )}
            {kpis.topCarrier && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800">Top Volume Carrier</p>
                <p className="text-lg font-bold text-green-900">{kpis.topCarrier.name}</p>
                <p className="text-sm text-green-700">{kpis.topCarrier.count} shipments</p>
              </div>
            )}
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Network Reach</p>
              <p className="text-lg font-bold text-purple-900">{analytics.uniqueDestinations} destinations</p>
              <p className="text-sm text-purple-700">across {analytics.uniqueCarriers} carriers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
