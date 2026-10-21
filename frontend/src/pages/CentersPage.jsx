import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CentresDirectory from '../components/CentresDirectory';

/**
 * CentresPage Route Handler
 * 
 * Reuses the shared CentresDirectory component, providing clean navigation
 * back to the user's dashboard (if authenticated) or home overview (if public visitor).
 */
export default function CentersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleReturn = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  return (
    <CentresDirectory
      onReturn={handleReturn}
      returnLabel={isAuthenticated ? 'Return to Dashboard' : 'Return to Home Overview'}
      isCustomer={isAuthenticated}
      emptyMessage="No recycling centres are available yet."
    />
  );
}
