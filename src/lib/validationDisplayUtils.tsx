/**
 * Validation Display Utilities
 * 
 * Utility functions for displaying and formatting validation results.
 * Includes status styling, match label formatting, and match sorting.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { MatchValidationResult } from './matchValidationTypes';

/**
 * Get Tailwind CSS classes for status badges
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'passed': 
      return 'bg-green-100 text-green-800 border-green-200';
    case 'flagged': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed': 
      return 'bg-red-100 text-red-800 border-red-200';
    default: 
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

/**
 * Get icon component for validation status
 */
export const getStatusIcon = (status: string): React.ReactElement | null => {
  switch (status) {
    case 'passed': 
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'flagged': 
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'failed': 
      return <XCircle className="h-4 w-4 text-red-600" />;
    default: 
      return null;
  }
};

/**
 * Get color classes for discrepancy severity
 */
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': 
      return 'text-red-600 dark:text-red-400';
    case 'warning': 
      return 'text-yellow-600 dark:text-yellow-400';
    case 'minor': 
      return 'text-blue-600 dark:text-blue-400';
    default: 
      return 'text-gray-600 dark:text-gray-400';
  }
};

/**
 * Format match key into human-readable label
 * 
 * Examples:
 * - "2025mrcmp_qm15" -> "Qual 15"
 * - "2025mrcmp_sf2m1" -> "Elim 2"
 * - "2025mrcmp_f1m2" -> "Final 2"
 */
export const formatMatchLabel = (result: MatchValidationResult): string => {
  // Parse the matchKey to get the proper label
  // Format examples: "2025mrcmp_qm15", "2025mrcmp_sf2m1", "2025mrcmp_f1m1", "2025mrcmp_f1m2"
  const matchKeyParts = result.matchKey.split('_')[1] || result.matchKey;
  
  // Extract competition level and match info
  if (matchKeyParts.startsWith('qm')) {
    // Qualification match: "qm15" -> "Qual 15"
    const matchNum = matchKeyParts.substring(2);
    return `Qual ${matchNum}`;
  } else if (matchKeyParts.startsWith('sf')) {
    // Semifinals/Eliminations: "sf2m1" -> "Elim 2"
    const match = matchKeyParts.match(/sf(\d+)m/);
    const setNum = match ? match[1] : '';
    return `Elim ${setNum}`;
  } else if (matchKeyParts.startsWith('f')) {
    // Finals: "f1m1" -> "Final 1", "f1m2" -> "Final 2", "f1m3" -> "Final 3"
    const match = matchKeyParts.match(/f\d+m(\d+)/);
    const matchNum = match ? match[1] : '';
    return `Final ${matchNum}`;
  }
  
  // Fallback to match number if we can't parse
  return `Match ${result.matchNumber}`;
};

/**
 * Sort validation results by competition level and match number
 * 
 * Sort order:
 * 1. Competition level (qual < semifinals < finals)
 * 2. Set number (for eliminations)
 * 3. Match number within set
 */
export const sortValidationResults = (results: MatchValidationResult[]): MatchValidationResult[] => {
  return [...results].sort((a, b) => {
    // Extract match key parts (format: "eventKey_compLevelMatchNum" e.g. "2025mrcmp_qm15")
    const aKey = a.matchKey.split('_')[1] || a.matchKey;
    const bKey = b.matchKey.split('_')[1] || b.matchKey;
    
    // Determine competition level order: qm < sf < f
    const getCompOrder = (key: string): number => {
      if (key.startsWith('qm')) return 1;
      if (key.startsWith('sf')) return 2;
      if (key.startsWith('f')) return 3;
      return 4;
    };
    
    const aOrder = getCompOrder(aKey);
    const bOrder = getCompOrder(bKey);
    
    // Sort by competition level first
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Within same competition level, sort by set number, then match number
    const extractNumbers = (key: string): { set: number; match: number } => {
      if (key.startsWith('qm')) {
        const num = parseInt(key.substring(2)) || 0;
        return { set: num, match: 0 };
      }
      if (key.startsWith('sf')) {
        // Elims: sf2m1 -> set=2, match=1
        const match = key.match(/sf(\d+)m(\d+)/);
        return {
          set: match ? parseInt(match[1]) : 0,
          match: match ? parseInt(match[2]) : 0
        };
      }
      if (key.startsWith('f')) {
        // Finals: f1m2 -> just use match number since there's only 1 finals bracket
        const match = key.match(/f\d+m(\d+)/);
        return {
          set: 0,
          match: match ? parseInt(match[1]) : 0
        };
      }
      return { set: 0, match: 0 };
    };
    
    const aNumbers = extractNumbers(aKey);
    const bNumbers = extractNumbers(bKey);
    
    // Sort by set number first
    if (aNumbers.set !== bNumbers.set) {
      return aNumbers.set - bNumbers.set;
    }
    
    // Then by match number within the set
    return aNumbers.match - bNumbers.match;
  });
};

/**
 * Check for duplicate match entries in validation results
 * Useful for debugging and data quality checks
 */
