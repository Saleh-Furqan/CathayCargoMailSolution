import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DataIngestionSimple from './pages/DataIngestionSimple';
import HistoricalData from './pages/HistoricalData';
import FileHistory from './pages/FileHistory';
import TariffManagement from './pages/TariffManagement';
import ClassificationManagement from './pages/ClassificationManagement';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DataIngestionSimple />} />
        <Route path="/historical-data" element={<HistoricalData />} />
        <Route path="/file-history" element={<FileHistory />} />
        <Route path="/tariff-management" element={<TariffManagement />} />
        <Route path="/classification-management" element={<ClassificationManagement />} />
      </Routes>
    </Layout>
  );
}

export default App;
