import React from 'react';

const CBPReporting: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CBP Reporting</h1>
        <p className="mt-1 text-gray-600">
          Generate and submit CBP transported package worksheets
        </p>
      </div>
      
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">CBP Report Generation</h3>
        <p className="text-gray-600">
          Generate compliance reports for US Customs and Border Protection submissions.
        </p>
      </div>
    </div>
  );
};

export default CBPReporting;
