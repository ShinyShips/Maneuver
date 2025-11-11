/**
 * Advanced compression utilities for QR code data transfer
 * Implements Phase 3 compression techniques from QR Enhancement Roadmap
 */

import * as pako from 'pako';
import type { ScoutingEntry, ScoutingDataEntry, ScoutingDataCollection } from './scoutingTypes';

// Re-export types for consumers of this module
export type { ScoutingEntry, ScoutingDataEntry, ScoutingDataCollection };

// Export local interfaces for external type safety
export interface CompressedEntry {
  id?: string;
  a?: number; // alliance
  s?: number; // scout (dictionary index)
  sf?: string; // scout (fallback full string)
  e?: number; // event (dictionary index)
  ef?: string; // event (fallback full string)
  m?: string; // matchNumber
  t?: string; // selectTeam
  p?: number; // start positions (bit packed)
  ac?: number[]; // auto coral counts
  ao?: number[]; // auto other counts
  aa?: number[]; // auto algae counts
  tc?: number[]; // teleop coral counts
  ta?: number[]; // teleop algae counts
  g?: number; // endgame booleans (bit packed)
  c?: string; // comment
}

// Constants for size thresholds and compression parameters
export const COMPRESSION_THRESHOLD = 10000; // Minimum bytes to trigger compression for scouting data
export const COMPRESSION_THRESHOLD_SCOUT_PROFILES = 1000; // Minimum bytes to trigger compression for scout profiles (1KB)
export const MIN_FOUNTAIN_SIZE_COMPRESSED = 50; // Minimum bytes for compressed fountain codes
export const MIN_FOUNTAIN_SIZE_UNCOMPRESSED = 100; // Minimum bytes for uncompressed fountain codes
export const QR_CODE_SIZE_BYTES = 2000; // Estimated bytes per QR code

// Local interfaces for compression

interface CompressedData {
  meta: {
    compressed: boolean;
    version: string;
    scoutDict: string[];
    eventDict?: string[];
  };
  entries: CompressedEntry[];
}

// Compression dictionaries
const ALLIANCE_DICT = {
  'redAlliance': 0,
  'blueAlliance': 1
} as const;

// Remove static event dictionary - use dynamic compression instead
// This scales to hundreds of events without maintenance burden

// Dictionary interfaces for type safety
interface ScoutDictionaries {
  scoutDict: { [key: string]: number };
  scoutReverse: string[];
}

interface EventDictionaries {
  eventDict: { [key: string]: number };
  eventReverse: string[];
}

/**
 * Helper function to safely extract scouting data from entry
 * Handles both flat entries and nested structure with data property
 */
export function extractScoutingData(entry: ScoutingDataEntry): Partial<ScoutingEntry> {
  return entry.data || (entry as unknown as ScoutingEntry);
}

/**
 * Type guard to check if data is a scouting data collection
 */
export function isScoutingDataCollection(data: unknown): data is ScoutingDataCollection {
  return data !== null && 
         typeof data === 'object' && 
         'entries' in data && 
         Array.isArray((data as ScoutingDataCollection).entries);
}

/**
 * Build dynamic scout dictionary from data
 */
function buildScoutDict(data: ScoutingDataEntry[]): ScoutDictionaries {
  const scouts = new Set<string>();
  
  // Collect all unique scout initials from entries
  data.forEach(entry => {
    const scoutingData = extractScoutingData(entry);
    if (scoutingData.scoutName && typeof scoutingData.scoutName === 'string') {
      scouts.add(scoutingData.scoutName);
    }
  });
  
  // Build dictionary
  const scoutDict: { [key: string]: number } = {};
  const scoutReverse: string[] = Array.from(scouts);
  scoutReverse.forEach((scout, index) => {
    scoutDict[scout] = index;
  });
  
  if (import.meta.env.DEV) {
    const previewCount = 5;
    const preview = scoutReverse.slice(0, previewCount);
    console.log(
      `📊 Built scout dictionary: ${scoutReverse.length} unique scouts. First ${preview.length}:`,
      preview,
      scoutReverse.length > previewCount ? '...' : ''
    );
  }
  
  return { scoutDict, scoutReverse };
}

/**
 * Build dynamic event dictionary from data
 * Scales to hundreds of events without maintenance burden
 */
