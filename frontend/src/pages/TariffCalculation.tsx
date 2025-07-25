import React from 'react';

const TariffCalculation: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tariff Calculation</h1>
        <p className="mt-1 text-gray-600">
          Calculate 54% tariff rates on package declared values
        </p>
      </div>
      
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tariff Calculation Engine</h3>
        <p className="text-gray-600">
          Automated calculation of US tariff amounts based on declared values and origin countries.
        </p>
      </div>
    </div>
  );
};

export default TariffCalculation;
