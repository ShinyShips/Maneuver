/**
 * TBA Data Caching with IndexedDB
 * 
 * Provides efficient caching of TBA match data to minimize API calls
 * and enable offline viewing of previously fetched data.
 * 
 * Phase 2: TBA Integration - Caching Layer
 */

import Dexie, { type Table } from 'dexie';
import type { TBAMatchData } from './tbaMatchData';
import type { ValidationResultDB } from './matchValidationTypes';

// ============================================================================
// Database Schema
// ============================================================================

export interface CachedTBAMatch {
  matchKey: string;  // Primary key (e.g., '2025mrcmp_qm1')
  eventKey: string;  // For querying by event
  matchNumber: number;
  compLevel: string;
  data: TBAMatchData;  // Complete match data
  cachedAt: number;  // Timestamp when cached
  expiresAt: number;  // Timestamp when cache expires
}

export interface TBACacheMetadata {
  eventKey: string;  // Primary key
  lastFetchedAt: number;
  matchCount: number;
  qualMatchCount: number;
  playoffMatchCount: number;
}

/**
 * Dexie database for TBA cache and validation results
 */
class TBACacheDB extends Dexie {
  matches!: Table<CachedTBAMatch, string>;
  metadata!: Table<TBACacheMetadata, string>;
  validationResults!: Table<ValidationResultDB, string>;

  constructor() {
    super('TBACacheDB');
    
    // Version 1: Original schema
    this.version(1).stores({
      matches: 'matchKey, eventKey, matchNumber, compLevel, cachedAt',
      metadata: 'eventKey, lastFetchedAt',
    });

    // Version 2: Add validation results table
    this.version(2).stores({
      matches: 'matchKey, eventKey, matchNumber, compLevel, cachedAt',
      metadata: 'eventKey, lastFetchedAt',
      validationResults: 'id, eventKey, matchKey, matchNumber, timestamp'
    });
  }
}

// Create database instance
const db = new TBACacheDB();

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache expiration time in milliseconds
 * Default: 1 hour (matches can change if re-played)
 */
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Maximum age for event metadata cache
 * Default: 5 minutes (event match list changes less frequently)
 */
const METADATA_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Cache Functions
// ============================================================================

/**
 * Store TBA match data in cache
 * 
 * @param matchData - TBA match data to cache
 * @param cacheExpirationMs - Optional custom expiration time
 */
export async function cacheTBAMatch(
  matchData: TBAMatchData,
  cacheExpirationMs: number = CACHE_EXPIRATION_MS
): Promise<void> {
  const now = Date.now();
  
  const cached: CachedTBAMatch = {
    matchKey: matchData.key,
    eventKey: matchData.event_key,
    matchNumber: matchData.match_number,
    compLevel: matchData.comp_level,
    data: matchData,
    cachedAt: now,
    expiresAt: now + cacheExpirationMs,
  };
  
  await db.matches.put(cached);
}

/**
 * Store multiple TBA matches in cache
 * 
 * @param matches - Array of TBA match data
 * @param cacheExpirationMs - Optional custom expiration time
 */
export async function cacheTBAMatches(
  matches: TBAMatchData[],
  cacheExpirationMs: number = CACHE_EXPIRATION_MS
): Promise<void> {
  const now = Date.now();
  
  const cached: CachedTBAMatch[] = matches.map(matchData => ({
    matchKey: matchData.key,
    eventKey: matchData.event_key,
    matchNumber: matchData.match_number,
    compLevel: matchData.comp_level,
    data: matchData,
    cachedAt: now,
    expiresAt: now + cacheExpirationMs,
  }));
  
  await db.matches.bulkPut(cached);
  
  // Update metadata
  if (matches.length > 0) {
    const eventKey = matches[0].event_key;
    const qualMatches = matches.filter(m => m.comp_level === 'qm');
    const playoffMatches = matches.filter(m => m.comp_level !== 'qm');
    
    await db.metadata.put({
      eventKey,
      lastFetchedAt: now,
      matchCount: matches.length,
      qualMatchCount: qualMatches.length,
      playoffMatchCount: playoffMatches.length,
    });
  }
}

