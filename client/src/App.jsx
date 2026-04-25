import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';

// Lazy-loaded pages (code splitting)
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StudentHome = lazy(() => import('./pages/StudentHome'));
const Analytics = lazy(() => import('./pages/Analytics'));

const PageLoader = () => <div className="loading-overlay"><span className="spinner"></span></div>;

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <AdminDashboard /> : <StudentHome />}
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <Analytics /> : <Navigate to="/" />}
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="app-layout">
            <Navbar />
            <AppRoutes />
          </div>
          <Toaster position="top-right" toastOptions={{
            style: { background: '#1a1a2e', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Inter, sans-serif' },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
