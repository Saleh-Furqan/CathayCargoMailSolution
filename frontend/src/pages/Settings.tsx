import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Configure system settings and tariff parameters
        </p>
      </div>
      
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">System Configuration</h3>
        <p className="text-gray-600">
          Manage tariff rates, data processing settings, and integration configurations.
        </p>
      </div>
    </div>
  );
};

export default Settings;
