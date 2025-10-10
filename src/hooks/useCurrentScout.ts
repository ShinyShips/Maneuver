import { useState, useEffect } from 'react';
import type { Scout } from '../lib/dexieDB';
import { getOrCreateScoutByName } from '../lib/scoutGameUtils';

export const useCurrentScout = () => {
  const [currentScout, setCurrentScout] = useState<Scout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Watch for changes in localStorage currentScout (from nav-user sidebar)
  useEffect(() => {
    const loadCurrentScout = async () => {
      try {
        const currentScoutName = localStorage.getItem('currentScout') || localStorage.getItem('scoutName');
        if (currentScoutName) {
          const scout = await getOrCreateScoutByName(currentScoutName);
          setCurrentScout(scout);
        }
      } catch (error) {
        console.error('Error loading current scout:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentScout();

    // Listen for storage changes (when scout is changed in nav-user)
    const handleStorageChange = () => {
      loadCurrentScout();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events in case of same-tab updates
    window.addEventListener('scoutChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('scoutChanged', handleStorageChange);
    };
  }, []);

  const refreshScout = async () => {
    if (currentScout) {
      try {
        const { getScout } = await import('../lib/dexieDB');
        const updatedScout = await getScout(currentScout.name);
        if (updatedScout) {
          setCurrentScout(updatedScout);
        }
      } catch (error) {
        console.error('Error refreshing scout:', error);
      }
    }
  };

  return {
    currentScout,
    isLoading,
    refreshScout
  };
};
