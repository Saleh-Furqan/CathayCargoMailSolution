import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DataIngestion from './pages/DataIngestion';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DataIngestion />} />
        <Route path="/data-processing" element={<DataIngestion />} />
      </Routes>
    </Layout>
  );
}

export default App;
