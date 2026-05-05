import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import OrdenNueva from './pages/OrdenNueva'
import OrdenDetalle from './pages/OrdenDetalle'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'

function RutaProtegida({ children }) {
  const { autenticado } = useAuth()
  return autenticado ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
          <Route path="/ordenes" element={<RutaProtegida><Ordenes /></RutaProtegida>} />
          <Route path="/ordenes/nueva" element={<RutaProtegida><OrdenNueva /></RutaProtegida>} />
          <Route path="/ordenes/:id" element={<RutaProtegida><OrdenDetalle /></RutaProtegida>} />
          <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
          <Route path="/clientes/:id" element={<RutaProtegida><ClienteDetalle /></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
