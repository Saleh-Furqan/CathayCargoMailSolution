import React from 'react';
import { Mail, Upload, Clock, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Data Processing', path: '/data-processing', icon: Upload },
    { name: 'Historical Data', path: '/historical-data', icon: Clock },
    { name: 'Tariff Management', path: '/tariff-management', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 w-full">
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Desktop Header */}
            <div className="hidden md:flex h-16 items-center justify-between">
              {/* Logo and Title - Left Side */}
              <div className="flex items-center space-x-6">
                <img 
                  src="/cathay-logo.svg" 
                  alt="Cathay Pacific Logo" 
                  className="h-8 w-auto"
                />
                <div className="flex items-center space-x-4">
                  <Mail className="h-6 w-6 text-cathay-primary-darkcyan" />
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold text-cathay-neutral-darkgrey tracking-tight leading-none">
                      Cargo Mail Solution
                    </h1>
                    <p className="text-sm text-cathay-neutral-darkgreyishblue font-medium leading-none">
                      Template Processing System
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Navigation and Version - Right Side */}
              <div className="flex items-center space-x-6">
                {/* Navigation Links */}
                <nav className="flex items-center space-x-4">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                          isActive
                            ? 'text-cathay-teal bg-cathay-teal/10'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
                
                {/* Version Info */}
                <div className="text-right space-y-1">
                  <p className="text-xs text-cathay-neutral-darkgreyishblue font-medium leading-none">
                    Version 1.0.0
                  </p>
                  <p className="text-xs text-cathay-neutral-darkgreyishblue/70 leading-none">
                    © 2025 Cathay Pacific
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden py-3">
              <div className="flex flex-col space-y-4">
                {/* Mobile Navigation */}
                <nav className="flex flex-wrap gap-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                          isActive
                            ? 'text-cathay-teal bg-cathay-teal/10'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img 
                      src="/cathay-logo.svg" 
                      alt="Cathay Pacific Logo" 
                      className="h-7 w-auto"
                    />
                    <Mail className="h-5 w-5 text-cathay-primary-darkcyan" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-cathay-neutral-darkgreyishblue font-medium leading-none">
                      v1.0.0
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-cathay-neutral-darkgrey tracking-tight leading-tight">
                    Cargo Mail Solution
                  </h1>
                  <p className="text-sm text-cathay-neutral-darkgreyishblue font-medium leading-tight">
                    Template Processing System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl border border-white/30 min-h-[calc(100vh-12rem)] sm:min-h-[calc(100vh-10rem)]">
            <div className="p-6 sm:p-8 lg:p-10">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
