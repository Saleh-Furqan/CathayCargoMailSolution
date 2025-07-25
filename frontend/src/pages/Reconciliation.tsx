import React from 'react';

const Reconciliation: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reconciliation</h1>
        <p className="mt-1 text-gray-600">
          Match and reconcile CARDIT data with actual flight records
        </p>
      </div>
      
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Data Reconciliation</h3>
        <p className="text-gray-600">
          Identify discrepancies between planned and actual shipments for accurate reporting.
        </p>
      </div>
    </div>
  );
};

export default Reconciliation;
