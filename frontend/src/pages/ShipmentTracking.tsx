import React from 'react';

const ShipmentTracking: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shipment Tracking</h1>
        <p className="mt-1 text-gray-600">
          Track packages through the entire mail processing workflow
        </p>
      </div>
      
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Shipment Tracking Module</h3>
        <p className="text-gray-600">
          Real-time tracking of packages from acceptance to delivery with status updates.
        </p>
      </div>
    </div>
  );
};

export default ShipmentTracking;
