import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import DataIngestion from './pages/DataIngestion';
import DataConsolidation from './pages/DataConsolidation';
import ShipmentTracking from './pages/ShipmentTracking';
import TariffCalculation from './pages/TariffCalculation';
import CBPReporting from './pages/CBPReporting';
import ChinaPostInvoicing from './pages/ChinaPostInvoicing';
import Reconciliation from './pages/Reconciliation';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/data-ingestion" element={<DataIngestion />} />
        <Route path="/consolidation" element={<DataConsolidation />} />
        <Route path="/tracking" element={<ShipmentTracking />} />
        <Route path="/tariff-calculation" element={<TariffCalculation />} />
        <Route path="/cbp-reporting" element={<CBPReporting />} />
        <Route path="/china-post-invoicing" element={<ChinaPostInvoicing />} />
        <Route path="/reconciliation" element={<Reconciliation />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
