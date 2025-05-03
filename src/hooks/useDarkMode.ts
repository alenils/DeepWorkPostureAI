import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Update dark mode when system preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      const systemPrefersDark = e.matches;
      // Only update if there's no saved preference
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(systemPrefersDark);
      }
    };

    // Listen for system dark mode changes
    mediaQuery.addEventListener('change', handleChange);

    // Update document class
    document.documentElement.classList.toggle('dark', isDarkMode);
    
    // Save to localStorage
    localStorage.setItem('darkMode', isDarkMode.toString());

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return { isDarkMode, toggleDarkMode };
}; 