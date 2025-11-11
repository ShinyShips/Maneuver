import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createEncoder, blockToBinary } from "luby-transform";
import { fromUint8Array } from "js-base64";
import { Info, Play, Pause, SkipForward, SkipBack, ChevronsLeft, ChevronsRight } from "lucide-react";
import { 
  compressScoutingData, 
  compressScoutProfiles,
  shouldUseCompression, 
  getCompressionStats,
  isScoutingDataCollection,
  MIN_FOUNTAIN_SIZE_COMPRESSED,
  MIN_FOUNTAIN_SIZE_UNCOMPRESSED,
  QR_CODE_SIZE_BYTES,
  COMPRESSION_THRESHOLD_SCOUT_PROFILES,
  type ScoutingDataCollection
} from "@/lib/compressionUtils";
/**
 * Helper to create compression wrapper with base64-encoded data
 */
function createCompressionWrapper<T>(
  isCompressed: boolean,
  data: Uint8Array | T
): { compressed: boolean; data: string | T } {
  return {
    compressed: isCompressed,
    data: isCompressed ? fromUint8Array(data as Uint8Array) : data as T
  };
}

import {
  type DataFilters,
  createDefaultFilters,
  applyFilters,
  setLastExportedMatch,
  extractMatchRange
} from "@/lib/dataFiltering";
import { 
  DataFilteringControls
} from "./DataFilteringControls";

interface FountainPacket {
  type: string;
  sessionId: string;
  packetId: number;
  k: number;
  bytes: number;
  checksum: string;
  indices: number[];
  data: string; // Base64 encoded binary data
}

interface UniversalFountainGeneratorProps {
  onBack: () => void;
  onSwitchToScanner?: () => void;
  dataType: 'scouting' | 'match' | 'scout' | 'combined' | 'pit-scouting' | 'pit-images';
  loadData: () => Promise<unknown> | unknown;
  title: string;
  description: string;
  noDataMessage: string;
}

