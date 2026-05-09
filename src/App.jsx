// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import ProfileSettings from './pages/ProfileSettings';
import NotFound from './pages/NotFound';
import AppLayout from './layouts/AppLayout';
import LeaveRequest from './pages/LeaveRequest';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Routes (Authenticated Users) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<StaffDashboard />} />
              <Route path="/history" element={<AttendanceHistory />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/leave-request" element={<LeaveRequest />} />

              {/* Admin Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0c1520',
            color: '#c8ddf0',
            border: '1px solid #1a2535',
            borderRadius: '12px',
            fontFamily: 'Syne, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#020408' } },
          error: { iconTheme: { primary: '#fb7185', secondary: '#020408' } },
        }}
      />
    </AuthProvider>
  );
}