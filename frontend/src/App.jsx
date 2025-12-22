import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateWork from './pages/CreateWork';
import ManageLevels from './pages/ManageLevels';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateWork />} />
        <Route path="/works/:id/levels" element={<ManageLevels />} />
      </Routes>
    </Router>
  );
}

export default App;