const UniversalFountainGenerator = ({ 
  onBack, 
  onSwitchToScanner, 
  dataType,
  loadData,
  title,
  description,
  noDataMessage
}: UniversalFountainGeneratorProps) => {
  const [packets, setPackets] = useState<FountainPacket[]>([]);
  const [currentPacketIndex, setCurrentPacketIndex] = useState(0);
  const [data, setData] = useState<unknown>(null);
  const [cycleSpeed, setCycleSpeed] = useState(500);
  const [compressionInfo, setCompressionInfo] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [jumpToPacket, setJumpToPacket] = useState<string>('');

  // Data Filtering State
  const [filters, setFilters] = useState<DataFilters>(createDefaultFilters());
  const [filteredData, setFilteredData] = useState<ScoutingDataCollection | null>(null);
  const [showFiltering, setShowFiltering] = useState(false);

  // Speed presets
  const speedPresets = [
    { label: "Default (2/sec)", value: 500 },
    { label: "Slower (1/sec)", value: 1000 }
  ];

  useEffect(() => {
    const loadDataAsync = async () => {
      try {
        const loadedData = await loadData();
        setData(loadedData);
        
        if (loadedData) {
          console.log(`Loaded ${dataType} data for fountain codes:`, loadedData);
        } else {
          console.log(`No ${dataType} data found`);
        }
      } catch (error) {
        console.error(`Error loading ${dataType} data:`, error);
        toast.error(`Error loading ${dataType} data: ` + (error instanceof Error ? error.message : String(error)));
        setData(null);
      }
    };

    loadDataAsync();
  }, [loadData, dataType]);

  // Initialize filtering when data loads
  useEffect(() => {
    const isCombinedData = dataType === 'combined' && 
                          data && 
                          typeof data === 'object' && 
                          'entries' in data;
    
    const shouldShow = ((dataType === 'scouting' && isScoutingDataCollection(data)) || 
                       isCombinedData) &&
                      data && 
                      typeof data === 'object' && 
                      'entries' in data &&
                      (data as { entries: unknown[] }).entries.length > 50;
    
    if (shouldShow) {
      setShowFiltering(true);
      setFilteredData(data as ScoutingDataCollection);
    } else {
      setShowFiltering(false);
      setFilteredData(null);
    }
  }, [data, dataType]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: DataFilters) => {
    setFilters(newFilters);
  };

  // Apply filters to data
  const handleApplyFilters = () => {
    if (isScoutingDataCollection(data)) {
      const filtered = applyFilters(data, filters);
      setFilteredData(filtered);
      toast.success(`Filtered to ${filtered.entries.length} entries`);
    }
  };

  // Get the data to use for QR generation (filtered or original)
  const getDataForGeneration = (): unknown => {
    if (showFiltering && filteredData) {
      // For combined data type, reconstruct the full structure with filtered entries
      if (dataType === 'combined' && data && typeof data === 'object' && 'scoutProfiles' in data) {
        return {
          type: "combined_export",
          scoutingData: {
            entries: filteredData.entries
          },
          scoutProfiles: (data as { scoutProfiles: unknown }).scoutProfiles,
          metadata: {
            exportedAt: new Date().toISOString(),
            version: "1.0",
            scoutingEntriesCount: filteredData.entries.length,
            scoutsCount: (data as { metadata?: { scoutsCount?: number } }).metadata?.scoutsCount || 0,
            predictionsCount: (data as { metadata?: { predictionsCount?: number } }).metadata?.predictionsCount || 0
          }
        };
      }
      return filteredData;
    }
    
    // For combined data type with no filtering, reconstruct the original structure
    if (dataType === 'combined' && data && typeof data === 'object' && 'entries' in data && 'scoutProfiles' in data) {
      return {
        type: "combined_export",
        scoutingData: {
          entries: (data as { entries: unknown[] }).entries
        },
        scoutProfiles: (data as { scoutProfiles: unknown }).scoutProfiles,
        metadata: (data as { metadata?: unknown }).metadata || {
          exportedAt: new Date().toISOString(),
          version: "1.0"
        }
      };
    }
    
    return data;
  };

  const generateFountainPackets = () => {
    const dataToUse = getDataForGeneration();
    if (!dataToUse) {
      toast.error(`No ${dataType} data available`);
      return;
    }

    let encodedData: Uint8Array;
    let currentCompressionInfo = '';
    
    // Handle compression based on data type
    if (dataType === 'scout') {
      // Scout profiles standalone - compress if large enough (using lower 1KB threshold)
      if (dataToUse && typeof dataToUse === 'object' && 'scouts' in dataToUse && 'predictions' in dataToUse) {
        const data = dataToUse as { scouts: unknown[]; predictions: unknown[]; exportedAt?: string; version?: string };
        const jsonString = JSON.stringify(dataToUse);
        
        // Use lower threshold for scout profiles
        if (jsonString.length > COMPRESSION_THRESHOLD_SCOUT_PROFILES) {
          if (import.meta.env.DEV) {
            console.log('🗜️ Compressing scout profiles...');
          }
          const compressedData = compressScoutProfiles(data.scouts, data.predictions, jsonString);
          
          // Wrap in structure with compression flag
          const wrappedData = {
            compressed: true,
            data: fromUint8Array(compressedData),
            exportedAt: data.exportedAt || new Date().toISOString(),
            version: data.version || "1.0"
          };
          
          const wrappedJson = JSON.stringify(wrappedData);
          encodedData = new TextEncoder().encode(wrappedJson);
          const stats = getCompressionStats(dataToUse, compressedData, jsonString);
          currentCompressionInfo = `Scout profiles compressed: ${stats.originalSize} → ${stats.compressedSize} bytes (${(100 - stats.compressionRatio * 100).toFixed(1)}% reduction, ${stats.estimatedQRReduction})`;
          toast.success(`Scout profiles compressed: ${(100 - stats.compressionRatio * 100).toFixed(1)}% size reduction!`);
        } else {
          encodedData = new TextEncoder().encode(jsonString);
          currentCompressionInfo = `Scout profiles (uncompressed): ${encodedData.length} bytes`;
        }
      } else {
        const jsonString = JSON.stringify(dataToUse);
        encodedData = new TextEncoder().encode(jsonString);
        currentCompressionInfo = `Standard JSON: ${encodedData.length} bytes`;
      }
    } else if (dataType === 'combined') {
      // Combined data - compress each part independently then combine
      if (dataToUse && typeof dataToUse === 'object' && 
          'type' in dataToUse && 
          'scoutingData' in dataToUse && 
          'scoutProfiles' in dataToUse) {
        
        const combinedData = dataToUse as {
          type: string;
          scoutingData: { entries: unknown[] };
          scoutProfiles: { scouts: unknown[]; predictions: unknown[] };
          metadata: unknown;
        };
        
        let scoutingCompressed = false;
        let scoutingData: Uint8Array | { entries: unknown[] } = combinedData.scoutingData;
        const scoutingJson = JSON.stringify(combinedData.scoutingData);
        
        // Compress scouting data if it qualifies
        if (shouldUseCompression(combinedData.scoutingData, scoutingJson) && 
            isScoutingDataCollection(combinedData.scoutingData)) {
          scoutingData = compressScoutingData(combinedData.scoutingData, scoutingJson);
          scoutingCompressed = true;
          if (import.meta.env.DEV) {
            console.log(`🗜️ Compressed scouting data: ${scoutingJson.length} → ${scoutingData.length} bytes`);
          }
        }
        
        let profilesCompressed = false;
        let profilesData: Uint8Array | { scouts: unknown[]; predictions: unknown[] } = combinedData.scoutProfiles;
        const profilesJson = JSON.stringify(combinedData.scoutProfiles);
        
        // Compress scout profiles if they qualify (using lower 1KB threshold)
        if (profilesJson.length > COMPRESSION_THRESHOLD_SCOUT_PROFILES) {
          profilesData = compressScoutProfiles(
            combinedData.scoutProfiles.scouts, 
            combinedData.scoutProfiles.predictions,
            profilesJson
          );
          profilesCompressed = true;
          if (import.meta.env.DEV) {
            console.log(`🗜️ Compressed scout profiles: ${profilesJson.length} → ${profilesData.length} bytes`);
          }
        }
        
        // Build the combined structure with compression flags
        // Convert compressed Uint8Arrays to base64 to avoid massive JSON array overhead
        const finalCombinedData = {
          type: combinedData.type,
          scoutingData: createCompressionWrapper(scoutingCompressed, scoutingData),
          scoutProfiles: createCompressionWrapper(profilesCompressed, profilesData),
          metadata: combinedData.metadata
        };
        
        const finalJson = JSON.stringify(finalCombinedData);
        encodedData = new TextEncoder().encode(finalJson);
        
        const scoutingInfo = scoutingCompressed 
          ? `${scoutingJson.length} → ${(scoutingData as Uint8Array).length}` 
          : `${scoutingJson.length}`;
        const profilesInfo = profilesCompressed 
          ? `${profilesJson.length} → ${(profilesData as Uint8Array).length}` 
          : `${profilesJson.length}`;
        
        currentCompressionInfo = `Combined (Scouting: ${scoutingInfo}, Profiles: ${profilesInfo}) → ${encodedData.length} bytes total`;
        
        if (scoutingCompressed || profilesCompressed) {
          const parts = [];
          if (scoutingCompressed) parts.push('scouting data');
          if (profilesCompressed) parts.push('scout profiles');
          toast.success(`Compressed ${parts.join(' and ')}!`);
        }
      } else {
        const jsonString = JSON.stringify(dataToUse);
        encodedData = new TextEncoder().encode(jsonString);
        currentCompressionInfo = `Standard JSON: ${encodedData.length} bytes`;
      }
    } else if (dataType === 'scouting' && isScoutingDataCollection(dataToUse)) {
      // Scouting data standalone - use advanced compression
      const jsonString = JSON.stringify(dataToUse);
      
      if (shouldUseCompression(dataToUse, jsonString)) {
        if (import.meta.env.DEV) {
          console.log('🗜️ Using Phase 3 advanced compression for scouting data...');
        }
        encodedData = compressScoutingData(dataToUse, jsonString);
        const stats = getCompressionStats(dataToUse, encodedData, jsonString);
        currentCompressionInfo = `Advanced compression: ${stats.originalSize} → ${stats.compressedSize} bytes (${(100 - stats.compressionRatio * 100).toFixed(1)}% reduction, ${stats.estimatedQRReduction})`;
        toast.success(`Advanced compression: ${(100 - stats.compressionRatio * 100).toFixed(1)}% size reduction!`);
      } else {
        encodedData = new TextEncoder().encode(jsonString);
        currentCompressionInfo = `Scouting data (uncompressed): ${encodedData.length} bytes`;
      }
    } else {
      // Other data types or unrecognized format - use standard JSON encoding
      const jsonString = JSON.stringify(dataToUse);
      encodedData = new TextEncoder().encode(jsonString);
      currentCompressionInfo = `Standard JSON: ${encodedData.length} bytes`;
    }
    
    // Store compression info for display
    setCompressionInfo(currentCompressionInfo);
    
    // Validate data size - need sufficient data for meaningful fountain codes
    // Use compressed threshold if compression info mentions compression
    const isCompressed = currentCompressionInfo.toLowerCase().includes('compress');
    const minDataSize = isCompressed ? MIN_FOUNTAIN_SIZE_COMPRESSED : MIN_FOUNTAIN_SIZE_UNCOMPRESSED;
    if (encodedData.length < minDataSize) {
      toast.error(`${dataType} data is too small (${encodedData.length} bytes). Need at least ${minDataSize} bytes for fountain code generation.`);
      console.warn(`Data too small for fountain codes: ${encodedData.length} bytes (min: ${minDataSize})`);
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log(`📊 ${currentCompressionInfo}`);
    }
        
    const blockSize = 200;
    const ltEncoder = createEncoder(encodedData, blockSize);
    const newSessionId = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const generatedPackets: FountainPacket[] = [];
    let packetId = 0;
    const seenIndicesCombinations = new Set();
    let iterationCount = 0;
    
    // Calculate how many blocks we have for intelligent packet generation
    const estimatedBlocks = Math.ceil(encodedData.length / blockSize);
    
    // For small datasets, we need MORE redundancy because fountain codes work better with larger datasets
    // Small datasets (< 20 blocks) need 50% redundancy, larger datasets need 30%
    const redundancyFactor = estimatedBlocks < 20 ? 1.5 : 1.3;
    const targetPackets = Math.ceil(estimatedBlocks * redundancyFactor);
    
    // Cap maximum iterations to prevent infinite loops (generous safety limit)
    const maxIterations = targetPackets * 5;

    if (import.meta.env.DEV) {
      console.log(`📊 Fountain code generation: ${estimatedBlocks} blocks, targeting ${targetPackets} packets (${Math.round((redundancyFactor - 1) * 100)}% redundancy)`);
    }

    for (const block of ltEncoder.fountain()) {
      iterationCount++;
      
      // Safety check to prevent infinite loops
      if (iterationCount > maxIterations) {
        console.warn(`⚠️ Reached maximum iterations (${maxIterations}), stopping generation with ${generatedPackets.length} packets`);
        console.warn(`Target was ${targetPackets} packets, achieved ${Math.round((generatedPackets.length / targetPackets) * 100)}%`);
        break;
      }
      
      // Stop when we have enough packets for reliable decoding
      if (generatedPackets.length >= targetPackets) {
        if (import.meta.env.DEV) {
          console.log(`✅ Generated target ${targetPackets} packets, stopping`);
        }
        break;
      }
      
      try {
        const indicesKey = block.indices.sort().join(',');
        if (seenIndicesCombinations.has(indicesKey)) {
          console.log(`⏭️ Skipping duplicate indices combination: [${indicesKey}] (${generatedPackets.length}/${targetPackets} packets so far)`);
          continue;
        }
        seenIndicesCombinations.add(indicesKey);

        const binary = blockToBinary(block);
        const base64Data = fromUint8Array(binary);
        
        const packet: FountainPacket = {
          type: `${dataType}_fountain_packet`,
          sessionId: newSessionId,
          packetId,
          k: block.k,
          bytes: block.bytes,
          checksum: String(block.checksum),
          indices: block.indices,
          data: base64Data
        };

        const packetJson = JSON.stringify(packet);

        if (packetJson.length > (QR_CODE_SIZE_BYTES * 0.9)) { // 90% of QR capacity to leave room for encoding overhead
          console.warn(`📦 Packet ${packetId} too large (${packetJson.length} chars), skipping (${generatedPackets.length}/${targetPackets} packets so far)`);
          continue;
        }

        generatedPackets.push(packet);
        packetId++;
      } catch (error) {
        console.error(`Error generating packet ${packetId}:`, error);
        break;
      }
    }
    
    setPackets(generatedPackets);
    setCurrentPacketIndex(0);
    setIsPaused(false); // Start playing automatically
    setJumpToPacket(''); // Clear jump input
    
    // Track the last exported match for "from last export" filtering
    if (isScoutingDataCollection(dataToUse) && (dataType === 'scouting' || dataType === 'combined')) {
      const matchRange = extractMatchRange(dataToUse);
      setLastExportedMatch(matchRange.max);
    }
    
    const selectedSpeed = speedPresets.find(s => s.value === cycleSpeed);
    const estimatedTime = Math.round((generatedPackets.length * cycleSpeed) / 1000);
    toast.success(`Generated ${generatedPackets.length} packets - cycling at ${selectedSpeed?.label}! (~${estimatedTime}s per cycle)`);
  };

  // Auto-cycle packets based on selected speed (respects pause state)
  useEffect(() => {
    if (packets.length > 0 && !isPaused) {
      const interval = setInterval(() => {
        setCurrentPacketIndex(prev => (prev + 1) % packets.length);
      }, cycleSpeed);

      return () => clearInterval(interval);
    }
  }, [packets.length, cycleSpeed, isPaused]);

  // Navigation helper functions
  const togglePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const goToNextPacket = () => {
    setCurrentPacketIndex(prev => (prev + 1) % packets.length);
  };

  const goToPrevPacket = () => {
    setCurrentPacketIndex(prev => (prev - 1 + packets.length) % packets.length);
  };

  const jumpToSpecificPacket = () => {
    const packetNum = parseInt(jumpToPacket);
    if (packetNum >= 1 && packetNum <= packets.length) {
      setCurrentPacketIndex(packetNum - 1); // Convert to 0-based index
      setJumpToPacket('');
      toast.success(`Jumped to packet ${packetNum}`);
    } else {
      toast.error(`Invalid packet number. Must be between 1 and ${packets.length}`);
    }
  };

  const goToFirstPacket = () => {
    setCurrentPacketIndex(0);
  };

  const goToLastPacket = () => {
    setCurrentPacketIndex(packets.length - 1);
  };

  // Helper function to check if data is sufficient for fountain code generation
  const isDataSufficient = () => {
    const dataToCheck = getDataForGeneration();
    if (!dataToCheck) return false;
    
    // Cache JSON string to avoid duplicate serialization
    const jsonString = JSON.stringify(dataToCheck);
    
    // Check if compression would be used
    const useCompression = shouldUseCompression(dataToCheck, jsonString) && 
                          (dataType === 'scouting' || dataType === 'combined');
    const minSize = useCompression ? MIN_FOUNTAIN_SIZE_COMPRESSED : MIN_FOUNTAIN_SIZE_UNCOMPRESSED;
    
    if (useCompression && isScoutingDataCollection(dataToCheck)) {
      // Use actual compression to get accurate size estimate
      try {
        const compressed = compressScoutingData(dataToCheck, jsonString);
        const compressedSize = compressed.length;
        return compressedSize >= minSize;
      } catch (error) {
        // Fallback to rough estimate if compression fails
        if (import.meta.env.DEV) {
          console.warn('Compression size estimation failed, using fallback:', error);
        }
        // Conservative compression ratio estimate for fallback
        const CONSERVATIVE_COMPRESSION_RATIO = 0.1;
        const estimatedCompressedSize = Math.floor(jsonString.length * CONSERVATIVE_COMPRESSION_RATIO);
        return estimatedCompressedSize >= minSize;
      }
    } else {
      // Standard JSON size check
      const encodedData = new TextEncoder().encode(jsonString);
      return encodedData.length >= minSize;
    }
  };

  const getDataSizeInfo = () => {
    const dataToCheck = getDataForGeneration();
    if (!dataToCheck) return null;
    
    // Cache JSON string to avoid duplicate serialization
    const jsonString = JSON.stringify(dataToCheck);
    const useCompression = shouldUseCompression(dataToCheck, jsonString) && 
                          (dataType === 'scouting' || dataType === 'combined');
    const minSize = useCompression ? MIN_FOUNTAIN_SIZE_COMPRESSED : MIN_FOUNTAIN_SIZE_UNCOMPRESSED;
    
    const encodedData = new TextEncoder().encode(jsonString);
    
    return {
      size: encodedData.length,
      sufficient: encodedData.length >= minSize,
      compressed: useCompression
    };
  };

  const currentPacket = packets[currentPacketIndex];
  const currentSpeedLabel = speedPresets.find(s => s.value === cycleSpeed)?.label;
  const dataSizeInfo = getDataSizeInfo();

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-6 px-4 pt-[var(--header-height)] pb-6">
      <div className="flex flex-col items-center gap-4 max-w-md w-full pb-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between w-full">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            ← Back
          </Button>
          {onSwitchToScanner && (
            <Button 
              onClick={onSwitchToScanner} 
              variant="outline" 
              size="sm"
            >
              Switch to Scanner
            </Button>
          )}
        </div>

        {/* Data Filtering - Only show for large scouting datasets */}
        {showFiltering && data && !packets.length ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">Data Filtering</CardTitle>
              <CardDescription className="text-center">
                Reduce QR codes by filtering to specific teams or matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataFilteringControls
                data={data as ScoutingDataCollection}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onApplyFilters={handleApplyFilters}
                useCompression={shouldUseCompression(data) && (dataType === 'scouting' || dataType === 'combined')}
                filteredData={filteredData}
              />
            </CardContent>
          </Card>
        ) : null}

        {!packets.length ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">{title}</CardTitle>
              <CardDescription className="text-center">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Speed Selection */}
              <div className="w-full">
                <p className="text-sm font-medium mb-2 text-center">Cycle Speed:</p>
                <div className="grid grid-cols-2 gap-2">
                  {speedPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={cycleSpeed === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCycleSpeed(preset.value)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateFountainPackets}
                className="w-full h-12"
                disabled={!isDataSufficient()}
              >
                Generate & Start Auto-Cycling
              </Button>
              
              {!data ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {noDataMessage}
                  </AlertDescription>
                </Alert>
              ) : data && !isDataSufficient() ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {dataType} data is too small ({dataSizeInfo?.size || 0} bytes). 
                    Need at least {dataSizeInfo?.compressed ? MIN_FOUNTAIN_SIZE_COMPRESSED : MIN_FOUNTAIN_SIZE_UNCOMPRESSED} bytes for fountain code generation.
                    {dataSizeInfo?.compressed && ' (Compressed data threshold)'}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Scanning Instructions */}
            <Alert>
              <AlertTitle>📱 Scanning Instructions</AlertTitle>
              <AlertDescription>
                Point your scanner at the QR code. Use playback controls to pause, navigate, or jump to specific packets. 
                Estimated time per cycle: {Math.round((packets.length * cycleSpeed) / 1000)}s
              </AlertDescription>
            </Alert>

            {/* QR Code Display */}
            <Card className="w-full">
              <CardContent className="p-4 flex justify-center">
                {currentPacket && (
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <QRCodeSVG
                      value={JSON.stringify(currentPacket)}
                      size={300}
                      level="L"
                      includeMargin={false}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Speed & Playback Controls */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-sm">Speed & Playback Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Speed Selection */}
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Cycle Speed:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {speedPresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={cycleSpeed === preset.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCycleSpeed(preset.value)}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Play/Pause and Step Controls */}
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Navigation:</p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={goToFirstPacket}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={goToPrevPacket}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={togglePlayPause}
                      variant={isPaused ? "default" : "secondary"}
                      size="sm"
                      className="flex-2"
                    >
                      {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                      {isPaused ? "Play" : "Pause"}
                    </Button>
                    <Button
                      onClick={goToNextPacket}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={goToLastPacket}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Jump to Packet */}
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Jump to Packet:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Packet #"
                      value={jumpToPacket}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow numeric input
                        if (value === '' || /^\d+$/.test(value)) {
                          setJumpToPacket(value);
                        }
                      }}
                      min="1"
                      max={packets.length}
                      className="flex-1"
                    />
                    <Button
                      onClick={jumpToSpecificPacket}
                      variant="outline"
                      size="sm"
                      disabled={!jumpToPacket || parseInt(jumpToPacket) < 1 || parseInt(jumpToPacket) > packets.length}
                    >
                      Jump
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Info className="inline mt-0.5 text-muted-foreground flex-shrink-0" size={16}/>
                  <p className="text-xs text-muted-foreground">
                    If unable to get final packets, try slowing down the cycle speed or use manual navigation.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Packet Info */}
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Packet #{currentPacket.packetId + 1}
                  </CardTitle>
                  <Badge variant="outline">
                    {currentSpeedLabel}
                  </Badge>
                </div>
                <CardDescription>
                  Broadcasting {packets.length} fountain packets
                  {compressionInfo && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {compressionInfo}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Indices:</span> 
                    <span className="ml-1 break-all">
                      {currentPacket.indices.length > 20 
                        ? `[${currentPacket.indices.slice(0, 20).join(',')}...+${currentPacket.indices.length - 20} more]`
                        : `[${currentPacket.indices.join(',')}]`
                      }
                    </span>
                  </div>
                  <p><span className="font-medium">K:</span> {currentPacket.k} | <span className="font-medium">Bytes:</span> {currentPacket.bytes}</p>
                  <p><span className="font-medium">Checksum:</span> {String(currentPacket.checksum).slice(0, 8)}...</p>
                </div>

                {/* Progress Indicator */}
                <div className="w-full">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current cycle:</span>
                    <span>{currentPacketIndex + 1}/{packets.length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all ease-linear"
                      style={{ 
                        width: `${((currentPacketIndex + 1) / packets.length) * 100}%`,
                        transitionDuration: `${cycleSpeed}ms`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <Button
              onClick={() => {
                setPackets([]);
                setCurrentPacketIndex(0);
                setIsPaused(false);
                setJumpToPacket('');
              }}
              variant="secondary"
              className="w-full"
            >
              Stop & Generate New Packets
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalFountainGenerator;
