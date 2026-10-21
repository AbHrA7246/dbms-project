import React, { createContext, useContext, useState, useCallback } from 'react';

const DirectoryContext = createContext({
  isDirectoryOpen: false,
  previousTitle: '',
  openDirectory: () => {},
  closeDirectory: () => {},
  toggleDirectory: () => {},
});

export function DirectoryProvider({ children }) {
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [previousTitle, setPreviousTitle] = useState('');

  const openDirectory = useCallback((fromTitle = '') => {
    if (fromTitle) {
      setPreviousTitle(fromTitle);
    }
    setIsDirectoryOpen(true);
    // Smoothly scroll to top so the in-page directory is immediately visible
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const closeDirectory = useCallback(() => {
    setIsDirectoryOpen(false);
    setPreviousTitle('');
  }, []);

  const toggleDirectory = useCallback((fromTitle = '') => {
    setIsDirectoryOpen((prev) => {
      if (!prev && fromTitle) {
        setPreviousTitle(fromTitle);
      }
      return !prev;
    });
  }, []);

  return (
    <DirectoryContext.Provider
      value={{
        isDirectoryOpen,
        previousTitle,
        openDirectory,
        closeDirectory,
        toggleDirectory,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectory() {
  const context = useContext(DirectoryContext);
  if (!context) {
    throw new Error('useDirectory must be used within a DirectoryProvider');
  }
  return context;
}
