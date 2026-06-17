// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/ui/Loader';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