/**
 * Get cached TBA match data
 * Offline-first: Returns expired data if available, caller decides what to do
 * 
 * @param matchKey - TBA match key
 * @param allowExpired - If true, returns expired data (default: true for offline-first)
 * @returns Cached match data or null if not found
 */
export async function getCachedTBAMatch(
  matchKey: string,
  allowExpired: boolean = true
): Promise<TBAMatchData | null> {
  const cached = await db.matches.get(matchKey);
  
  if (!cached) {
    return null;
  }
  
  // Offline-first: Return data even if expired (caller checks isExpired separately)
  if (allowExpired) {
    return cached.data;
  }
  
  // If caller requires fresh data only, check expiration
  if (Date.now() > cached.expiresAt) {
    return null;
  }
  
  return cached.data;
}

/**
 * Get all cached matches for an event
 * Offline-first: Returns all data including expired
 * 
 * @param eventKey - TBA event key
 * @param includeExpired - Whether to include expired matches (default: true for offline-first)
 * @returns Array of cached match data
 */
export async function getCachedTBAEventMatches(
  eventKey: string,
  includeExpired: boolean = true
): Promise<TBAMatchData[]> {
  const cached = await db.matches
    .where('eventKey')
    .equals(eventKey)
    .toArray();
  
  const now = Date.now();
  
  // Offline-first: Return all data unless explicitly filtering expired
  const validCached = includeExpired
    ? cached
    : cached.filter(c => now <= c.expiresAt);
  
  // Sort by match number
  validCached.sort((a, b) => {
    // Quals first, then playoffs
    if (a.compLevel === 'qm' && b.compLevel !== 'qm') return -1;
    if (a.compLevel !== 'qm' && b.compLevel === 'qm') return 1;
    return a.matchNumber - b.matchNumber;
  });
  
  return validCached.map(c => c.data);
}

/**
 * Check if event match data is cached and fresh
 * 
 * @param eventKey - TBA event key
 * @returns True if event has fresh cached data
 */
export async function isEventCacheFresh(eventKey: string): Promise<boolean> {
  const metadata = await db.metadata.get(eventKey);
  
  if (!metadata) {
    return false;
  }
  
  const age = Date.now() - metadata.lastFetchedAt;
  return age < METADATA_EXPIRATION_MS;
}

/**
 * Check if cached data is expired (but still available)
 * Useful for showing "stale data" warnings in offline-first apps
 * 
 * @param eventKey - TBA event key
 * @returns Object with expiration status and age
 */
export async function getCacheExpiration(eventKey: string): Promise<{
  hasCache: boolean;
  isExpired: boolean;
  isFresh: boolean;
  ageMs: number;
  lastFetchedAt: number | null;
}> {
  const metadata = await db.metadata.get(eventKey);
  
  if (!metadata) {
    return {
      hasCache: false,
      isExpired: false,
      isFresh: false,
      ageMs: 0,
      lastFetchedAt: null,
    };
  }
  
  const ageMs = Date.now() - metadata.lastFetchedAt;
  const isExpired = ageMs > CACHE_EXPIRATION_MS;
  const isFresh = ageMs < METADATA_EXPIRATION_MS;
  
  return {
    hasCache: true,
    isExpired,
    isFresh,
    ageMs,
    lastFetchedAt: metadata.lastFetchedAt,
  };
}

/**
 * Get cache metadata for an event
 * 
 * @param eventKey - TBA event key
 * @returns Cache metadata or null if not found
 */
export async function getCacheMetadata(eventKey: string): Promise<TBACacheMetadata | null> {
  const metadata = await db.metadata.get(eventKey);
  return metadata || null;
}

/**
 * Clear cache for a specific match
 * 
 * @param matchKey - TBA match key
 */
export async function clearMatchCache(matchKey: string): Promise<void> {
  await db.matches.delete(matchKey);
}

/**
 * Clear all cached matches for an event
 * 
 * @param eventKey - TBA event key
 */
export async function clearEventCache(eventKey: string): Promise<void> {
  await db.matches.where('eventKey').equals(eventKey).delete();
  await db.metadata.delete(eventKey);
}

/**
 * Clear all expired cache entries
 * 
 * @returns Number of entries deleted
 */
