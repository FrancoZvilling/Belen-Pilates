import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

// Layout Components
import BottomNavigation from './components/layout/BottomNavigation';

// Auth Pages
import Login from './pages/auth/Login';

// Alumno Pages
import DashboardAlumno from './pages/alumno/DashboardAlumno';
import TurnosAlumno from './pages/alumno/TurnosAlumno';
import PagosAlumno from './pages/alumno/PagosAlumno';
import PWAInstallPrompt from './components/layout/PWAInstallPrompt';

// Admin Pages
import AsistenciasDiarias from './pages/admin/AsistenciasDiarias';
import CalendarioGlobal from './pages/admin/CalendarioGlobal';
import AltaAlumno from './pages/admin/AltaAlumno';

// Super Admin Pages
import PanelPagos from './pages/superadmin/PanelPagos';
import GestionUsuarios from './pages/superadmin/GestionUsuarios';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  
  return children;
};

// Main Redirect Component
const MainRedirect = () => {
  const { isAuthenticated, role } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (role === 'alumno') return <Navigate to="/alumno/dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin/asistencias" replace />;
  if (role === 'superadmin') return <Navigate to="/admin/asistencias" replace />;
  
  return <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-asistencia rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Conectando...</p>
      </div>
    );
  }

  return (
    <Router>
      <PWAInstallPrompt />
      <div className="min-h-screen bg-gray-50 pb-16">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainRedirect />} />

          {/* Alumno Routes */}
          <Route path="/alumno/dashboard" element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <DashboardAlumno />
            </ProtectedRoute>
          } />
          <Route path="/alumno/turnos" element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <TurnosAlumno />
            </ProtectedRoute>
          } />
          <Route path="/alumno/pagos" element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <PagosAlumno />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/asistencias" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <AsistenciasDiarias />
            </ProtectedRoute>
          } />
          <Route path="/admin/calendario" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <CalendarioGlobal />
            </ProtectedRoute>
          } />
          <Route path="/admin/alta-alumno" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <AltaAlumno />
            </ProtectedRoute>
          } />

          {/* Super Admin Routes */}
          <Route path="/superadmin/pagos" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <PanelPagos />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/usuarios" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <GestionUsuarios />
            </ProtectedRoute>
          } />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Render bottom navigation only if authenticated */}
        {isAuthenticated && <BottomNavigation />}
      </div>
    </Router>
  );
}

export default App;
