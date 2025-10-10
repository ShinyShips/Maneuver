import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FountainCodeGenerator from "@/components/DataTransferComponents/FountainCodeGenerator";
import FountainCodeScanner from "@/components/DataTransferComponents/FountainCodeScanner";
import MatchDataFountainGenerator from "@/components/DataTransferComponents/MatchDataFountainGenerator";
import MatchDataFountainScanner from "@/components/DataTransferComponents/MatchDataFountainScanner";
import ScoutProfilesFountainGenerator from "@/components/DataTransferComponents/ScoutProfilesFountainGenerator";
import ScoutProfilesFountainScanner from "@/components/DataTransferComponents/ScoutProfilesFountainScanner";
import CombinedDataFountainGenerator from "@/components/DataTransferComponents/CombinedDataFountainGenerator";
import CombinedDataFountainScanner from "@/components/DataTransferComponents/CombinedDataFountainScanner";
import PitScoutingFountainGenerator from "@/components/DataTransferComponents/PitScoutingFountainGenerator";
import PitScoutingFountainScanner from "@/components/DataTransferComponents/PitScoutingFountainScanner";

type DataType = 'scouting' | 'match' | 'scout' | 'combined' | 'pit-scouting';

const QRDataTransferPage = () => {
  const [mode, setMode] = useState<'select' | 'generate' | 'scan'>('select');
  const [dataType, setDataType] = useState<DataType>('scouting');

  if (mode === 'generate') {
    if (dataType === 'scouting') {
      return (
        <FountainCodeGenerator 
          onBack={() => setMode('select')} 
          onSwitchToScanner={() => setMode('scan')} 
        />
      );
    } else if (dataType === 'match') {
      return (
        <MatchDataFountainGenerator 
          onBack={() => setMode('select')} 
          onSwitchToScanner={() => setMode('scan')} 
        />
      );
    } else if (dataType === 'scout') {
      return (
        <ScoutProfilesFountainGenerator 
          onBack={() => setMode('select')} 
          onSwitchToScanner={() => setMode('scan')} 
        />
      );
    } else if (dataType === 'pit-scouting') {
      return (
        <PitScoutingFountainGenerator 
          onBack={() => setMode('select')} 
          onSwitchToScanner={() => setMode('scan')} 
        />
      );
    } else {
      return (
        <CombinedDataFountainGenerator 
          onBack={() => setMode('select')} 
          onSwitchToScanner={() => setMode('scan')} 
        />
      );
    }
  }

  if (mode === 'scan') {
    if (dataType === 'scouting') {
      return (
        <FountainCodeScanner 
          onBack={() => setMode('select')} 
          onSwitchToGenerator={() => setMode('generate')} 
        />
      );
    } else if (dataType === 'match') {
      return (
        <MatchDataFountainScanner 
          onBack={() => setMode('select')} 
          onSwitchToGenerator={() => setMode('generate')} 
        />
      );
    } else if (dataType === 'scout') {
      return (
        <ScoutProfilesFountainScanner 
          onBack={() => setMode('select')} 
          onSwitchToGenerator={() => setMode('generate')} 
        />
      );
    } else if (dataType === 'pit-scouting') {
      return (
        <PitScoutingFountainScanner 
          onBack={() => setMode('select')} 
          onSwitchToGenerator={() => setMode('generate')} 
        />
      );
    } else {
      return (
        <CombinedDataFountainScanner 
          onBack={() => setMode('select')} 
          onSwitchToGenerator={() => setMode('generate')} 
        />
      );
    }
  }

  return (
    <div className="h-screen w-full flex flex-col items-center px-4 pt-6 pb-6">
      <div className="flex flex-col items-start gap-4 max-w-md w-full">
        <h1 className="text-2xl font-bold">QR Data Transfer</h1>
        <p className="text-muted-foreground">
          Transfer large data files using fountain codes. Scan packets in any order until reconstruction is complete. Note: Pit scouting transfers include text data only - use JSON transfer for images.
        </p>

        {/* Data Type Selection */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Select Data Type</CardTitle>
            <CardDescription>
              Choose what type of data you want to transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Combined (Scouting + Profiles)</SelectItem>
                <SelectItem value="scouting">Scouting Data</SelectItem>
                <SelectItem value="pit-scouting">Pit Scouting Data (no images)</SelectItem>
                <SelectItem value="match">Match Schedule Data</SelectItem>
                <SelectItem value="scout">Scout Profiles</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 w-full">
          <Button
            onClick={() => setMode('generate')}
            className="w-full h-16 text-xl"
          >
            Generate Fountain Codes
          </Button>
          
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
          
          <Button
            onClick={() => setMode('scan')}
            variant="outline"
            className="w-full h-16 text-xl"
          >
            Scan Fountain Codes
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-start space-y-1">
          <p>• Codes can be scanned in any order</p>
          <p>• No need to receive all codes</p>
          <p>• Automatic reconstruction when enough data is received</p>
          <p>• Pit scouting transfers text only (team specs, capabilities, notes)</p>
          <p>• Use JSON Data Transfer for robot photos</p>
        </div>
      </div>
    </div>
  );
};

export default QRDataTransferPage;