function buildEventDict(data: ScoutingDataEntry[]): EventDictionaries {
  const eventCounts = new Map<string, number>();
  
  // Count occurrences of each event to prioritize frequent ones
  data.forEach(entry => {
    const scoutingData = extractScoutingData(entry);
    if (scoutingData.eventName && typeof scoutingData.eventName === 'string') {
      eventCounts.set(scoutingData.eventName, (eventCounts.get(scoutingData.eventName) || 0) + 1);
    }
  });
  
  // Sort events by frequency (most frequent first for better compression)
  const sortedEvents = Array.from(eventCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([eventName]) => eventName);
  
  // Build dictionary (only compress if we have multiple events)
  const eventDict: { [key: string]: number } = {};
  const eventReverse: string[] = [];
  
  if (sortedEvents.length > 1) {
    sortedEvents.forEach((event, index) => {
      eventDict[event] = index;
      eventReverse.push(event);
    });
  }
  
  if (import.meta.env.DEV) {
    console.log(
      `📊 Built event dictionary: ${eventReverse.length} unique events`,
      eventReverse.length > 0 ? eventReverse : '(using fallback strings)'
    );
  }
  
  return { eventDict, eventReverse };
}





/**
 * Smart compression using JSON optimization + gzip
 * Preserves original IDs and provides excellent compression ratios
 */
