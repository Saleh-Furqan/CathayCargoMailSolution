import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  GitMerge,
  Package,
  Calculator,
  FileText,
  Receipt,
  Scale,
  Settings,
  Menu,
  X,
  Plane,
  Mail,
  Bell,
  User,
  ChevronDown,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Data Ingestion', href: '/data-ingestion', icon: Upload },
    { name: 'Data Consolidation', href: '/consolidation', icon: GitMerge },
    { name: 'Shipment Tracking', href: '/tracking', icon: Package },
    { name: 'Tariff Calculation', href: '/tariff-calculation', icon: Calculator },
    { name: 'CBP Reporting', href: '/cbp-reporting', icon: FileText },
    { name: 'China Post Invoicing', href: '/china-post-invoicing', icon: Receipt },
    { name: 'Reconciliation', href: '/reconciliation', icon: Scale },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`} 
          onClick={() => setSidebarOpen(false)} 
        />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-cathay-teal to-cathay-teal-700 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <SidebarContent navigation={navigation} isActive={isActive} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 lg:mx-auto lg:max-w-7xl lg:px-8">
          <div className="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 lg:hidden" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="relative flex flex-1 items-center">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 lg:hidden">
                    <Plane className="h-8 w-8 text-cathay-teal" />
                    <Mail className="h-6 w-6 text-cathay-navy" />
                  </div>
                  <div className="lg:hidden">
                    <h1 className="text-lg font-bold text-gray-900">US Tariff Management</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Notifications */}
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                >
                  <Bell className="h-6 w-6" />
                </button>

                {/* Separator */}
                <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    className="-m-1.5 flex items-center p-1.5"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-cathay-teal rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <span className="hidden lg:flex lg:items-center">
                        <span className="ml-4 text-sm font-semibold leading-6 text-gray-900">
                          Cargo Operations
                        </span>
                        <ChevronDown className="ml-2 h-5 w-5 text-gray-400" />
                      </span>
                    </div>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                      <a href="#" className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50">
                        Profile
                      </a>
                      <a href="#" className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50">
                        Sign out
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

interface SidebarContentProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<any>;
  }>;
  isActive: (path: string) => boolean;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navigation, isActive }) => {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-cathay-teal to-cathay-teal-700 px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Plane className="h-8 w-8 text-white" />
            <Mail className="h-6 w-6 text-white/90" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">Cathay Cargo</h2>
            <p className="text-white/80 text-xs">US Tariff Management</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={
                        isActive(item.href)
                          ? 'nav-link-active'
                          : 'nav-link-inactive'
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <div className="text-xs text-gray-400">
              <p>Version 1.0.0</p>
              <p>© 2025 Cathay Pacific</p>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Layout;
