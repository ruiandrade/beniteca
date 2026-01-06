import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectReport from './pages/ProjectReport';
import Home from './pages/Home';
import ArchivedWorks from './pages/ArchivedWorks';
import CreateWork from './pages/CreateWork';
import ManageLevels from './pages/ManageLevels';
import Equipa from './pages/Equipa';
import PlaneamentoGlobal from './pages/PlaneamentoGlobal';
import Presencas from './pages/Presencas';
import Users from './pages/Users';
import Permissions from './pages/Permissions';
import Login from './pages/Login';
import './App.css';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ padding: '32px', textAlign: 'center' }}>A carregar...</div>;
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ padding: '32px', textAlign: 'center' }}>A carregar...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {token && (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/obras" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="report/:id" element={<ProjectReport />} />
            <Route path="obras" element={<Home />} />
            <Route path="planeamento-global" element={<PlaneamentoGlobal />} />
            <Route path="archived" element={<ArchivedWorks />} />
            <Route path="create" element={<CreateWork />} />
            <Route path="works/:id/levels" element={<ManageLevels />} />
            <Route path="works/:id/equipa" element={<Equipa />} />
            <Route path="presencas" element={<Presencas />} />
            <Route path="users" element={<Users />} />
            <Route path="permissions" element={<Permissions />} />
          </Route>
        )}
        <Route path="*" element={<Navigate to={token ? "/obras" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
