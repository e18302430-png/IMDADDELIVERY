
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllDelegates from './pages/AllDelegates';
import DelegateHome from './pages/DelegateHome';
import ProtectedRoute from './components/ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Staff Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedKind="staff">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegates"
          element={
            <ProtectedRoute allowedKind="staff">
              <AllDelegates />
            </ProtectedRoute>
          }
        />

        {/* Protected Delegate Route */}
        <Route
          path="/delegate"
          element={
            <ProtectedRoute allowedKind="delegate">
              <DelegateHome />
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};
