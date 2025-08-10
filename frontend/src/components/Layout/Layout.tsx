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
      {/* Clean Cathay Pacific Header */}
      <header className="sticky top-0 z-50 w-full bg-white/98 backdrop-blur-xl border-b border-emerald-100/60 shadow-sm">
        <div className="cathay-container">
          {/* Desktop Header */}
          <div className="hidden lg:flex h-16 items-center justify-between">
            {/* Logo and Brand - Simplified */}
            <div className="flex items-center space-x-6">
              <img 
                src="/favicon.ico" 
                alt="Cathay Pacific" 
                className="h-8 w-auto"
              />
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-emerald-600" />
                <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                  Cargo Mail System
                </h1>
              </div>
            </div>
            
            {/* Clean Navigation */}
            <nav className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-emerald-700 bg-emerald-50 shadow-sm'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Mobile Header - Simplified */}
          <div className="lg:hidden flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <img 
                src="/favicon.ico" 
                alt="Cathay Pacific" 
                className="h-6 w-auto"
              />
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-emerald-600" />
                <h1 className="text-lg font-semibold text-slate-800">Cargo Mail</h1>
              </div>
            </div>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Navigation Menu - Clean */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-emerald-100/60 py-3 bg-white/95">
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
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

      {/* Minimal Footer */}
      <footer className="border-t border-slate-100 py-6">
        <div className="cathay-container">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <img 
                src="/favicon.ico" 
                alt="Cathay Pacific" 
                className="h-5 w-auto opacity-60"
              />
              <span className="text-sm text-slate-500">
                © 2025 Cathay Pacific Airways Limited
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;