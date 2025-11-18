/**
 * Scout Answer QR Card - displays the scout's answer QR code
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface ScoutAnswerQRCardProps {
  answer: string;
  roleName: string;
  connectionStatus: string;
}

export function ScoutAnswerQRCard({
  answer,
  roleName,
  connectionStatus
}: ScoutAnswerQRCardProps) {
  return (
    <>
      <Card className="w-full border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            Your Answer QR
          </CardTitle>
          <CardDescription className="text-center">
            {roleName}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 space-y-4">
          <QRCodeCanvas 
            value={answer} 
            size={320}
            level="L"
            includeMargin
          />
          <p className="text-xs text-center text-muted-foreground">
            QR Size: {answer.length} chars
          </p>
        </CardContent>
      </Card>

      <Card className="w-full bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>⏳ Waiting for connection...</strong>
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
            Once the lead scout scans your QR, you'll be connected.
          </p>
          {connectionStatus !== 'not-started' && (
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-2 font-mono">
              Status: {connectionStatus}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
