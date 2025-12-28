import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectReport from './pages/ProjectReport';
import Home from './pages/Home';
import ArchivedWorks from './pages/ArchivedWorks';
import CreateWork from './pages/CreateWork';
import ManageLevels from './pages/ManageLevels';
import Equipa from './pages/Equipa';
import Planeamento from './pages/Planeamento';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/obras" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="report/:id" element={<ProjectReport />} />
          <Route path="obras" element={<Home />} />
          <Route path="archived" element={<ArchivedWorks />} />
          <Route path="create" element={<CreateWork />} />
          <Route path="works/:id/levels" element={<ManageLevels />} />
          <Route path="works/:id/equipa" element={<Equipa />} />
          <Route path="works/:id/planeamento" element={<Planeamento />} />
          <Route path="users" element={<div style={{padding: '32px'}}><h1>👥 Gerir Utilizadores</h1><p>Em breve: criar e editar utilizadores</p></div>} />
          <Route path="permissions" element={<div style={{padding: '32px'}}><h1>🔐 Permissões e Controlo de Acesso</h1><p>Em breve: gestão de permissões</p></div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