export function compressScoutingData(data: ScoutingDataCollection | ScoutingDataEntry[], originalJson?: string): Uint8Array {
  const startTime = performance.now();
  // Cache JSON string to avoid duplicate serialization
  const jsonString = originalJson || JSON.stringify(data);
  const originalSize = jsonString.length;
  
  // Extract entries array from various possible formats
  let entries: ScoutingDataEntry[] = [];
  if (Array.isArray(data)) {
    // Handle case where data is directly an array
    entries = data;
  } else if (data && typeof data === 'object' && 'entries' in data && Array.isArray(data.entries)) {
    entries = data.entries;
  } else {
    console.error('Invalid data format for compression');
    throw new Error('Invalid data format for compression');
  }
  
  // Build dynamic dictionaries from data
  const { scoutDict, scoutReverse } = buildScoutDict(entries);
  const { eventDict, eventReverse } = buildEventDict(entries);
  
  // Compress entries using smart JSON optimization
  const compressedEntries = entries.map((entry: ScoutingDataEntry) => {
    const scoutingData = extractScoutingData(entry);
    
    // Verbose logging disabled - uncomment for debugging
    // if (import.meta.env.DEV && index === 0) {
    //   console.log(`🔍 Sample entry structure:`, entry);
    //   console.log(`🔍 Sample scouting data keys:`, Object.keys(scoutingData || {}));
    //   console.log(`🔍 Sample scoring fields:`, {
    //     autoCoralL1: scoutingData?.autoCoralPlaceL1Count,
    //     teleopCoralL1: scoutingData?.teleopCoralPlaceL1Count,
    //     autoAlgaeNet: scoutingData?.autoAlgaePlaceNetShot,
    //     teleopAlgaeNet: scoutingData?.teleopAlgaePlaceNetShot,
    //     autoPassedStartLine: scoutingData?.autoPassedStartLine
    //   });
    // }
    
    const optimized: Record<string, unknown> = {};
    
    // Preserve original ID - this ensures decompression can restore exact same IDs
    if (entry.id) optimized.id = entry.id;
    
    // Use dictionary compression for categorical fields
    if (scoutingData.alliance) optimized.a = ALLIANCE_DICT[scoutingData.alliance as keyof typeof ALLIANCE_DICT];
    if (scoutingData.scoutName && scoutDict[scoutingData.scoutName] !== undefined) {
      optimized.s = scoutDict[scoutingData.scoutName];
    } else if (scoutingData.scoutName) {
      optimized.sf = scoutingData.scoutName; // fallback to full string
    }
    // Use dynamic event dictionary (scales to hundreds of events)
    if (scoutingData.eventName) {
      if (eventDict[scoutingData.eventName] !== undefined) {
        optimized.e = eventDict[scoutingData.eventName];
      } else {
        optimized.ef = scoutingData.eventName; // fallback to full string
      }
    }
    
    // Compress field names and pack counts efficiently
    if (scoutingData.matchNumber) optimized.m = scoutingData.matchNumber;
    if (scoutingData.selectTeam) optimized.t = scoutingData.selectTeam;
    
    // Pack boolean start positions as a single number
    const poses = (scoutingData.startPoses0 ? 1 : 0) | (scoutingData.startPoses1 ? 2 : 0) | 
                  (scoutingData.startPoses2 ? 4 : 0) | (scoutingData.startPoses3 ? 8 : 0) | 
                  (scoutingData.startPoses4 ? 16 : 0) | (scoutingData.startPoses5 ? 32 : 0);
    if (poses > 0) optimized.p = poses;
    
    // Pack auto coral counts as array (only non-zero values)
    const autoCoral = [
      scoutingData.autoCoralPlaceL1Count || 0, scoutingData.autoCoralPlaceL2Count || 0,
      scoutingData.autoCoralPlaceL3Count || 0, scoutingData.autoCoralPlaceL4Count || 0
    ];
    if (autoCoral.some(c => c > 0)) optimized.ac = autoCoral;
    
    // Pack other auto counts efficiently
    const autoOther = [
      scoutingData.autoCoralPlaceDropMissCount || 0, scoutingData.autoCoralPickPreloadCount || 0,
      scoutingData.autoCoralPickStationCount || 0, scoutingData.autoCoralPickMark1Count || 0,
      scoutingData.autoCoralPickMark2Count || 0, scoutingData.autoCoralPickMark3Count || 0
    ];
    if (autoOther.some(c => c > 0)) optimized.ao = autoOther;
    
    // Pack auto algae counts
    const autoAlgae = [
      scoutingData.autoAlgaePlaceNetShot || 0, scoutingData.autoAlgaePlaceProcessor || 0,
      scoutingData.autoAlgaePlaceDropMiss || 0, scoutingData.autoAlgaePlaceRemove || 0,
      scoutingData.autoAlgaePickReefCount || 0
    ];
    if (autoAlgae.some(c => c > 0)) optimized.aa = autoAlgae;
    
    // Pack teleop coral counts
    const teleopCoral = [
      scoutingData.teleopCoralPlaceL1Count || 0, scoutingData.teleopCoralPlaceL2Count || 0,
      scoutingData.teleopCoralPlaceL3Count || 0, scoutingData.teleopCoralPlaceL4Count || 0,
      scoutingData.teleopCoralPlaceDropMissCount || 0, scoutingData.teleopCoralPickStationCount || 0,
      scoutingData.teleopCoralPickCarpetCount || 0
    ];
    if (teleopCoral.some(c => c > 0)) optimized.tc = teleopCoral;
    
    // Pack teleop algae counts
    const teleopAlgae = [
      scoutingData.teleopAlgaePlaceNetShot || 0, scoutingData.teleopAlgaePlaceProcessor || 0,
      scoutingData.teleopAlgaePlaceDropMiss || 0, scoutingData.teleopAlgaePlaceRemove || 0,
      scoutingData.teleopAlgaePickReefCount || 0, scoutingData.teleopAlgaePickCarpetCount || 0
    ];
    if (teleopAlgae.some(c => c > 0)) optimized.ta = teleopAlgae;
    
    // Pack endgame booleans efficiently (including autoPassedStartLine in bit 64)
    let endgamePacked = 0;
    if (scoutingData.shallowClimbAttempted) endgamePacked |= 1;
    if (scoutingData.deepClimbAttempted) endgamePacked |= 2;
    if (scoutingData.parkAttempted) endgamePacked |= 4;
    if (scoutingData.climbFailed) endgamePacked |= 8;
    if (scoutingData.playedDefense) endgamePacked |= 16;
    if (scoutingData.brokeDown) endgamePacked |= 32;
    if (scoutingData.autoPassedStartLine) endgamePacked |= 64;
    if (endgamePacked > 0) optimized.g = endgamePacked;
    
    // Keep comment
    if (scoutingData.comment) optimized.c = scoutingData.comment;
    
    return optimized;
  });
  
  // Create final compressed structure with metadata
  const compressedStructure = {
    meta: {
      compressed: true,
      version: '1.0',
      scoutDict: scoutReverse,
      eventDict: eventReverse // Include dynamic event dictionary
    },
    entries: compressedEntries
  };
  
  // Apply gzip compression to the optimized JSON
  const optimizedJson = JSON.stringify(compressedStructure);
  const gzipCompressed = pako.gzip(optimizedJson);
  const finalSize = gzipCompressed.length;
  
  const compressionTime = performance.now() - startTime;
  const totalReduction = ((1 - finalSize / originalSize) * 100).toFixed(1);
  
  // Only log summary in dev mode
  if (import.meta.env.DEV) {
    console.log(`✅ Compressed: ${originalSize} → ${finalSize} bytes (${totalReduction}% reduction, ${compressionTime.toFixed(0)}ms)`);
  }

  return gzipCompressed;
}

