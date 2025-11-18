/**
 * Scout Connected Card - shows the connected status for scouts
 */

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ScoutConnectedCardProps {
  roleName: string;
  onDisconnect: () => void;
}

export function ScoutConnectedCard({
  roleName,
  onDisconnect
}: ScoutConnectedCardProps) {
  return (
    <>
      <Card className="w-full border-2 border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Connected as Scout
          </CardTitle>
          <CardDescription>Ready to send data when requested</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-lg font-semibold">{roleName}</p>
            <Badge variant="secondary" className="mt-2">Ready ✓</Badge>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onDisconnect}
        variant="destructive"
        className="w-full"
        size="lg"
      >
        Disconnect
      </Button>
    </>
  );
}
