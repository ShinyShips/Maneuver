/**
 * QR Scanner Card - reusable component for scanning QR codes
 */

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera } from 'lucide-react';

interface QRScannerCardProps {
  title: string;
  description: string;
  onScan: (result: string) => void;
  onCancel: () => void;
  cancelButtonText?: string;
}

export function QRScannerCard({
  title,
  description,
  onScan,
  onCancel,
  cancelButtonText = 'Cancel'
}: QRScannerCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Scanner
          onScan={(results) => {
            const result = results[0]?.rawValue;
            if (result) onScan(result);
          }}
          onError={(error) => console.error(error)}
          constraints={{ facingMode: 'environment' }}
          styles={{ container: { width: '100%' } }}
        />
        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full"
        >
          {cancelButtonText}
        </Button>
      </CardContent>
    </Card>
  );
}
