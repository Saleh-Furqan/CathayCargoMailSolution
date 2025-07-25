import React from 'react';
import {
  Package,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar,
  Plane,
  CheckCircle,
  Clock,
  Scale,
  GitMerge,
  Receipt,
} from 'lucide-react';
import { DashboardStats } from '../types';

const Dashboard: React.FC = () => {
  // Mock data - in real app, this would come from API
  const stats: DashboardStats = {
    total_packages: 15847,
    total_tariff_amount: 856420.75,
    packages_this_month: 3256,
    pending_cbp_reports: 2,
    overdue_invoices: 1,
    unmatched_shipments: 45,
    recent_activity: [
      {
        id: '1',
        type: 'file_upload',
        description: 'CARDIT data file uploaded - 450 packages processed',
        timestamp: '2025-01-22T10:30:00Z',
        status: 'success'
      },
      {
        id: '2',
        type: 'data_processing',
        description: 'AWB Master data merged with CARDIT successfully',
        timestamp: '2025-01-22T09:15:00Z',
        status: 'success'
      },
      {
        id: '3',
        type: 'report_generation',
        description: 'CBP quarterly report generated',
        timestamp: '2025-01-21T16:45:00Z',
        status: 'success'
      },
      {
        id: '4',
        type: 'invoice_creation',
        description: 'China Post invoice created - $24,567.80',
        timestamp: '2025-01-21T14:20:00Z',
        status: 'info'
      }
    ],
    tariff_by_origin: {
      'China': 512300.45,
      'Hong Kong': 344120.30
    },
    monthly_trends: [
      { month: 'Oct 2024', packages: 2800, tariff_amount: 156000, growth_rate: 5.2 },
      { month: 'Nov 2024', packages: 3100, tariff_amount: 172000, growth_rate: 10.7 },
      { month: 'Dec 2024', packages: 2950, tariff_amount: 164000, growth_rate: -4.8 },
      { month: 'Jan 2025', packages: 3256, tariff_amount: 181000, growth_rate: 10.4 }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'file_upload':
        return <Package className="h-4 w-4" />;
      case 'data_processing':
        return <GitMerge className="h-4 w-4" />;
      case 'report_generation':
        return <FileText className="h-4 w-4" />;
      case 'invoice_creation':
        return <Receipt className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cathay-teal/10 via-cathay-navy/5 to-cathay-teal/10 rounded-2xl blur-3xl"></div>
        <div className="relative card p-8 border-0 bg-gradient-to-r from-white/90 via-white/95 to-white/90">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-cathay-teal to-cathay-navy rounded-lg">
                  <Plane className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold gradient-text">Dashboard</h1>
              </div>
              <p className="text-lg text-cathay-grey-600">
                US Tariff Management System Overview
              </p>
              <div className="flex items-center space-x-4 text-sm text-cathay-grey-500">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Data</span>
                </span>
                <span>•</span>
                <span>Last updated: 2 minutes ago</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="btn-outline px-6 py-3 nav-item">
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 Days
              </button>
              <button className="btn-primary px-6 py-3">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card pulse-glow">
          <div className="flex items-center justify-center mb-4">
            <div className="icon-container p-4 bg-gradient-to-r from-cathay-teal via-cathay-teal-600 to-cathay-teal-dark rounded-full shadow-xl">
              <Package className="h-10 w-10 text-white relative z-10" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-cathay-grey-600 uppercase tracking-wider">Total Packages</p>
            <h3 className="text-4xl font-bold gradient-text">
              {stats.total_packages.toLocaleString()}
            </h3>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              +{stats.packages_this_month.toLocaleString()} this month
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-center mb-4">
            <div className="icon-container p-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full shadow-xl">
              <DollarSign className="h-10 w-10 text-white relative z-10" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-cathay-grey-600 uppercase tracking-wider">Total Tariff Amount</p>
            <h3 className="text-4xl font-bold gradient-text">
              {formatCurrency(stats.total_tariff_amount)}
            </h3>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
              <TrendingUp className="h-3 w-3 mr-2 animate-bounce" />
              +10.4% from last month
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-center mb-4">
            <div className="icon-container p-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-xl">
              <FileText className="h-10 w-10 text-white relative z-10" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-cathay-grey-600 uppercase tracking-wider">Pending CBP Reports</p>
            <h3 className="text-4xl font-bold gradient-text">
              {stats.pending_cbp_reports}
            </h3>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 shadow-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              Ready for submission
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-center mb-4">
            <div className="icon-container p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full shadow-xl">
              <Scale className="h-10 w-10 text-white relative z-10" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-cathay-grey-600 uppercase tracking-wider">Unmatched Shipments</p>
            <h3 className="text-4xl font-bold gradient-text">
              {stats.unmatched_shipments}
            </h3>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 shadow-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
              Requires reconciliation
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cathay-teal via-cathay-navy to-cathay-teal"></div>
          <div className="px-6 py-5 border-b border-cathay-grey-200/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cathay-teal to-cathay-navy rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold gradient-text">Recent Activity</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flow-root">
              <ul className="-my-4 space-y-4">
                {stats.recent_activity.map((activity, index) => (
                  <li key={activity.id} className={`py-4 transform transition-all duration-500 hover:scale-[1.02] hover:bg-gradient-to-r hover:from-cathay-teal/5 hover:to-transparent rounded-lg hover:shadow-md`} style={{animationDelay: `${index * 100}ms`}}>
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-lg ${getStatusColor(activity.status)} relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative z-10">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 ml-4">
                        <div className="text-sm font-medium text-cathay-navy mb-1">
                          {activity.description}
                        </div>
                        <div className="flex items-center text-xs text-cathay-grey-500">
                          <div className="w-1 h-1 bg-cathay-teal rounded-full mr-2 animate-pulse"></div>
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tariff by Origin */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tariff by Origin</h3>
              <Plane className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(stats.tariff_by_origin).map(([origin, amount]) => (
                <div key={origin} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-cathay-teal rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">{origin}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {((amount / stats.total_tariff_amount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-cathay-teal hover:bg-cathay-teal/5 transition-colors group">
              <Package className="h-8 w-8 text-gray-400 group-hover:text-cathay-teal mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-cathay-teal">
                Upload CARDIT Data
              </span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-cathay-teal hover:bg-cathay-teal/5 transition-colors group">
              <GitMerge className="h-8 w-8 text-gray-400 group-hover:text-cathay-teal mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-cathay-teal">
                Consolidate Data
              </span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-cathay-teal hover:bg-cathay-teal/5 transition-colors group">
              <FileText className="h-8 w-8 text-gray-400 group-hover:text-cathay-teal mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-cathay-teal">
                Generate CBP Report
              </span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-cathay-teal hover:bg-cathay-teal/5 transition-colors group">
              <Scale className="h-8 w-8 text-gray-400 group-hover:text-cathay-teal mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-cathay-teal">
                Reconcile Shipments
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Data Processing</p>
                <p className="text-xs text-gray-500">All systems operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">CBP Connection</p>
                <p className="text-xs text-gray-500">Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">China Post API</p>
                <p className="text-xs text-gray-500">Limited connectivity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
