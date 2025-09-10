/**
 * Data Filtering Utilities
 * Reduces large event data transfers from 74-190 QR codes to <40 codes
 */

import type { ScoutingDataCollection } from './scoutingTypes';

// Filtering interfaces
export interface MatchRangeFilter {
  type: 'preset' | 'custom';
  preset?: 'last10' | 'last15' | 'last30' | 'all' | 'fromLastExport';
  customStart?: number;
  customEnd?: number;
}

export interface TeamFilter {
  selectedTeams: string[]; // Team numbers as strings
  includeAll: boolean;
}

export interface DataFilters {
  matchRange: MatchRangeFilter;
  teams: TeamFilter;
}

export interface FilteredDataStats {
  originalEntries: number;
  filteredEntries: number;
  estimatedQRCodes: number;
  compressionReduction?: string;
  scanTimeEstimate: string;
  warningLevel: 'safe' | 'warning' | 'danger';
}

/**
 * Track the last exported match for "from last export" filtering
 */
const LAST_EXPORTED_MATCH_KEY = 'maneuver_last_exported_match';

export function getLastExportedMatch(): number | null {
  try {
    const stored = localStorage.getItem(LAST_EXPORTED_MATCH_KEY);
    return stored ? parseInt(stored) : null;
  } catch {
    return null;
  }
}

