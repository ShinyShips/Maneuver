import { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { createDecoder, binaryToBlock } from "luby-transform";
import { toUint8Array } from "js-base64";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as pako from 'pako';
import { type CompressedEntry, expandCompressedEntry } from '@/lib/compressionUtils';

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

interface UniversalFountainScannerProps {
  onBack: () => void;
  onSwitchToGenerator?: () => void;
  dataType: 'scouting' | 'match' | 'scout' | 'combined' | 'pit-scouting' | 'pit-images';
  expectedPacketType: string;
  saveData: (data: unknown) => void | Promise<void>;
  validateData: (data: unknown) => boolean;
  getDataSummary: (data: unknown) => string;
  title: string;
  description: string;
  completionMessage: string;
}

const UniversalFountainScanner = ({ 
  onBack, 
  onSwitchToGenerator,
  dataType,
  expectedPacketType,
  saveData,
  validateData,
  getDataSummary,
  title,
  description,
  completionMessage
}: UniversalFountainScannerProps) => {
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [reconstructedData, setReconstructedData] = useState<unknown>(null);
  const [progress, setProgress] = useState({ received: 0, needed: 0, percentage: 0 });
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [compressionDetected, setCompressionDetected] = useState<boolean | null>(null);
  const [missingPackets, setMissingPackets] = useState<number[]>([]);
  const [totalPackets, setTotalPackets] = useState<number | null>(null);
  
  // Use refs for immediate access without React state delays
  const decoderRef = useRef<unknown>(null);
  const packetsRef = useRef<Map<number, FountainPacket>>(new Map());
  const sessionRef = useRef<string | null>(null);
  const totalPacketsRef = useRef<number | null>(null);

  // Helper function to add debug messages (dev-only)
  const addDebugMsg = (message: string) => {
    if (import.meta.env.DEV) {
      setDebugLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  // Calculate missing packets based on seen packet IDs
  const calculateMissingPackets = () => {
    const packetIds = Array.from(packetsRef.current.keys()).sort((a, b) => a - b);
    
    if (packetIds.length === 0) return [];
    
    const missing: number[] = [];
    const minId = packetIds[0];
    const maxId = packetIds[packetIds.length - 1];
    
    // Check for gaps in the sequence
    for (let i = minId; i <= maxId; i++) {
      if (!packetsRef.current.has(i)) {
        missing.push(i);
      }
    }
    
    // Update total packets estimate if we have a reasonable range
    const estimatedTotal = maxId;
    if (estimatedTotal !== totalPacketsRef.current) {
      totalPacketsRef.current = estimatedTotal;
      setTotalPackets(estimatedTotal);
      addDebugMsg(`📊 Estimated total packets: ${estimatedTotal} (based on max packet ID: ${maxId})`);
    }
    
    return missing;
  };

  const handleQRScan = async (result: { rawValue: string; }[]) => {
    try {
      const packet: FountainPacket = JSON.parse(result[0].rawValue);
      addDebugMsg(`🎯 Scanned packet ${packet.packetId} with indices [${packet.indices.join(',')}]`);
      addDebugMsg(`🆔 Session: ${packet.sessionId.slice(-8)}`);
      
      if (packet.type !== expectedPacketType) {
        addDebugMsg(`❌ Invalid QR code format - expected ${expectedPacketType}, got ${packet.type}`);
        toast.error("Invalid QR code format");
        return;
      }

      addDebugMsg(`📊 Packets before processing: ${packetsRef.current.size}`);

      // SIMPLIFIED SESSION HANDLING - Don't reset on session changes
      if (!sessionRef.current) {
        addDebugMsg(`🆕 First session: k=${packet.k}, bytes=${packet.bytes}`);
        sessionRef.current = packet.sessionId;
        setCurrentSession(packet.sessionId);
        decoderRef.current = createDecoder();
        toast.info(`Started session: ${packet.sessionId.slice(-8)}`);
      } else if (sessionRef.current !== packet.sessionId) {
        // Just log the session change but DON'T reset anything
        addDebugMsg(`🔄 Session change noted: ${sessionRef.current.slice(-4)} → ${packet.sessionId.slice(-4)}`);
        addDebugMsg(`📌 Continuing with same decoder (ignoring session change)`);
      }

      addDebugMsg(`📊 Packets after session check: ${packetsRef.current.size}`);

      // Check if we already have this packet
      if (packetsRef.current.has(packet.packetId) && !allowDuplicates) {
        addDebugMsg(`🔁 Duplicate packet ${packet.packetId} ignored`);
        addDebugMsg(`🔍 Current: indices [${packet.indices.join(',')}]`);
        return;
      }

      // Store the packet
      packetsRef.current.set(packet.packetId, packet);
      addDebugMsg(`📦 Added packet ${packet.packetId}, total: ${packetsRef.current.size}`);

      // Debug: Show all packet IDs we have
      const allPacketIds = Array.from(packetsRef.current.keys()).sort();
      addDebugMsg(`🔢 All packet IDs: [${allPacketIds.join(',')}]`);

      // Use decoder
      if (decoderRef.current) {
        try {
          // Convert base64 back to binary and create block
          const binaryData = toUint8Array(packet.data);
          const block = binaryToBlock(binaryData);

          // Add block to decoder
          addDebugMsg(`🔧 Adding block to decoder...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isOkay = (decoderRef.current as any).addBlock(block);
          addDebugMsg(`📊 Decoder result: ${isOkay ? 'COMPLETE!' : 'Need more'}`);
          
          if (isOkay) {
            addDebugMsg("🎉 DECODING COMPLETE!");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decodedData = (decoderRef.current as any).getDecoded();
            addDebugMsg(`📊 Decoded data size: ${decodedData.length} bytes`);
            
            let parsedData: unknown;
            
            try {
              // Check if data is gzip compressed (starts with magic bytes 1f 8b)
              const isGzipCompressed = decodedData.length > 2 && 
                                      decodedData[0] === 0x1f && 
                                      decodedData[1] === 0x8b;
              
              if (isGzipCompressed) {
                addDebugMsg("🗜️ Detected compressed data, decompressing...");
                setCompressionDetected(true);
                
                // Decompress gzip
                const decompressed = pako.ungzip(decodedData);
                const jsonString = new TextDecoder().decode(decompressed);
                const decompressedData = JSON.parse(jsonString);
                
                // Check if this is smart compression format
                if (decompressedData && typeof decompressedData === 'object' && 
                    decompressedData.meta && decompressedData.meta.compressed) {
                  addDebugMsg("🔧 Detected smart compression format, expanding data...");
                  addDebugMsg(`🔍 Compressed entries count: ${decompressedData.entries?.length || 0}`);
                  addDebugMsg(`🔍 First compressed entry keys: ${decompressedData.entries?.[0] ? Object.keys(decompressedData.entries[0]).join(', ') : 'none'}`);
                  
                  // Rebuild dictionaries for expansion
                  const scoutDict = decompressedData.meta.scoutDict || [];
                  const eventDict = decompressedData.meta.eventDict || [];
                  addDebugMsg(`🔍 Scout dictionary: ${scoutDict.length} entries`);
                  addDebugMsg(`🔍 Event dictionary: ${eventDict.length} entries`);
                  
                  // Expand compressed entries back to full format using shared function
                  const expandedEntries = decompressedData.entries.map((compressed: CompressedEntry, index: number) => {
                    addDebugMsg(`🔍 Expanding entry ${index}: ${JSON.stringify(compressed).substring(0, 100)}...`);
                    
                    // Use shared expansion function from compressionUtils
                    const expanded = expandCompressedEntry(compressed, scoutDict, eventDict);
                    
                    if (index === 0) {
                      addDebugMsg(`🔍 Sample expanded keys: ${Object.keys(expanded).join(', ')}`);
                      addDebugMsg(`🔍 Sample expanded scoring: ${JSON.stringify({
                        autoCoralL1: expanded.autoCoralPlaceL1Count,
                        teleopCoralL1: expanded.teleopCoralPlaceL1Count,
                        autoAlgaeNet: expanded.autoAlgaePlaceNetShot,
                        teleopAlgaeNet: expanded.teleopAlgaePlaceNetShot,
                        autoPassedStartLine: expanded.autoPassedStartLine
                      })}`);
                    }
                    
                    // Use preserved original ID (should always exist since compression preserves it)
                    const originalId = compressed.id;
                    if (!originalId) {
                      throw new Error(`Missing ID in compressed entry at index ${index}. This may indicate corrupted data or an incompatible compression format. Please regenerate the QR codes or contact support if this persists.`);
                    }
                    
                    return {
                      id: originalId,
                      data: expanded,
                      timestamp: compressed.ts || Date.now() // Preserve original timestamp or use current time as fallback
                    };
                  });
                  
                  parsedData = { entries: expandedEntries };
                  addDebugMsg(`✅ Smart decompression successful (${expandedEntries.length} entries expanded)`);
                  addDebugMsg(`🔍 First expanded entry data: ${JSON.stringify(expandedEntries[0]?.data).substring(0, 150)}...`);
                } else {
                  // Standard JSON format
                  addDebugMsg("📄 Standard JSON format detected");
                  parsedData = decompressedData;
                }
              } else {
                // Uncompressed data - standard JSON decoding
                addDebugMsg("📄 Detected uncompressed data");
                setCompressionDetected(false);
                const jsonString = new TextDecoder().decode(decodedData);
                parsedData = JSON.parse(jsonString);
                addDebugMsg("✅ JSON parsing successful");
              }
            } catch (error) {
              addDebugMsg(`❌ Data processing failed: ${error instanceof Error ? error.message : String(error)}`);
              toast.error("Failed to process reconstructed data");
              return;
            }
            
            // Debug: Log the structure of the parsed data
            addDebugMsg(`🔍 Parsed data type: ${typeof parsedData}`);
            addDebugMsg(`🔍 Data keys: ${parsedData && typeof parsedData === 'object' ? Object.keys(parsedData as Record<string, unknown>).join(', ') : 'N/A'}`);
            if (parsedData && typeof parsedData === 'object' && 'entries' in parsedData) {
              const entries = (parsedData as { entries: unknown }).entries;
              addDebugMsg(`🔍 Entries type: ${typeof entries}, length: ${Array.isArray(entries) ? entries.length : 'N/A'}`);
            }
            
            if (validateData(parsedData)) {
              setReconstructedData(parsedData);
              setIsComplete(true);
              setProgress({ received: packetsRef.current.size, needed: packetsRef.current.size, percentage: 100 });
              
              await saveData(parsedData);
              toast.success(completionMessage);
            } else {
              addDebugMsg("❌ Reconstructed data failed validation");
              addDebugMsg(`❌ Data structure: ${JSON.stringify(parsedData).substring(0, 200)}...`);
              toast.error("Reconstructed data is invalid");
            }
            return;
          }
        } catch (error) {
          addDebugMsg(`🚨 Block error: ${error instanceof Error ? error.message : String(error)}`);
          toast.error("Failed to process packet");
          return;
        }
      }

      // Update progress estimate (IMPROVED: No artificial 95% cap)
      const received = packetsRef.current.size;
      let estimatedNeeded = Math.max(packet.k + 5, 10); // Slightly more conservative estimate
      let progressPercentage = (received / estimatedNeeded) * 100;
      
      // If we're beyond the initial estimate, use a more dynamic approach
      if (received > estimatedNeeded) {
        // Once we exceed the estimate, assume we need ~20% more than current
        estimatedNeeded = Math.ceil(received * 1.2);
        progressPercentage = (received / estimatedNeeded) * 100;
        addDebugMsg(`🔄 Adjusted estimate: now need ~${estimatedNeeded} packets`);
      }
      
      // Cap at 99% instead of 95% to show we're still working
      progressPercentage = Math.min(progressPercentage, 99);
      
      setProgress({ 
        received, 
        needed: estimatedNeeded, 
        percentage: progressPercentage 
      });
      
      // Calculate and update missing packets
      const missing = calculateMissingPackets();
      setMissingPackets(missing);
      
      addDebugMsg(`📈 Progress: ${received}/${estimatedNeeded} (${progressPercentage.toFixed(1)}%)`);
      
      // Log missing packets info
      if (missing.length > 0 && missing.length <= 20) {
        addDebugMsg(`🔍 Missing packets: [${missing.join(', ')}]`);
      } else if (missing.length > 20) {
        addDebugMsg(`🔍 Missing ${missing.length} packets: [${missing.slice(0, 5).join(', ')}, ..., ${missing.slice(-5).join(', ')}]`);
      } else {
        addDebugMsg(`✅ No missing packets in current range!`);
      }
      // Add debugging when we're getting close to completion but decoder isn't ready
      if (received > packet.k && progressPercentage > 90) {
        addDebugMsg(`🔍 High packet count but no completion yet: k=${packet.k}, received=${received}`);
        addDebugMsg(`🔍 Decoder state check needed - may need more packets than theoretical minimum`);
        
        // Alert user if we've scanned significantly more than expected
        if (received > estimatedNeeded * 1.5) {
          addDebugMsg(`⚠️ SCANNING MAY BE STUCK: ${received} packets >> ${estimatedNeeded} estimated`);
          addDebugMsg(`💡 Consider checking the generator for packet navigation controls`);
        }
      }

    } catch (error) {
      addDebugMsg(`❌ QR scan error: ${error instanceof Error ? error.message : String(error)}`);
      console.error("QR scan error:", error);
      toast.error("Error processing QR code");
    }
  };

  const resetScanner = () => {
    sessionRef.current = null;
    setCurrentSession(null);
    decoderRef.current = null;
    packetsRef.current.clear();
    totalPacketsRef.current = null;
    setProgress({ received: 0, needed: 0, percentage: 0 });
    setIsComplete(false);
    setReconstructedData(null);
    setDebugLog([]);
    setCompressionDetected(null);
    setMissingPackets([]);
    setTotalPackets(null);
    addDebugMsg("🔄 Scanner reset");
  };

  const handleComplete = () => {
    toast.success(`${dataType} data loaded successfully!`);
    navigate("/");
  };

  if (isComplete && reconstructedData) {
    return (
      <div className="h-screen w-full flex flex-col items-center px-4 pt-6 pb-6">
        <div className="flex flex-col gap-4 max-w-md w-full">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-green-600">Reconstruction Complete!</CardTitle>
              <CardDescription>
                {completionMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getDataSummary(reconstructedData)}
                </Badge>
                <Badge variant="outline">
                  {progress.received} packets received
                </Badge>
              </div>

              <div className="w-full space-y-2">
                <Button
                  onClick={handleComplete}
                  className="w-full"
                >
                  Continue to App
                </Button>
                
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="w-full"
                >
                  Scan More Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-start space-y-1">
            <p>• Data saved to local storage</p>
            <p>• Ready to use throughout the app</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center gap-6 px-4 pt-[var(--header-height)]">
      <div className="flex flex-col items-center gap-4 max-w-md w-full max-h-full overflow-y-auto">
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
          {onSwitchToGenerator && (
            <Button 
              onClick={onSwitchToGenerator} 
              variant="outline" 
              size="sm"
            >
              Switch to Generator
            </Button>
          )}
        </div>

        {/* Scanning Instructions */}
        {currentSession && (
          <Alert>
            <AlertTitle>📱 Scanning Instructions</AlertTitle>
            <AlertDescription>
              Scan fountain code packets in any order. Reconstruction will complete automatically when enough data is received.
            </AlertDescription>
          </Alert>
        )}

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {currentSession && (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Badge variant="secondary">
                  Session: ...{currentSession.slice(-8)}
                </Badge>
                <Badge variant="outline">
                  {progress.received} packets
                </Badge>
                <Badge variant="outline">
                  {progress.percentage.toFixed(1)}%
                </Badge>
                {compressionDetected === true && (
                  <Badge variant="default" className="bg-green-600">
                    🗜️ Compressed
                  </Badge>
                )}
                {compressionDetected === false && (
                  <Badge variant="outline">
                    📄 Standard
                  </Badge>
                )}
              </div>
            )}

            <div className="w-full h-64 md:h-80 overflow-hidden rounded-lg">
              <Scanner
                components={{ finder: false }}
                styles={{ 
                  video: { 
                    borderRadius: "7.5%",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  } 
                }}
                onScan={handleQRScan}
                onError={() =>
                  toast.error("QR Scanner Error")
                }
              />
            </div>

            {progress.received > 0 && (
              <div className="w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{progress.percentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(progress.percentage, 100)}
                  className="w-full"
                />
                
                {/* Missing packets indicator */}
                {missingPackets.length > 0 && totalPackets && (
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Missing Packets</span>
                      <Badge variant="outline" className="text-xs">
                        {missingPackets.length} missing
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded max-h-16 overflow-y-auto">
                      {missingPackets.length <= 30 ? (
                        <span>#{missingPackets.join(', #')}</span>
                      ) : (
                        <span>
                          #{missingPackets.slice(0, 10).join(', #')} 
                          <span className="text-orange-500"> ... and {missingPackets.length - 10} more</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Complete packets indicator when no missing */}
                {missingPackets.length === 0 && totalPackets && progress.received > 5 && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">All packets in range #{1} - #{totalPackets}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 w-full flex-wrap">
              {currentSession && (
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="flex-1 min-w-0"
                >
                  Reset Scanner
                </Button>
              )}
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => setAllowDuplicates(!allowDuplicates)}
                  variant={allowDuplicates ? "default" : "outline"}
                  className="flex-1 min-w-0"
                  size="sm"
                >
                  {allowDuplicates ? "Allow Dupes ✓" : "Skip Dupes"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {debugLog.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-sm">Debug Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {debugLog.map((log, index) => (
                  <div key={index} className="font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UniversalFountainScanner;