/**
 * Expand a compressed entry back to full format
 * @param compressed - Compressed entry with short field names
 * @param scoutDict - Dictionary for scout names
 * @param eventDict - Dictionary for event names
 * @returns Fully expanded scouting entry
 */
function expandCompressedEntry(
  compressed: CompressedEntry,
  scoutDict: string[],
  eventDict: string[]
): Record<string, unknown> {
  const expanded: Record<string, unknown> = {};
  const allianceReverse = ['redAlliance', 'blueAlliance'] as const;
  
  // Expand dictionary-compressed fields
  if (typeof compressed.a === 'number') expanded.alliance = allianceReverse[compressed.a];
  if (typeof compressed.s === 'number') expanded.scoutName = scoutDict[compressed.s];
  if (typeof compressed.sf === 'string') expanded.scoutName = compressed.sf;
  if (typeof compressed.e === 'number') expanded.eventName = eventDict[compressed.e];
  if (typeof compressed.ef === 'string') expanded.eventName = compressed.ef;
  
  // Expand basic fields
  if (compressed.m) expanded.matchNumber = compressed.m;
  if (compressed.t) expanded.selectTeam = compressed.t;
  
  // Expand packed boolean start positions
  if (typeof compressed.p === 'number') {
    expanded.startPoses0 = !!(compressed.p & 1);
    expanded.startPoses1 = !!(compressed.p & 2);
    expanded.startPoses2 = !!(compressed.p & 4);
    expanded.startPoses3 = !!(compressed.p & 8);
    expanded.startPoses4 = !!(compressed.p & 16);
    expanded.startPoses5 = !!(compressed.p & 32);
  } else {
    expanded.startPoses0 = false;
    expanded.startPoses1 = false;
    expanded.startPoses2 = false;
    expanded.startPoses3 = false;
    expanded.startPoses4 = false;
    expanded.startPoses5 = false;
  }
  
  // Expand auto coral counts
  if (Array.isArray(compressed.ac)) {
    expanded.autoCoralPlaceL1Count = compressed.ac[0] || 0;
    expanded.autoCoralPlaceL2Count = compressed.ac[1] || 0;
    expanded.autoCoralPlaceL3Count = compressed.ac[2] || 0;
    expanded.autoCoralPlaceL4Count = compressed.ac[3] || 0;
  } else {
    expanded.autoCoralPlaceL1Count = 0;
    expanded.autoCoralPlaceL2Count = 0;
    expanded.autoCoralPlaceL3Count = 0;
    expanded.autoCoralPlaceL4Count = 0;
  }
  
  // Expand other auto counts
  if (Array.isArray(compressed.ao)) {
    expanded.autoCoralPlaceDropMissCount = compressed.ao[0] || 0;
    expanded.autoCoralPickPreloadCount = compressed.ao[1] || 0;
    expanded.autoCoralPickStationCount = compressed.ao[2] || 0;
    expanded.autoCoralPickMark1Count = compressed.ao[3] || 0;
    expanded.autoCoralPickMark2Count = compressed.ao[4] || 0;
    expanded.autoCoralPickMark3Count = compressed.ao[5] || 0;
  } else {
    expanded.autoCoralPlaceDropMissCount = 0;
    expanded.autoCoralPickPreloadCount = 0;
    expanded.autoCoralPickStationCount = 0;
    expanded.autoCoralPickMark1Count = 0;
    expanded.autoCoralPickMark2Count = 0;
    expanded.autoCoralPickMark3Count = 0;
  }
  
  // Expand auto algae
  if (Array.isArray(compressed.aa)) {
    expanded.autoAlgaePlaceNetShot = compressed.aa[0] || 0;
    expanded.autoAlgaePlaceProcessor = compressed.aa[1] || 0;
    expanded.autoAlgaePlaceDropMiss = compressed.aa[2] || 0;
    expanded.autoAlgaePlaceRemove = compressed.aa[3] || 0;
    expanded.autoAlgaePickReefCount = compressed.aa[4] || 0;
  } else {
    expanded.autoAlgaePlaceNetShot = 0;
    expanded.autoAlgaePlaceProcessor = 0;
    expanded.autoAlgaePlaceDropMiss = 0;
    expanded.autoAlgaePlaceRemove = 0;
    expanded.autoAlgaePickReefCount = 0;
  }
  
  // Expand teleop coral
  if (Array.isArray(compressed.tc)) {
    expanded.teleopCoralPlaceL1Count = compressed.tc[0] || 0;
    expanded.teleopCoralPlaceL2Count = compressed.tc[1] || 0;
    expanded.teleopCoralPlaceL3Count = compressed.tc[2] || 0;
    expanded.teleopCoralPlaceL4Count = compressed.tc[3] || 0;
    expanded.teleopCoralPlaceDropMissCount = compressed.tc[4] || 0;
    expanded.teleopCoralPickStationCount = compressed.tc[5] || 0;
    expanded.teleopCoralPickCarpetCount = compressed.tc[6] || 0;
  } else {
    expanded.teleopCoralPlaceL1Count = 0;
    expanded.teleopCoralPlaceL2Count = 0;
    expanded.teleopCoralPlaceL3Count = 0;
    expanded.teleopCoralPlaceL4Count = 0;
    expanded.teleopCoralPlaceDropMissCount = 0;
    expanded.teleopCoralPickStationCount = 0;
    expanded.teleopCoralPickCarpetCount = 0;
  }
  
  // Expand teleop algae
  if (Array.isArray(compressed.ta)) {
    expanded.teleopAlgaePlaceNetShot = compressed.ta[0] || 0;
    expanded.teleopAlgaePlaceProcessor = compressed.ta[1] || 0;
    expanded.teleopAlgaePlaceDropMiss = compressed.ta[2] || 0;
    expanded.teleopAlgaePlaceRemove = compressed.ta[3] || 0;
    expanded.teleopAlgaePickReefCount = compressed.ta[4] || 0;
    expanded.teleopAlgaePickCarpetCount = compressed.ta[5] || 0;
  } else {
    expanded.teleopAlgaePlaceNetShot = 0;
    expanded.teleopAlgaePlaceProcessor = 0;
    expanded.teleopAlgaePlaceDropMiss = 0;
    expanded.teleopAlgaePlaceRemove = 0;
    expanded.teleopAlgaePickReefCount = 0;
    expanded.teleopAlgaePickCarpetCount = 0;
  }
  
  // Expand endgame booleans
  if (typeof compressed.g === 'number') {
    expanded.shallowClimbAttempted = !!(compressed.g & 1);
    expanded.deepClimbAttempted = !!(compressed.g & 2);
    expanded.parkAttempted = !!(compressed.g & 4);
    expanded.climbFailed = !!(compressed.g & 8);
    expanded.playedDefense = !!(compressed.g & 16);
    expanded.brokeDown = !!(compressed.g & 32);
    expanded.autoPassedStartLine = !!(compressed.g & 64);
  } else {
    expanded.shallowClimbAttempted = false;
    expanded.deepClimbAttempted = false;
    expanded.parkAttempted = false;
    expanded.climbFailed = false;
    expanded.playedDefense = false;
    expanded.brokeDown = false;
    expanded.autoPassedStartLine = false;
  }
  
  // Keep comment
  if (compressed.c) expanded.comment = compressed.c;
  
  return expanded;
}

