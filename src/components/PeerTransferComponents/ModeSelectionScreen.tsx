import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Wifi, UserCheck, Users } from 'lucide-react';

interface ModeSelectionScreenProps {
  onSelectLead: () => void;
  onSelectScout: () => void;
}

export function ModeSelectionScreen({ onSelectLead, onSelectScout }: ModeSelectionScreenProps) {
  return (
    <div className="h-screen w-full flex flex-col items-center px-4 pt-6 pb-8 md:pb-6 overflow-y-auto">
      <div className="flex flex-col items-left gap-4 max-w-md w-full">
        <h1 className="text-2xl font-bold">WiFi Transfer</h1>
        <p className="text-muted-foreground">
          Fast peer-to-peer transfer when network available
        </p>

        {/* Network Requirements */}
        <Alert className="w-full">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <strong>Requirements:</strong> All devices need internet connectivity (WiFi or cellular data) for WebRTC to establish peer connections.
            <br/><br/>
            <strong>Best for:</strong> Fast bulk transfers when network is available. Lead can push data to multiple scouts simultaneously.
            <br/><br/>
            <strong>No network available?</strong> Use the standard QR Code transfer method instead.
          </AlertDescription>
        </Alert>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-semibold text-primary">Lead Scout:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Generate a 6-digit room code</li>
                <li>Share code with scouts (verbal/text/display)</li>
                <li>Wait for scouts to join your room</li>
                <li>Request or push data to connected scouts</li>
                <li>Push: Send match schedule, scouting data, or profiles</li>
              </ol>
            </div>
            
            <Separator />
            
            <div>
              <p className="font-semibold text-primary">Scouts:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Enter lead's 6-digit room code and connect</li>
                <li>Approve/decline when lead requests or pushes data</li>
                <li>Connection persists even when navigating away</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={onSelectLead}
            className="w-full h-14 text-lg"
            size="lg"
          >
            <UserCheck className="h-5 w-5 mr-2" />
            I'm the Lead Scout
          </Button>

          <Button
            onClick={onSelectScout}
            variant="outline"
            className="w-full h-14 text-lg"
            size="lg"
          >
            <Wifi className="h-5 w-5 mr-2" />
            I'm a Scout
          </Button>
        </div>
      </div>
    </div>
  );
}
