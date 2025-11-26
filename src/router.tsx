import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Import Rich UI Pages from root 'pages' directory
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminBoard from '../pages/AdminBoard';
import SuspendedAgents from '../pages/SuspendedAgents';
import OperationsTools from '../pages/OperationsTools';
import Reports from '../pages/Reports';
import MyRequests from '../pages/MyRequests';
import HRDelegateManagement from '../pages/HRDelegateManagement';
import ResignedDelegates from '../pages/ResignedDelegates';
import ComplianceShield from '../pages/ComplianceShield';
import AllDelegates from '../pages/AllDelegates';
import GuidanceAndCirculars from '../pages/GuidanceAndCirculars';
import UserManagement from '../pages/UserManagement';
import SelfPreparation from '../pages/SelfPreparation';
import DelegateApp from '../pages/DelegateApp';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin / Staff Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedKind="staff">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedKind="staff">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-board"
          element={
            <ProtectedRoute allowedKind="staff">
              <AdminBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suspended"
          element={
            <ProtectedRoute allowedKind="staff">
              <SuspendedAgents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations-tools"
          element={
            <ProtectedRoute allowedKind="staff">
              <OperationsTools />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedKind="staff">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute allowedKind="staff">
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr-management"
          element={
            <ProtectedRoute allowedKind="staff">
              <HRDelegateManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute allowedKind="staff">
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-delegates"
          element={
            <ProtectedRoute allowedKind="staff">
              <AllDelegates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resigned-delegates"
          element={
            <ProtectedRoute allowedKind="staff">
              <ResignedDelegates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance-shield"
          element={
            <ProtectedRoute allowedKind="staff">
              <ComplianceShield />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guidance-and-circulars"
          element={
            <ProtectedRoute allowedKind="staff">
              <GuidanceAndCirculars />
            </ProtectedRoute>
          }
        />
        <Route
          path="/self-preparation"
          element={
            <ProtectedRoute allowedKind="staff">
              <SelfPreparation />
            </ProtectedRoute>
          }
        />

        {/* Delegate Routes */}
        <Route
          path="/delegate-app"
          element={
            <ProtectedRoute allowedKind="delegate">
              <DelegateApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delegate"
          element={<Navigate to="/delegate-app" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
