import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LiveMonitorPage from './pages/LiveMonitorPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import useProtocolConnection from './hooks/useProtocolConnection.js';

import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import useAuthStore from './stores/useAuthStore.js';

function AppContent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Master connection lifecycle — conditionally mounts connection within the hook
  useProtocolConnection(isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/live" element={<LiveMonitorPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