/**
 * Decompress scouting data and optionally expand entries to full format
 * @param compressedData - Compressed Uint8Array
 * @param expandEntries - Whether to expand compressed entries to full format. 
 *   - Set to `true` (default) when using CombinedDataFountainScanner, which needs fully expanded ScoutingEntry objects.
 *   - Set to `false` when using UniversalFountainScanner, which performs its own dictionary expansion and field reconstruction.
 * @returns Object with entries array (either compressed or fully expanded based on expandEntries parameter)
 */
export function decompressScoutingData(
  compressedData: Uint8Array,
  expandEntries = true
): { entries: unknown[] } {
  // Decompress
  const binaryData = pako.ungzip(compressedData);
  const jsonString = new TextDecoder().decode(binaryData);
  const data = JSON.parse(jsonString) as CompressedData;
  
  if (!expandEntries) {
    // Return compressed entries without expansion (for UniversalFountainScanner)
    return { entries: data.entries || [] };
  }
  
  // Expand compressed entries back to full format
  const scoutDict = data.meta?.scoutDict || [];
  const eventDict = data.meta?.eventDict || [];
  
  const expandedEntries = (data.entries || []).map((compressed) => {
    const expanded = expandCompressedEntry(compressed, scoutDict, eventDict);
    
    // Preserve the original ID
    const originalId = compressed.id;
    if (!originalId) {
      throw new Error('Missing ID in compressed entry');
    }
    
    return {
      id: originalId,
      data: expanded,
      timestamp: Date.now()
    };
  });
  
  return { entries: expandedEntries };
}



