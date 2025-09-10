import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createEncoder, blockToBinary } from "luby-transform";
import { fromUint8Array } from "js-base64";
import { Info } from "lucide-react";
import { 
  compressScoutingData, 
  shouldUseCompression, 
  getCompressionStats,
  isScoutingDataCollection,
  MIN_FOUNTAIN_SIZE_COMPRESSED,
  MIN_FOUNTAIN_SIZE_UNCOMPRESSED,
  QR_CODE_SIZE_BYTES,
  type ScoutingDataCollection
} from "@/lib/compressionUtils";
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
  dataType: 'scouting' | 'match' | 'scouter' | 'combined' | 'pit-scouting' | 'pit-images';
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
    const shouldShow = dataType === 'scouting' && 
                      isScoutingDataCollection(data) &&
                      data.entries.length > 50;
    
    if (shouldShow) {
      setShowFiltering(true);
      setFilteredData(data);
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
      return filteredData;
    }
    return data;
  };

  const generateFountainPackets = () => {
    const dataToUse = getDataForGeneration();
    if (!dataToUse) {
      toast.error(`No ${dataType} data available`);
      return;
    }

    // Cache JSON string to avoid duplicate serialization
    const jsonString = JSON.stringify(dataToUse);
    
    // Determine if we should use advanced compression
    const useCompression = shouldUseCompression(dataToUse, jsonString) && dataType === 'scouting';
    
    let encodedData: Uint8Array;
    let currentCompressionInfo = '';
    
    if (useCompression && isScoutingDataCollection(dataToUse)) {
      // Use advanced compression for scouting data
      if (import.meta.env.DEV) {
        console.log('🗜️ Using Phase 3 advanced compression...');
      }
      encodedData = compressScoutingData(dataToUse, jsonString);
      const stats = getCompressionStats(dataToUse, encodedData, jsonString);
      currentCompressionInfo = `Advanced compression: ${stats.originalSize} → ${stats.compressedSize} bytes (${(100 - stats.compressionRatio * 100).toFixed(1)}% reduction, ${stats.estimatedQRReduction})`;
      toast.success(`Advanced compression: ${(100 - stats.compressionRatio * 100).toFixed(1)}% size reduction!`);
    } else {
      // Use standard JSON encoding
      encodedData = new TextEncoder().encode(jsonString);
      currentCompressionInfo = `Standard JSON: ${encodedData.length} bytes`;
    }
    
    // Store compression info for display
    setCompressionInfo(currentCompressionInfo);
    
    // Validate data size - need sufficient data for meaningful fountain codes
    // Lower threshold for compressed data since compression can be very effective
    const minDataSize = useCompression ? MIN_FOUNTAIN_SIZE_COMPRESSED : MIN_FOUNTAIN_SIZE_UNCOMPRESSED;
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
    // Generate enough packets for successful decoding: k blocks + 20% overhead for redundancy
    const targetPackets = Math.ceil(estimatedBlocks * 1.2);
    // Cap maximum iterations to prevent infinite loops (generous safety limit)
    const maxIterations = targetPackets * 5;

    if (import.meta.env.DEV) {
      console.log(`📊 Fountain code generation: ${estimatedBlocks} blocks, targeting ${targetPackets} packets`);
    }

    for (const block of ltEncoder.fountain()) {
      iterationCount++;
      
      // Safety check to prevent infinite loops
      if (iterationCount > maxIterations) {
        console.warn(`Reached maximum iterations (${maxIterations}), stopping generation with ${generatedPackets.length} packets`);
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
          console.log(`Skipping duplicate indices combination: [${indicesKey}]`);
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
          console.warn(`Packet ${packetId} too large (${packetJson.length} chars), skipping`);
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
    
    // Track the last exported match for "from last export" filtering
    if (isScoutingDataCollection(dataToUse) && dataType === 'scouting') {
      const matchRange = extractMatchRange(dataToUse);
      setLastExportedMatch(matchRange.max);
    }
    
    const selectedSpeed = speedPresets.find(s => s.value === cycleSpeed);
    const estimatedTime = Math.round((generatedPackets.length * cycleSpeed) / 1000);
    toast.success(`Generated ${generatedPackets.length} packets - cycling at ${selectedSpeed?.label}! (~${estimatedTime}s per cycle)`);
  };

  // Auto-cycle packets based on selected speed
  useEffect(() => {
    if (packets.length > 0) {
      const interval = setInterval(() => {
        setCurrentPacketIndex(prev => (prev + 1) % packets.length);
      }, cycleSpeed);

      return () => clearInterval(interval);
    }
  }, [packets.length, cycleSpeed]);

  // Helper function to check if data is sufficient for fountain code generation
  const isDataSufficient = () => {
    const dataToCheck = getDataForGeneration();
    if (!dataToCheck) return false;
    
    // Cache JSON string to avoid duplicate serialization
    const jsonString = JSON.stringify(dataToCheck);
    
    // Check if compression would be used
    const useCompression = shouldUseCompression(dataToCheck, jsonString) && dataType === 'scouting';
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
    const useCompression = shouldUseCompression(dataToCheck, jsonString) && dataType === 'scouting';
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
                useCompression={shouldUseCompression(data) && dataType === 'scouting'}
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

             {/* Instructions */}
            <Alert>
              <AlertTitle>📱 Scanning Instructions</AlertTitle>
              <AlertDescription>
                Point your scanner at the QR code. Estimated time per cycle: {Math.round((packets.length * cycleSpeed) / 1000)}s
              </AlertDescription>
            </Alert>

            {/* Speed Control */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-sm">Adjust Speed</CardTitle>
              </CardHeader>
              <CardContent>
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
                  <div className="col-span-2 flex items-start">
                    <Info className="inline mr-2 mt-1.5 text-muted-foreground" size={16}/>
                    <p className="text-sm text-muted-foreground col-span-2 pt-1">
                      If unable to get final packets, try slowing down the cycle speed.
                    </p>
                  </div>
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
                  <p><span className="font-medium">Indices:</span> [{currentPacket.indices.join(',')}]</p>
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
