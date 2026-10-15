import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecocycle_current_user');
      return saved ? JSON.parse(saved) : null;
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

    let existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!existing) {
      const derivedName = trimmedEmail.split('@')[0];
      const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
      existing = {
        id: 'usr_' + Date.now(),
        name: formattedName,
        email: trimmedEmail,
        userType: 'Individual Resident',
        createdAt: new Date().toISOString(),
      };
      users.push(existing);
      localStorage.setItem('ecocycle_users', JSON.stringify(users));
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
  };

  // Requests persistence via isolated storageService
  const getUserRequests = () => {
    if (!user) return [];
    return storageService.getRequests(user.email);
  };

  const addUserRequest = (requestData) => {
    if (!user) throw new Error('Must be signed in to create requests.');
    return storageService.createRequest(user.email, requestData);
  };

  const updateRequestStatus = (requestId, newStatus, note = '') => {
    if (!user) throw new Error('Must be signed in to update requests.');
    return storageService.updateRequestStatus(user.email, requestId, newStatus, note);
  };

  const clearUserRequests = () => {
    if (!user) return;
    storageService.clearRequests(user.email);
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
        getUserRequests,
        addUserRequest,
        updateRequestStatus,
        clearUserRequests,
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
