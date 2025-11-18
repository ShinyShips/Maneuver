/**
 * Scout Mode Component
 * Handles the scout's 3-step connection workflow:
 * 1. Scan lead's QR code
 * 2. Display answer QR for lead to scan
 * 3. Connected and ready to respond to data requests
 */

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import { QRScannerCard, ScoutAnswerQRCard, ScoutConnectedCard } from '@/components/PeerTransferComponents';
import { convertTeamRole } from '@/lib/utils';

interface ScoutModeProps {
  // Connection state
  role: string | null;
  myRole: string;
  scoutAnswer: string | null;
  scoutOfferReceived: boolean;
  connectionStatus: string;
  
  // QR Connection state
  showScanner: boolean;
  setShowScanner: (show: boolean) => void;
  
  // Handlers
  onBack: () => void;
  onCancel: () => void;
  onOfferScan: (data: string) => void;
}

export const ScoutMode = ({
  role,
  myRole,
  scoutAnswer,
  scoutOfferReceived,
  connectionStatus,
  showScanner,
  setShowScanner,
  onBack,
  onCancel,
  onOfferScan,
}: ScoutModeProps) => {
  const roleDisplay = convertTeamRole(myRole) || myRole;

  // Step 1: Scan lead's QR
  if (!role) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
        <div className="flex flex-col items-start gap-6 max-w-md w-full">
          <Button onClick={onBack} variant="ghost" size="sm">
            ← Back
          </Button>

          <div className="w-full">
            <h1 className="text-2xl font-bold mb-2">Scout Setup</h1>
            <p className="text-muted-foreground">
              Scan the lead scout's QR code
            </p>
          </div>

          {!showScanner ? (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Ready to Connect</CardTitle>
                <CardDescription>Connecting as: {roleDisplay}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Scan Lead's QR Code
                </Button>
              </CardContent>
            </Card>
          ) : (
            <QRScannerCard
              title="Ready to Connect"
              description={`Connecting as: ${roleDisplay}`}
              onScan={onOfferScan}
              onCancel={() => setShowScanner(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // Step 2: Show answer QR to lead
  if (scoutAnswer && !scoutOfferReceived) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
        <div className="flex flex-col items-start gap-6 max-w-md w-full">
          <Button onClick={onCancel} variant="ghost" size="sm">
            ← Cancel
          </Button>

          <ScoutAnswerQRCard
            answer={scoutAnswer}
            roleName={roleDisplay}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>
    );
  }

  // Step 3: Connected, waiting for requests
  return (
    <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
      <div className="flex flex-col items-start gap-6 max-w-md w-full">
        <Button onClick={onBack} variant="ghost" size="sm">
          ← Back
        </Button>

        <ScoutConnectedCard
          roleName={roleDisplay}
          onDisconnect={onCancel}
        />
      </div>
    </div>
  );
};
