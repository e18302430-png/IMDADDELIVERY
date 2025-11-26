
import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedKind?: 'staff' | 'delegate'; // Optional: restrict to specific user type
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedKind }) => {
  const isAuth = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  if (!isAuth || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedKind && currentUser.kind !== allowedKind) {
    // Redirect unauthorized access based on their actual role
    if (currentUser.kind === 'staff') return <Navigate to="/dashboard" replace />;
    if (currentUser.kind === 'delegate') return <Navigate to="/delegate" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
