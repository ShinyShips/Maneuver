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
import { type CompressedEntry } from '@/lib/compressionUtils';

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
  dataType: 'scouting' | 'match' | 'scouter' | 'combined' | 'pit-scouting' | 'pit-images';
  expectedPacketType: string;
  saveData: (data: unknown) => void;
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
  
  // Use refs for immediate access without React state delays
  const decoderRef = useRef<unknown>(null);
  const packetsRef = useRef<Map<number, FountainPacket>>(new Map());
  const sessionRef = useRef<string | null>(null);

  // Helper function to add debug messages (dev-only)
  const addDebugMsg = (message: string) => {
    if (import.meta.env.DEV) {
      setDebugLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  const handleQRScan = (result: { rawValue: string; }[]) => {
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
                  const scouterDict = decompressedData.meta.scouterDict || [];
                  const eventDict = decompressedData.meta.eventDict || [];
                  const allianceReverse = ['redAlliance', 'blueAlliance'] as const;
                  addDebugMsg(`🔍 Scouter dictionary: ${scouterDict.length} entries`);
                  addDebugMsg(`🔍 Event dictionary: ${eventDict.length} entries`);
                  
                  // Expand compressed entries back to full format
                  const expandedEntries = decompressedData.entries.map((compressed: CompressedEntry, index: number) => {
                    addDebugMsg(`🔍 Expanding entry ${index}: ${JSON.stringify(compressed).substring(0, 100)}...`);
                    const expanded: Record<string, unknown> = {};
                    
                    // Expand dictionary-compressed fields
                    if (typeof compressed.a === 'number') expanded.alliance = allianceReverse[compressed.a];
                    if (typeof compressed.s === 'number') expanded.scouterInitials = scouterDict[compressed.s];
                    if (typeof compressed.sf === 'string') expanded.scouterInitials = compressed.sf;
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
                    
                    // Expand auto coral counts (default to 0 if not present)
                    if (Array.isArray(compressed.ac)) {
                      expanded.autoCoralPlaceL1Count = compressed.ac[0] || 0;
                      expanded.autoCoralPlaceL2Count = compressed.ac[1] || 0;
                      expanded.autoCoralPlaceL3Count = compressed.ac[2] || 0;
                      expanded.autoCoralPlaceL4Count = compressed.ac[3] || 0;
                    } else {
                      // Ensure these fields exist even if not in compressed data
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
                    
                    // Expand endgame booleans (including autoPassedStartLine)
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
                      timestamp: Date.now()
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
              
              saveData(parsedData);
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

      // Update progress estimate
      const received = packetsRef.current.size;
      const estimatedNeeded = Math.max(packet.k + 3, 10);
      const progressPercentage = Math.min((received / estimatedNeeded) * 100, 95);
      
      setProgress({ 
        received, 
        needed: estimatedNeeded, 
        percentage: progressPercentage 
      });
      
      addDebugMsg(`📈 Progress: ${received}/${estimatedNeeded} (${progressPercentage.toFixed(1)}%)`);

    } catch (error) {
      addDebugMsg(`❌ QR scan error: ${error instanceof Error ? error.message : String(error)}`);
      console.error("QR scan error:", error);
      toast.error("Error processing QR code");
    }
  };

  const resetScanner = () => {
    sessionRef.current = null;
    setCurrentSession(null);
    setIsComplete(false);
    setReconstructedData(null);
    setProgress({ received: 0, needed: 0, percentage: 0 });
    setDebugLog([]);
    setAllowDuplicates(false);
    setCompressionDetected(null);
    decoderRef.current = null;
    packetsRef.current.clear();
    addDebugMsg("🔄 Scanner reset");
    toast.info("Scanner reset");
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
              </div>
            )}

            <div className="flex gap-2 w-full">
              {currentSession && (
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="flex-1"
                >
                  Reset Scanner
                </Button>
              )}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => setAllowDuplicates(!allowDuplicates)}
                  variant={allowDuplicates ? "default" : "outline"}
                  className="flex-1"
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

        <Alert>
          <AlertTitle>📱 Scanning Instructions</AlertTitle>
          <AlertDescription>
            Scan fountain code packets in any order. No need to scan all packets - reconstruction will complete automatically when enough data is received.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default UniversalFountainScanner;
