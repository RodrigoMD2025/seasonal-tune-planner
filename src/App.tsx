import './App.css';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WeeklyExpirationPage from './pages/WeeklyExpiration';
import NotFound from './pages/NotFound';
import { LoginPage } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/validade-semanal"
        element={
          <ProtectedRoute>
            <WeeklyExpirationPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