/**
 * Compress scout profiles data using pako
 * @param scouts - Array of Scout objects
 * @param predictions - Array of MatchPrediction objects
 * @param originalJson - Optional pre-computed JSON string to avoid duplicate serialization
 * @returns Compressed Uint8Array with metadata header
 */
export function compressScoutProfiles(
  scouts: unknown[], 
  predictions: unknown[], 
  originalJson?: string
): Uint8Array {
  const data = { scouts, predictions };
  const jsonString = originalJson || JSON.stringify(data);
  
  if (import.meta.env.DEV) {
    console.log(`🗜️ Compressing scout profiles: ${jsonString.length} bytes`);
  }
  
  // Use pako to compress the JSON string
  const compressed = pako.deflate(jsonString, { level: 9 });
  
  // Create a header to identify this as compressed scout profiles
  const header = new TextEncoder().encode('SCOUT_PROFILES_COMPRESSED_V1:');
  
  // Combine header + compressed data
  const result = new Uint8Array(header.length + compressed.length);
  result.set(header, 0);
  result.set(compressed, header.length);
  
  if (import.meta.env.DEV) {
    const ratio = (result.length / jsonString.length * 100).toFixed(1);
    console.log(`✅ Scout profiles compressed: ${jsonString.length} → ${result.length} bytes (${ratio}% of original)`);
  }
  
  return result;
}

/**
 * Decompress scout profiles data
 * @param compressedData - Compressed Uint8Array with header
 * @returns Object with scouts and predictions arrays
 */
export function decompressScoutProfiles(compressedData: Uint8Array): { scouts: unknown[]; predictions: unknown[] } {
  const header = 'SCOUT_PROFILES_COMPRESSED_V1:';
  const headerBytes = new TextEncoder().encode(header);
  
  // Verify header
  const dataHeader = compressedData.slice(0, headerBytes.length);
  const headerMatch = headerBytes.every((byte, i) => byte === dataHeader[i]);
  
  if (!headerMatch) {
    throw new Error('Invalid scout profiles compression header');
  }
  
  // Extract and decompress the data
  const compressedPayload = compressedData.slice(headerBytes.length);
  const decompressed = pako.inflate(compressedPayload, { to: 'string' });
  
  const parsed = JSON.parse(decompressed);
  
  return {
    scouts: parsed.scouts || [],
    predictions: parsed.predictions || []
  };
}

/**
 * Check if data should use compression based on size
 * @param data - Data to check for compression eligibility
 * @param jsonString - Optional pre-computed JSON string to avoid duplicate serialization
 */
export function shouldUseCompression(data: unknown, jsonString?: string): boolean {
  const jsonSize = jsonString ? jsonString.length : JSON.stringify(data).length;
  return jsonSize > COMPRESSION_THRESHOLD;
}

/**
 * Get compression statistics for display
 * @param originalData - Original data object
 * @param compressedData - Compressed data
 * @param originalJson - Optional pre-computed JSON string to avoid duplicate serialization
 */
export function getCompressionStats(
  originalData: unknown, 
  compressedData: Uint8Array, 
  originalJson?: string
): {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  estimatedQRReduction: string;
} {
  const originalSize = originalJson ? originalJson.length : JSON.stringify(originalData).length;
  const compressedSize = compressedData.length;
  const compressionRatio = compressedSize / originalSize;
  
  // Estimate QR code count reduction using the defined constant
  const originalQRs = Math.ceil(originalSize / QR_CODE_SIZE_BYTES);
  const compressedQRs = Math.ceil(compressedSize / QR_CODE_SIZE_BYTES);
  const estimatedQRReduction = `~${originalQRs} → ${compressedQRs} codes`;
  
  return {
    originalSize,
    compressedSize,
    compressionRatio,
    estimatedQRReduction
  };
}