export function setLastExportedMatch(matchNumber: number): void {
  try {
    localStorage.setItem(LAST_EXPORTED_MATCH_KEY, matchNumber.toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Extract unique team numbers from scouting data
 */
export function extractTeamNumbers(data: ScoutingDataCollection): string[] {
  const teams = new Set<string>();
  
  data.entries.forEach(entry => {
    const scoutingData = entry.data;
    if (scoutingData.selectTeam) {
      teams.add(scoutingData.selectTeam);
    }
  });
  
  return Array.from(teams).sort((a, b) => {
    // Sort numerically if both are numbers, otherwise alphabetically
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

/**
 * Extract match number range from scouting data
 */
export function extractMatchRange(data: ScoutingDataCollection): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  
  data.entries.forEach(entry => {
    const matchNum = parseInt(entry.data.matchNumber);
    if (!isNaN(matchNum)) {
      min = Math.min(min, matchNum);
      max = Math.max(max, matchNum);
    }
  });
  
  return {
    min: min === Infinity ? 1 : min,
    max: max === -Infinity ? 1 : max
  };
}

/**
 * Apply filters to scouting data
 */
export function applyFilters(
  data: ScoutingDataCollection, 
  filters: DataFilters
): ScoutingDataCollection {
  let filteredEntries = data.entries;
  
  // Apply team filter
  if (!filters.teams.includeAll && filters.teams.selectedTeams.length > 0) {
    filteredEntries = filteredEntries.filter(entry => 
      filters.teams.selectedTeams.includes(entry.data.selectTeam)
    );
  }
  
  // Apply match range filter
  if (filters.matchRange.type === 'preset' && filters.matchRange.preset !== 'all') {
    const matchRange = extractMatchRange(data);
    let startMatch = matchRange.min;
    
    if (filters.matchRange.preset === 'last10') {
      startMatch = Math.max(matchRange.min, matchRange.max - 9);
    } else if (filters.matchRange.preset === 'last15') {
      startMatch = Math.max(matchRange.min, matchRange.max - 14);
    } else if (filters.matchRange.preset === 'last30') {
      startMatch = Math.max(matchRange.min, matchRange.max - 29);
    } else if (filters.matchRange.preset === 'fromLastExport') {
      const lastExportedMatch = getLastExportedMatch();
      startMatch = lastExportedMatch ? Math.max(matchRange.min, lastExportedMatch + 1) : matchRange.min;
    }
    
    filteredEntries = filteredEntries.filter(entry => {
      const matchNum = parseInt(entry.data.matchNumber);
      return !isNaN(matchNum) && matchNum >= startMatch && matchNum <= matchRange.max;
    });
  } else if (filters.matchRange.type === 'custom') {
    const start = filters.matchRange.customStart || 1;
    const end = filters.matchRange.customEnd || 999;
    
    filteredEntries = filteredEntries.filter(entry => {
      const matchNum = parseInt(entry.data.matchNumber);
      return !isNaN(matchNum) && matchNum >= start && matchNum <= end;
    });
  }
  
  return {
    ...data,
    entries: filteredEntries
  };
}

/**
 * Estimate QR codes and generate statistics for filtered data
 */
export function calculateFilterStats(
  originalData: ScoutingDataCollection,
  filteredData: ScoutingDataCollection,
  useCompression: boolean = true
): FilteredDataStats {
  const originalEntries = originalData.entries.length;
  const filteredEntries = filteredData.entries.length;
  
  // Estimate bytes per entry based on compression
  let bytesPerEntry: number;
  if (useCompression) {
    // Advanced compression achieves ~4.2 entries per QR code (2KB)
    bytesPerEntry = 2000 / 4.2; // ~476 bytes per entry after compression
  } else {
    // Standard JSON encoding ~2-3KB per entry
    bytesPerEntry = 2500;
  }
  
  const estimatedBytes = filteredEntries * bytesPerEntry;
  const estimatedQRCodes = Math.ceil(estimatedBytes / 2000); // 2KB per QR code
  
  // Calculate scan time estimate (assuming ~3 seconds per QR code)
  const scanTimeSeconds = estimatedQRCodes * 3;
  const scanTimeMinutes = Math.floor(scanTimeSeconds / 60);
  const remainingSeconds = scanTimeSeconds % 60;
  
  let scanTimeEstimate: string;
  if (scanTimeMinutes > 0) {
    scanTimeEstimate = `~${scanTimeMinutes}m ${remainingSeconds}s`;
  } else {
    scanTimeEstimate = `~${scanTimeSeconds}s`;
  }
  
  // Determine warning level
  let warningLevel: 'safe' | 'warning' | 'danger';
  if (estimatedQRCodes <= 20) {
    warningLevel = 'safe';
  } else if (estimatedQRCodes <= 40) {
    warningLevel = 'warning';
  } else {
    warningLevel = 'danger';
  }
  
  // Compression reduction info
  let compressionReduction: string | undefined;
  if (useCompression && originalEntries > 0) {
    const originalQRs = Math.ceil((originalEntries * 2500) / 2000); // Uncompressed estimate
    const compressedQRs = Math.ceil((originalEntries * bytesPerEntry) / 2000);
    const reduction = ((originalQRs - compressedQRs) / originalQRs * 100).toFixed(1);
    compressionReduction = `${reduction}% fewer codes with compression`;
  }
  
  return {
    originalEntries,
    filteredEntries,
    estimatedQRCodes,
    compressionReduction,
    scanTimeEstimate,
    warningLevel
  };
}

/**
 * Create default filters (smart default based on export history)
 */
export function createDefaultFilters(): DataFilters {
  const lastExported = getLastExportedMatch();
  const defaultPreset = lastExported !== null ? 'fromLastExport' : 'all';
  
  return {
    matchRange: {
      type: 'preset',
      preset: defaultPreset
    },
    teams: {
      selectedTeams: [],
      includeAll: true
    }
  };
}

/**
 * Validate filter configuration
 */
export function validateFilters(filters: DataFilters): { valid: boolean; error?: string } {
  if (filters.matchRange.type === 'custom') {
    const start = filters.matchRange.customStart;
    const end = filters.matchRange.customEnd;
    
    if (start !== undefined && end !== undefined && start > end) {
      return { valid: false, error: 'Start match must be less than or equal to end match' };
    }
    
    if (start !== undefined && (start < 1 || start > 200)) {
      return { valid: false, error: 'Start match must be between 1 and 200' };
    }
    
    if (end !== undefined && (end < 1 || end > 200)) {
      return { valid: false, error: 'End match must be between 1 and 200' };
    }
  }
  
  return { valid: true };
}
