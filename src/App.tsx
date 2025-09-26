import './App.css';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WeeklyExpirationPage from './pages/WeeklyExpiration';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/validade-semanal" element={<WeeklyExpirationPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
