import React, { useState } from 'react';
import { Mail, Upload, Clock, Calculator, BarChart3, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Analytics', path: '/', icon: BarChart3 },
    { name: 'Data Processing', path: '/data-processing', icon: Upload },
    { name: 'Historical Data', path: '/historical-data', icon: Clock },
    { name: 'Tariff Management', path: '/tariff-management', icon: Calculator },
  ];

  return (
    <div className="min-h-screen">
      {/* Modern Cathay Pacific Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="cathay-container">
          {/* Desktop Header */}
          <div className="hidden lg:flex h-20 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                <img 
                  src="/cathay-logo.svg" 
                  alt="Cathay Pacific" 
                  className="h-10 w-auto"
                />
                <div className="hidden xl:block h-8 w-px bg-slate-200"></div>
                <div className="hidden xl:block">
                  <h1 className="cathay-header text-2xl">
                    Mail Solution
                  </h1>
                  <p className="cathay-subheader text-sm">
                    US Tariff Compliance System
                  </p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`cathay-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Status and Version */}
            <div className="flex items-center space-x-4">
              <div className="cathay-badge cathay-badge-success">
                Production Ready
              </div>
              <div className="hidden xl:block text-right">
                <div className="text-xs text-slate-500 font-medium">
                  v2.0.0 | Enhanced
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/cathay-logo.svg" 
                alt="Cathay Pacific" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="cathay-header text-lg">Mail Solution</h1>
                <div className="cathay-badge cathay-badge-success text-xs">Ready</div>
              </div>
            </div>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="cathay-btn-outline p-2"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200/60 py-4 cathay-fade-in">
              <nav className="grid grid-cols-2 gap-3">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`cathay-nav-item ${isActive ? 'active' : ''} justify-center text-center flex-col space-x-0 space-y-1`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="cathay-section">
        <div className="cathay-container">
          <div className="cathay-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50/80 border-t border-slate-200/60 py-8">
        <div className="cathay-container">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <img 
                src="/cathay-logo.svg" 
                alt="Cathay Pacific" 
                className="h-6 w-auto opacity-60"
              />
              <div className="text-sm text-slate-600">
                © 2025 Cathay Pacific Airways Limited. All rights reserved.
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Enhanced Tariff Management System
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;