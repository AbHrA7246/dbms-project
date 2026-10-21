import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const CentreAuthContext = createContext(null);

export function CentreAuthProvider({ children }) {
  const [centreSession, setCentreSession] = useState(() => {
    try {
      const saved = localStorage.getItem('ecocycle_centre_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.centreId) {
          const centreExists = storageService.getCentreById(parsed.centreId);
          if (centreExists) {
            return parsed;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [centresList, setCentresList] = useState(() => storageService.getCentres());

  useEffect(() => {
    try {
      if (centreSession) {
        localStorage.setItem('ecocycle_centre_session', JSON.stringify(centreSession));
      } else {
        localStorage.removeItem('ecocycle_centre_session');
      }
    } catch (e) {
      console.error('Failed to sync centre session', e);
    }
  }, [centreSession]);

  // Listen to cross-component or cross-tab storage updates
  useEffect(() => {
    const handleStorageChange = () => {
      const list = storageService.getCentres();
      setCentresList(list);

      // If current active session points to a non-existent centre, clear it
      setCentreSession((prev) => {
        if (!prev) return null;
        const exists = list.some((c) => c.id === prev.centreId);
        return exists ? prev : null;
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ecocycle_storage_update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ecocycle_storage_update', handleStorageChange);
    };
  }, []);

  const loginCentre = (emailOrId, password) => {
    if (!emailOrId) {
      throw new Error('Please select or enter your recycling facility.');
    }

    let centre = null;
    if (emailOrId.includes('@')) {
      centre = storageService.authenticateCentre(emailOrId, password);
    } else {
      centre = storageService.getCentreById(emailOrId);
      if (!centre) {
        throw new Error('Selected recycling facility was not found.');
      }
      if (centre.password && centre.password !== password) {
        throw new Error('Invalid password for this facility account.');
      }
    }

    const newSession = {
      centreId: centre.id,
      centreName: centre.name,
      staffName: centre.staffName || 'Facility Operations Manager',
      staffRole: centre.staffRole || 'Operations Lead',
      staffEmail: centre.email,
      loginTime: new Date().toISOString(),
    };

    setCentreSession(newSession);
    return newSession;
  };

  const registerCentre = (centreData) => {
    const newCentre = storageService.registerCentre(centreData);
    const newSession = {
      centreId: newCentre.id,
      centreName: newCentre.name,
      staffName: centreData.staffName || 'Facility Operations Lead',
      staffRole: 'Operations Lead',
      staffEmail: newCentre.email,
      loginTime: new Date().toISOString(),
    };

    setCentreSession(newSession);
    setCentresList(storageService.getCentres());
    return newCentre;
  };

  const logoutCentre = () => {
    setCentreSession(null);
  };

  const updateCentreProfile = (updates) => {
    if (!centreSession?.centreId) throw new Error('Must be logged in to update facility settings.');
    const updated = storageService.updateCentre(centreSession.centreId, updates);
    setCentresList(storageService.getCentres());
    return updated;
  };

  const updatePassword = (currentPassword, newPassword) => {
    if (!centreSession?.centreId) throw new Error('Must be logged in to update facility password.');
    return storageService.updateCentrePassword(centreSession.centreId, currentPassword, newPassword);
  };

  const clearNonEssentialCache = () => {
    if (!centreSession?.centreId) return;
    return storageService.clearNonEssentialCentreCache(centreSession.centreId);
  };

  const hideCentreRequest = (requestId) => {
    if (!centreSession?.centreId) throw new Error('Must be logged in to manage facility requests.');
    return storageService.hideCentreRequest(centreSession.centreId, requestId);
  };

  const hideCentreRequests = (requestIds) => {
    if (!centreSession?.centreId) throw new Error('Must be logged in to manage facility requests.');
    return storageService.hideCentreRequests(centreSession.centreId, requestIds);
  };

  const clearCentreHistory = () => {
    if (!centreSession?.centreId) return [];
    return storageService.clearCentreHistory(centreSession.centreId);
  };

  const restoreCentreRequest = (requestId) => {
    if (!centreSession?.centreId) return;
    return storageService.restoreCentreRequest(centreSession.centreId, requestId);
  };

  const restoreCentreRequests = (requestIds) => {
    if (!centreSession?.centreId) return;
    return storageService.restoreCentreRequests(centreSession.centreId, requestIds);
  };

  const restoreAllCentreHistory = () => {
    if (!centreSession?.centreId) return;
    return storageService.restoreAllCentreHistory(centreSession.centreId);
  };

  const getHiddenCentreRequests = () => {
    if (!centreSession?.centreId) return [];
    return storageService.getHiddenRequestsForCentre(centreSession.centreId);
  };

  const checkDeletionEligibility = () => {
    if (!centreSession?.centreId) {
      return { canDelete: false, reason: 'Must be logged in to verify facility status.', unresolvedRequests: [] };
    }
    return storageService.checkCentreDeletionEligibility(centreSession.centreId);
  };

  const deleteCentreAccount = () => {
    if (!centreSession?.centreId) throw new Error('Must be logged in to delete facility account.');
    const result = storageService.deleteCentreAccount(centreSession.centreId);
    setCentreSession(null);
    setCentresList(storageService.getCentres());
    return result;
  };

  const currentCentre = centreSession
    ? storageService.getCentreById(centreSession.centreId)
    : null;

  return (
    <CentreAuthContext.Provider
      value={{
        centreSession,
        currentCentre,
        centresList,
        isCentreAuthenticated: !!centreSession && !!currentCentre,
        loginCentre,
        registerCentre,
        logoutCentre,
        updateCentreProfile,
        updatePassword,
        clearNonEssentialCache,
        hideCentreRequest,
        hideCentreRequests,
        clearCentreHistory,
        restoreCentreRequest,
        restoreCentreRequests,
        restoreAllCentreHistory,
        getHiddenCentreRequests,
        checkDeletionEligibility,
        deleteCentreAccount,
      }}
    >
      {children}
    </CentreAuthContext.Provider>
  );
}

export function useCentreAuth() {
  const context = useContext(CentreAuthContext);
  if (!context) {
    throw new Error('useCentreAuth must be used within a CentreAuthProvider');
  }
  return context;
}
