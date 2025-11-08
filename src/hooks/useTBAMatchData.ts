/**
 * React Hook for TBA Match Validation Data
 * 
 * Provides a unified interface for fetching and caching TBA match data
 * with automatic cache management.
 * 
 * Phase 2: TBA Integration - React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  fetchTBAMatchDetail,
  fetchTBAEventMatchesDetailed,
  extractTeamNumbers,
  hasScoreBreakdown,
  type TBAMatchData,
} from '@/lib/tbaMatchData';
import {
  cacheTBAMatch,
  cacheTBAMatches,
  getCachedTBAMatch,
  getCachedTBAEventMatches,
  getCacheExpiration,
  clearEventCache,
  type TBACacheMetadata,
  getCacheMetadata,
  getTBACacheStats,
} from '@/lib/tbaCache';

export interface UseTBAMatchDataReturn {
  // State
  loading: boolean;
  error: string | null;
  matches: TBAMatchData[];
  cacheMetadata: TBACacheMetadata | null;
  isOnline: boolean;
  cacheExpired: boolean;
  
  // Functions
  fetchMatch: (matchKey: string, apiKey: string, forceRefresh?: boolean) => Promise<TBAMatchData | null>;
  fetchEventMatches: (eventKey: string, apiKey: string, forceRefresh?: boolean) => Promise<TBAMatchData[]>;
  getMatch: (matchKey: string) => Promise<TBAMatchData | null>;
  clearCache: (eventKey: string) => Promise<void>;
  refreshCacheStats: () => Promise<void>;
}

/**
 * Hook for fetching and caching TBA match data
 * 
 * @example
 * ```tsx
 * const { fetchEventMatches, matches, loading } = useTBAMatchData();
 * 
 * useEffect(() => {
 *   fetchEventMatches('2025mrcmp', apiKey);
 * }, []);
 * ```
 */
export function useTBAMatchData(): UseTBAMatchDataReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<TBAMatchData[]>([]);
  const [cacheMetadata, setCacheMetadata] = useState<TBACacheMetadata | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheExpired, setCacheExpired] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Fetch a single match from TBA (with caching)
   */
  const fetchMatch = useCallback(async (
    matchKey: string,
    apiKey: string,
    forceRefresh: boolean = false
  ): Promise<TBAMatchData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = await getCachedTBAMatch(matchKey);
        if (cached) {
          console.log(`Using cached data for match ${matchKey}`);
          return cached;
        }
      }

      // Fetch from TBA
      console.log(`Fetching match ${matchKey} from TBA`);
      const matchData = await fetchTBAMatchDetail(matchKey, apiKey);

      // Cache the result
      await cacheTBAMatch(matchData);

      return matchData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch match data';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch all matches for an event from TBA (with offline-first caching)
   */
  const fetchEventMatches = useCallback(async (
    eventKey: string,
    apiKey: string,
    forceRefresh: boolean = false
  ): Promise<TBAMatchData[]> => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first (always, even if expired - offline-first)
      const cached = await getCachedTBAEventMatches(eventKey, true); // true = include expired
      
      // Check cache expiration status
      const expiration = await getCacheExpiration(eventKey);
      setCacheExpired(expiration.isExpired);
      
      // If we have cached data and we're offline, use it regardless of expiration
      if (cached.length > 0 && !navigator.onLine) {
        console.log(`Using cached data for event ${eventKey} (offline mode)`);
        setMatches(cached);
        
        // Update metadata
        const meta = await getCacheMetadata(eventKey);
        setCacheMetadata(meta);
        
        if (expiration.isExpired) {
          toast.warning(`Showing cached data (offline). Last updated ${formatCacheAge(expiration.lastFetchedAt!)}`);
        } else {
          toast.success(`Loaded ${cached.length} matches from cache (offline)`);
        }
        
        return cached;
      }
      
      // If we have fresh cached data and not forcing refresh, use it
      if (cached.length > 0 && !forceRefresh && !expiration.isExpired) {
        console.log(`Using fresh cached data for event ${eventKey}`);
        setMatches(cached);
        
        // Update metadata
        const meta = await getCacheMetadata(eventKey);
        setCacheMetadata(meta);
        
        toast.success(`Loaded ${cached.length} matches from cache`);
        return cached;
      }
      
      // If we're online, try to fetch fresh data
      if (navigator.onLine) {
        console.log(`Fetching event ${eventKey} from TBA`);
        const matchesData = await fetchTBAEventMatchesDetailed(eventKey, apiKey);

        // Filter for matches with score breakdowns only
        const matchesWithBreakdowns = matchesData.filter(hasScoreBreakdown);

        // Cache the results (replaces old data)
        await cacheTBAMatches(matchesWithBreakdowns);

        setMatches(matchesWithBreakdowns);
        setCacheExpired(false);
        
        // Update metadata
        const meta = await getCacheMetadata(eventKey);
        setCacheMetadata(meta);

        toast.success(`Loaded ${matchesWithBreakdowns.length} matches from TBA`);
        return matchesWithBreakdowns;
      }
      
      // If we reach here, we're offline and have no cache
      throw new Error('No cached data available and you are offline');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch event matches';
      setError(errorMessage);
      
      // Don't show error toast if we're offline and have cached data
      const cached = await getCachedTBAEventMatches(eventKey, true);
      if (cached.length === 0 || navigator.onLine) {
        toast.error(errorMessage);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

/**
 * Format cache age for display
 */
function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  
  if (ageMinutes < 1) {
    return 'just now';
  } else if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  } else {
    const ageHours = Math.floor(ageMinutes / 60);
    const remainingMins = ageMinutes % 60;
    return `${ageHours}h ${remainingMins}m ago`;
  }
}

  /**
   * Get a match from cache only (no API call)
   */
  const getMatch = useCallback(async (matchKey: string): Promise<TBAMatchData | null> => {
    try {
      return await getCachedTBAMatch(matchKey);
    } catch (err) {
      console.error('Failed to get cached match:', err);
      return null;
    }
  }, []);

  /**
   * Clear cache for an event
   */
  const clearCache = useCallback(async (eventKey: string): Promise<void> => {
    try {
      await clearEventCache(eventKey);
      setMatches([]);
      setCacheMetadata(null);
      toast.success(`Cache cleared for ${eventKey}`);
    } catch (err) {
      console.error('Failed to clear cache:', err);
      toast.error('Failed to clear cache');
    }
  }, []);

  /**
   * Refresh cache statistics
   */
  const refreshCacheStats = useCallback(async (): Promise<void> => {
    try {
      const stats = await getTBACacheStats();
      console.log('TBA Cache Stats:', stats);
    } catch (err) {
      console.error('Failed to get cache stats:', err);
    }
  }, []);

  return {
    loading,
    error,
    matches,
    cacheMetadata,
    isOnline,
    cacheExpired,
    fetchMatch,
    fetchEventMatches,
    getMatch,
    clearCache,
    refreshCacheStats,
  };
}

/**
 * Helper hook for getting team numbers from TBA match
 */
export function useMatchTeams(match: TBAMatchData | null): {
  redTeams: string[];
  blueTeams: string[];
  allTeams: string[];
} {
  if (!match) {
    return { redTeams: [], blueTeams: [], allTeams: [] };
  }

  const redTeams = extractTeamNumbers(match.alliances.red.team_keys);
  const blueTeams = extractTeamNumbers(match.alliances.blue.team_keys);
  const allTeams = [...redTeams, ...blueTeams];

  return { redTeams, blueTeams, allTeams };
}
