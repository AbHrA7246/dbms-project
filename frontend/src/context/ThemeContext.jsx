import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  BRAND_TOKENS,
  LIGHT_THEME,
  DARK_THEME,
  STATUS_TOKENS,
  CHART_PALETTES,
  CATEGORY_COLORS,
} from '../constants/themeTokens';

export {
  BRAND_TOKENS,
  LIGHT_THEME,
  DARK_THEME,
  STATUS_TOKENS,
  CHART_PALETTES,
  CATEGORY_COLORS,
};

const THEME_STORAGE_KEY = 'ecocycle_theme';

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Stored preference: 'light' | 'dark' | 'system' (defaults to 'system')
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      // Local storage unavailable
    }
    return 'system';
  });

  // Calculate resolved theme: 'light' | 'dark'
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  // Apply class to document.documentElement
  const applyThemeClass = (effectiveTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  // Set theme preference
  const setTheme = (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') {
      return;
    }
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      window.dispatchEvent(new Event('ecocycle_theme_change'));
    } catch (e) {
      console.warn('[ThemeContext] Failed to save theme preference', e);
    }
  };

  // Synchronize when preference or system media query changes
  useEffect(() => {
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    const updateResolved = () => {
      const effective = theme === 'system' ? (mediaQuery?.matches ? 'dark' : 'light') : theme;
      setResolvedTheme(effective);
      applyThemeClass(effective);
    };

    updateResolved();

    const handleSystemChange = () => {
      if (theme === 'system') {
        updateResolved();
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }

    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && stored !== theme) {
          setThemeState(stored);
        }
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ecocycle_theme_change', handleStorageChange);

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleSystemChange);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ecocycle_theme_change', handleStorageChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, isDark: resolvedTheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
