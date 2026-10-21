import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCentreAuth } from '../context/CentreAuthContext';

export default function CentreProtectedRoute({ children }) {
  const { isCentreAuthenticated } = useCentreAuth();
  const location = useLocation();

  if (!isCentreAuthenticated) {
    return <Navigate to="/centre/login" state={{ from: location }} replace />;
  }

  return children;
}

