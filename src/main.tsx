import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Define o basename dinamicamente com base no modo do Vite.
// Em desenvolvimento, o base é '/'. Em produção, é o nome do repositório.
const basename = import.meta.env.MODE === 'development' ? '/' : '/seasonal-tune-planner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)