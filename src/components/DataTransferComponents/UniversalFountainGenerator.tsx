import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createEncoder, blockToBinary } from "luby-transform";
import { fromUint8Array } from "js-base64";

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
  dataType: 'scouting' | 'match';
  loadData: () => unknown;
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
  const [cycleSpeed, setCycleSpeed] = useState(200);

  // Speed presets
  const speedPresets = [
    { label: "Default (2/sec)", value: 500 },
    { label: "Slower (1/sec)", value: 1000 }
  ];

  useEffect(() => {
    try {
      const loadedData = loadData();
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
  }, [loadData, dataType]);

  const generateFountainPackets = () => {
    if (!data) {
      toast.error(`No ${dataType} data available`);
      return;
    }

    const jsonString = JSON.stringify(data);
    const encodedData = new TextEncoder().encode(jsonString);
    
    console.log(`🔧 GENERATING ${dataType.toUpperCase()} FOUNTAIN CODES:`);
    console.log(`- Original data size: ${encodedData.length} bytes`);
    console.log(`- JSON preview: ${jsonString.substring(0, 100)}...`);
    
    const blockSize = 200;
    const ltEncoder = createEncoder(encodedData, blockSize);
    const newSessionId = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const generatedPackets: FountainPacket[] = [];
    let packetId = 0;
    const maxPackets = 30;
    const seenIndicesCombinations = new Set();

    console.log(`- Block size: ${blockSize}`);
    console.log(`- Session ID: ${newSessionId}`);

    for (const block of ltEncoder.fountain()) {
      if (packetId >= maxPackets) break;
      
      try {
        const indicesKey = block.indices.sort().join(',');
        if (seenIndicesCombinations.has(indicesKey)) {
          console.log(`Skipping duplicate indices combination: [${indicesKey}]`);
          continue;
        }
        seenIndicesCombinations.add(indicesKey);

        console.log(`📦 Generating packet ${packetId}:`);
        console.log(`- Block k: ${block.k}`);
        console.log(`- Block indices: [${block.indices.join(',')}]`);

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
        console.log(`- Packet JSON size: ${packetJson.length} chars`);
        
        if (packetJson.length > 1800) {
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

    console.log(`✅ GENERATION COMPLETE:`);
    console.log(`- Generated ${generatedPackets.length} packets total`);
    console.log(`- K value: ${generatedPackets[0]?.k}`);
    console.log(`- Unique index combinations: ${seenIndicesCombinations.size}`);
    
    setPackets(generatedPackets);
    setCurrentPacketIndex(0);
    
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

  const currentPacket = packets[currentPacketIndex];
  const currentSpeedLabel = speedPresets.find(s => s.value === cycleSpeed)?.label || "Custom";

  return (
    <div className="h-screen w-full flex flex-col items-center gap-6 px-4 pt-[var(--header-height)]">
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
                disabled={!data}
              >
                Generate & Start Auto-Cycling
              </Button>
              
              {!data && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {noDataMessage}
                  </AlertDescription>
                </Alert>
              )}
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
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Alert>
              <AlertTitle>📱 Scanning Instructions</AlertTitle>
              <AlertDescription>
                Point your scanner at the QR code. Estimated time per cycle: {Math.round((packets.length * cycleSpeed) / 1000)}s
              </AlertDescription>
            </Alert>

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