export const checkForDuplicates = (
  results: MatchValidationResult[],
  onDuplicatesFound?: (duplicates: Array<{ match: string; count: number }>) => void
): void => {
  const matchNumbers = results.map(r => r.matchNumber);
  const counts: Record<string, number> = {};
  
  matchNumbers.forEach(num => {
    counts[num] = (counts[num] || 0) + 1;
  });
  
  const duplicates = Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([match, count]) => ({ match, count }));
  
  if (duplicates.length > 0) {
    console.log('Found duplicate match numbers in validation results:');
    duplicates.forEach(({ match, count }) => {
      console.log(`Match ${match}: ${count} entries`);
      // Show IDs and matchKeys for this match
      const matchResults = results.filter(r => r.matchNumber === match);
      matchResults.forEach((r, i) => {
        console.log(`  Entry ${i + 1}: id=${r.id}, matchKey=${r.matchKey}, status=${r.status}`);
      });
    });
    
    if (onDuplicatesFound) {
      onDuplicatesFound(duplicates);
    }
    
    const message = `Found ${duplicates.length} matches with duplicate entries:\n${
      duplicates.map(({ match, count }) => `Match ${match}: ${count} entries`).join('\n')
    }\n\nCheck console for detailed IDs`;
    
    alert(message);
  } else {
    alert('No duplicates found! All matches have unique entries.');
  }
};

/**
 * Match filters interface
 */
export interface MatchFilters {
  status: 'all' | 'passed' | 'flagged' | 'failed' | 'pending' | 'no-tba-data';
  matchType: 'all' | 'qm' | 'sf' | 'f';
  searchQuery: string;
  sortBy: 'match' | 'status' | 'discrepancies' | 'confidence';
  sortOrder: 'asc' | 'desc';
}

/**
 * Apply filters and sorting to validation results
 * 
 * @param results - Validation results to filter and sort
 * @param filters - Filter and sort criteria
 * @returns Filtered and sorted results
 */
export const filterAndSortResults = (
  results: MatchValidationResult[],
  filters: MatchFilters
): MatchValidationResult[] => {
  let filtered = [...results];

  // Apply status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(r => r.status === filters.status);
  }

  // Apply match type filter
  if (filters.matchType !== 'all') {
    filtered = filtered.filter(r => {
      const matchPart = r.matchKey.split('_')[1] || r.matchKey;
      return matchPart.startsWith(filters.matchType);
    });
  }

  // Apply search filter (match number or team number)
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r => {
      // Search in match label
      const matchLabel = formatMatchLabel(r).toLowerCase();
      if (matchLabel.includes(query)) return true;

      // Search in team numbers
      const teamNumbers = r.teams?.map(t => t.teamNumber.toString()) || [];
      return teamNumbers.some(num => num.includes(query));
    });
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let compareValue = 0;

    switch (filters.sortBy) {
      case 'match': {
        // Sort by competition level and match number
        const getMatchInfo = (matchKey: string) => {
          const matchPart = matchKey.split('_')[1] || matchKey;
          
          if (matchPart.startsWith('qm')) {
            return {
              level: 1,
              matchNum: parseInt(matchPart.substring(2)) || 0,
              setNum: 0
            };
          } else if (matchPart.startsWith('sf')) {
            const match = matchPart.match(/sf(\d+)m(\d+)/);
            return {
              level: 2,
              setNum: match ? parseInt(match[1]) : 0,
              matchNum: match ? parseInt(match[2]) : 0
            };
          } else if (matchPart.startsWith('f')) {
            const match = matchPart.match(/f(\d+)m(\d+)/);
            return {
              level: 3,
              setNum: match ? parseInt(match[1]) : 0,
              matchNum: match ? parseInt(match[2]) : 0
            };
          }
          
          return { level: 0, matchNum: 0, setNum: 0 };
        };

        const aInfo = getMatchInfo(a.matchKey);
        const bInfo = getMatchInfo(b.matchKey);

        if (aInfo.level !== bInfo.level) {
          compareValue = aInfo.level - bInfo.level;
        } else if (aInfo.setNum !== bInfo.setNum) {
          compareValue = aInfo.setNum - bInfo.setNum;
        } else {
          compareValue = aInfo.matchNum - bInfo.matchNum;
        }
        break;
      }

      case 'status': {
        // Sort by status severity (failed > flagged > passed > pending > no-tba-data)
        const statusOrder: Record<string, number> = { 
          'failed': 0, 
          'flagged': 1, 
          'passed': 2, 
          'pending': 3, 
          'no-tba-data': 4 
        };
        compareValue = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        break;
      }

      case 'discrepancies': {
        // Sort by total discrepancies
        compareValue = a.totalDiscrepancies - b.totalDiscrepancies;
        break;
      }

      case 'confidence': {
        // Sort by confidence (high > medium > low)
        const confidenceOrder: Record<string, number> = { 
          'high': 2, 
          'medium': 1, 
          'low': 0 
        };
        compareValue = (confidenceOrder[a.confidence] || 0) - (confidenceOrder[b.confidence] || 0);
        break;
      }
    }

    // Apply sort order
    return filters.sortOrder === 'desc' ? -compareValue : compareValue;
  });

  return filtered;
};