export async function clearExpiredCache(): Promise<number> {
  const now = Date.now();
  const expired = await db.matches
    .where('expiresAt')
    .below(now)
    .toArray();
  
  if (expired.length > 0) {
    await db.matches.bulkDelete(expired.map(e => e.matchKey));
  }
  
  return expired.length;
}

/**
 * Clear all TBA cache data
 */
export async function clearAllTBACache(): Promise<void> {
  await db.matches.clear();
  await db.metadata.clear();
}

/**
 * Get total cache size information
 * 
 * @returns Object with cache statistics
 */
export async function getTBACacheStats(): Promise<{
  totalMatches: number;
  totalEvents: number;
  expiredMatches: number;
  cacheSizeEstimate: string;
}> {
  const totalMatches = await db.matches.count();
  const totalEvents = await db.metadata.count();
  
  const now = Date.now();
  const expiredMatches = await db.matches
    .where('expiresAt')
    .below(now)
    .count();
  
  // Rough size estimate (each match ~10-20KB)
  const estimatedKB = totalMatches * 15;
  const cacheSizeEstimate = estimatedKB > 1024
    ? `${(estimatedKB / 1024).toFixed(1)} MB`
    : `${estimatedKB} KB`;
  
  return {
    totalMatches,
    totalEvents,
    expiredMatches,
    cacheSizeEstimate,
  };
}

/**
 * Prefetch and cache matches for an event
 * Useful for preloading data before going offline
 * 
 * @param eventKey - TBA event key
 * @param apiKey - TBA API key
 * @param fetchFunction - Function to fetch matches from TBA
 * @returns Array of cached matches
 */
export async function prefetchEventMatches(
  eventKey: string,
  apiKey: string,
  fetchFunction: (eventKey: string, apiKey: string) => Promise<TBAMatchData[]>
): Promise<TBAMatchData[]> {
  // Check if cache is fresh
  if (await isEventCacheFresh(eventKey)) {
    console.log(`Using fresh cache for ${eventKey}`);
    return await getCachedTBAEventMatches(eventKey);
  }
  
  // Fetch from TBA
  console.log(`Fetching fresh data for ${eventKey}`);
  const matches = await fetchFunction(eventKey, apiKey);
  
  // Cache the data
  await cacheTBAMatches(matches);
  
  return matches;
}

// ============================================================================
// Validation Results Storage (Phase 3)
// ============================================================================

/**
 * Store validation result in cache
 * @param validationResult - Validation result to store
 */
export async function storeValidationResult(validationResult: ValidationResultDB): Promise<void> {
  await db.validationResults.put(validationResult);
}

/**
 * Get validation result for a specific match
 * @param eventKey - Event key
 * @param matchKey - TBA match key
 * @returns Validation result or null if not found
 */
export async function getValidationResult(
  eventKey: string,
  matchKey: string
): Promise<ValidationResultDB | null> {
  const id = `${eventKey}_${matchKey}`;
  const result = await db.validationResults.get(id);
  return result || null;
}

/**
 * Get all validation results for an event
 * @param eventKey - Event key
 * @returns Array of validation results
 */
export async function getEventValidationResults(
  eventKey: string
): Promise<ValidationResultDB[]> {
  return await db.validationResults
    .where('eventKey')
    .equals(eventKey)
    .toArray();
}

/**
 * Clear validation results for an event
 * @param eventKey - Event key
 */
export async function clearEventValidationResults(
  eventKey: string
): Promise<void> {
  await db.validationResults
    .where('eventKey')
    .equals(eventKey)
    .delete();
}

/**
 * Get validation results by status (flagged, failed, etc.)
 * @param eventKey - Event key
 * @param status - Validation status to filter by
 * @returns Filtered validation results
 */
export async function getValidationResultsByStatus(
  eventKey: string,
  status: 'passed' | 'flagged' | 'failed' | 'pending' | 'no-tba-data'
): Promise<ValidationResultDB[]> {
  const allResults = await getEventValidationResults(eventKey);
  return allResults.filter(r => r.result.status === status);
}

// Export database instance for advanced usage
export { db as tbaCacheDB };
