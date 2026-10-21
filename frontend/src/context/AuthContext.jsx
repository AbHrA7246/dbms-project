import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecocycle_current_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed?.email) return null;

      // Authoritative verification against ecocycle_users
      const users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
      const normalized = parsed.email.trim().toLowerCase();
      const exists = users.find((u) => u.email && u.email.trim().toLowerCase() === normalized);
      if (!exists) {
        localStorage.removeItem('ecocycle_current_user');
        return null;
      }
      return exists;
    } catch {
      return null;
    }
  });

  // Keep localStorage in sync when user state changes
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('ecocycle_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('ecocycle_current_user');
      }
    } catch (e) {
      console.error('Failed to sync auth state to localStorage', e);
    }
  }, [user]);

  // Invalidate stale customer session if user is deleted in another tab or storage updated
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ecocycle_current_user');
        if (!saved) {
          setUser(null);
          return;
        }
        const parsed = JSON.parse(saved);
        if (!parsed?.email) {
          setUser(null);
          return;
        }
        const users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
        const normalized = parsed.email.trim().toLowerCase();
        const exists = users.find((u) => u.email && u.email.trim().toLowerCase() === normalized);
        if (!exists) {
          localStorage.removeItem('ecocycle_current_user');
          setUser(null);
        } else {
          setUser(exists);
        }
      } catch {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ecocycle_storage_update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ecocycle_storage_update', handleStorageChange);
    };
  }, []);

  // Prototype Sign-in (Simulated client-side auth)
  const login = (email, password) => {
    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    const trimmedEmail = email.trim().toLowerCase();

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
    } catch {
      users = [];
    }

    const existing = users.find((u) => u.email && u.email.trim().toLowerCase() === trimmedEmail);

    if (!existing) {
      throw new Error('No account found with this email address. Please verify your spelling or create an account.');
    }

    if (existing.password && existing.password !== password) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    setUser(existing);
    return existing;
  };

  // Prototype Sign-up
  const signup = ({ name, email, password, userType = 'Individual Resident' }) => {
    if (!name || !email || !password) {
      throw new Error('Please fill in all required fields.');
    }

    const trimmedEmail = email.trim().toLowerCase();

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
    } catch {
      users = [];
    }

    const alreadyExists = users.some((u) => u.email.toLowerCase() === trimmedEmail);
    if (alreadyExists) {
      throw new Error('An account with this email already exists in local browser storage.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: trimmedEmail,
      password: password,
      userType,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('ecocycle_users', JSON.stringify(users));
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    setUser(null);
  };

  const updateUserProfile = (updates) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    try {
      const users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
      const idx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        users[idx] = updated;
        localStorage.setItem('ecocycle_users', JSON.stringify(users));
      }
    } catch (e) {
      console.error(e);
    }
    return updated;
  };

  // Address Book helpers
  const getUserAddresses = () => {
    if (!user) return [];
    return storageService.getUserAddresses(user.email);
  };

  const saveAddress = (addrData) => {
    if (!user) throw new Error('Must be signed in to manage addresses.');
    return storageService.saveUserAddress(user.email, addrData);
  };

  const deleteAddress = (addrId) => {
    if (!user) throw new Error('Must be signed in to manage addresses.');
    return storageService.deleteUserAddress(user.email, addrId);
  };

  const setDefaultAddress = (addrId) => {
    if (!user) throw new Error('Must be signed in to manage addresses.');
    return storageService.setDefaultAddress(user.email, addrId);
  };

  const verifyAddress = (addrId, coords) => {
    if (!user) throw new Error('Must be signed in to manage addresses.');
    return storageService.verifyUserAddress(user.email, addrId, coords);
  };

  // User preferences & security
  const getUserPreferences = () => {
    if (!user) return { appointmentConfirmations: true, statusUpdates: true, cancellationAlerts: true };
    return storageService.getUserPreferences(user.email);
  };

  const saveUserPreferences = (prefs) => {
    if (!user) return;
    return storageService.saveUserPreferences(user.email, prefs);
  };

  const updatePassword = (currentPassword, newPassword) => {
    if (!user) throw new Error('Must be signed in to change password.');
    return storageService.updateUserPassword(user.email, currentPassword, newPassword);
  };

  const clearNonEssentialCache = () => {
    if (!user) return;
    return storageService.clearNonEssentialUserCache(user.email);
  };

  // Requests persistence via isolated storageService
  const getUserRequests = () => {
    if (!user) return [];
    return storageService.getRequests(user.email);
  };

  const addUserRequest = (requestData) => {
    if (!user) throw new Error('Must be signed in to create requests.');
    return storageService.createRequest(user.email, {
      ...requestData,
      customerName: requestData.customerName || user.name || user.email.split('@')[0],
      customerEmail: user.email,
    });
  };

  const updateRequestStatus = (requestId, newStatus, note = '') => {
    if (!user) throw new Error('Must be signed in to update requests.');
    return storageService.updateRequestStatus(user.email, requestId, newStatus, note);
  };

  const updatePickupDetails = (requestId, details) => {
    if (!user) throw new Error('Must be signed in to update pickup details.');
    return storageService.updateRequestPickupDetails(requestId, user.email, details);
  };

  const respondToAppointment = (requestId, responseType, note = '') => {
    if (!user) throw new Error('Must be signed in to respond to appointments.');
    return storageService.respondToAppointment(requestId, user.email, responseType, note);
  };

  const cancelUserRequest = (requestId, reason = '') => {
    if (!user) throw new Error('Must be signed in to cancel requests.');
    return storageService.cancelRequestByCustomer(requestId, user.email, reason);
  };

  const clearUserRequests = () => {
    if (!user) return;
    storageService.clearRequests(user.email);
  };

  const hideUserRequest = (requestId) => {
    if (!user) throw new Error('Must be signed in to hide requests.');
    return storageService.hideCustomerRequest(user.email, requestId);
  };

  const hideUserRequests = (requestIds) => {
    if (!user) throw new Error('Must be signed in to hide requests.');
    return storageService.hideCustomerRequests(user.email, requestIds);
  };

  const clearUserHistory = () => {
    if (!user) return [];
    return storageService.clearCustomerHistory(user.email);
  };

  const restoreUserRequest = (requestId) => {
    if (!user) return;
    return storageService.restoreCustomerRequest(user.email, requestId);
  };

  const restoreUserRequests = (requestIds) => {
    if (!user) return;
    return storageService.restoreCustomerRequests(user.email, requestIds);
  };

  const restoreAllUserHistory = () => {
    if (!user) return;
    return storageService.restoreAllCustomerHistory(user.email);
  };

  const getHiddenUserRequests = () => {
    if (!user) return [];
    return storageService.getHiddenRequests(user.email);
  };

  const checkDeletionEligibility = () => {
    if (!user) {
      return { canDelete: false, reason: 'Must be signed in to verify account status.', unresolvedRequests: [] };
    }
    return storageService.checkCustomerDeletionEligibility(user.email);
  };

  const deleteAccount = () => {
    if (!user) throw new Error('Must be signed in to delete account.');
    const result = storageService.deleteCustomerAccount(user.email);
    setUser(null);
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUserProfile,
        getUserAddresses,
        saveAddress,
        deleteAddress,
        setDefaultAddress,
        verifyAddress,
        getUserPreferences,
        saveUserPreferences,
        updatePassword,
        clearNonEssentialCache,
        getUserRequests,
        addUserRequest,
        updateRequestStatus,
        updatePickupDetails,
        cancelUserRequest,
        respondToAppointment,
        clearUserRequests,
        hideUserRequest,
        hideUserRequests,
        clearUserHistory,
        restoreUserRequest,
        restoreUserRequests,
        restoreAllUserHistory,
        getHiddenUserRequests,
        checkDeletionEligibility,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
