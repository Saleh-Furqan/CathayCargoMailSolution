import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DataIngestion from './pages/DataIngestion';
import HistoricalData from './pages/HistoricalData';
import TariffManagement from './pages/TariffManagement';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DataIngestion />} />
        <Route path="/data-processing" element={<DataIngestion />} />
        <Route path="/historical-data" element={<HistoricalData />} />
        <Route path="/tariff-management" element={<TariffManagement />} />
      </Routes>
    </Layout>
  );
}

export default App;
