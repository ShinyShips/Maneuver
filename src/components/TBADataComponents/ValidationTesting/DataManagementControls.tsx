import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Trash2 } from 'lucide-react';

interface DataManagementControlsProps {
  tbaApiKey: string;
  onTbaApiKeyChange: (value: string) => void;
  onCheckData: () => void;
  onClearData: () => void;
  generating: boolean;
  showApiKeyInput: boolean;
}

export const DataManagementControls: React.FC<DataManagementControlsProps> = ({
  tbaApiKey,
  onTbaApiKeyChange,
  onCheckData,
  onClearData,
  generating,
  showApiKeyInput,
}) => {
  return (
    <>
      {showApiKeyInput && (
        <div className="space-y-2">
          <Label htmlFor="tbaKey">TBA API Key</Label>
          <Input
            id="tbaKey"
            type="password"
            value={tbaApiKey}
            onChange={(e) => onTbaApiKeyChange(e.target.value)}
            placeholder="Enter your TBA API key"
            disabled={generating}
          />
        </div>
      )}

      {/* Data Management Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onCheckData}
          variant="outline"
          disabled={generating}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Check Data
        </Button>
        <Button
          onClick={onClearData}
          variant="destructive"
          disabled={generating}
          className="flex-1"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Data
        </Button>
      </div>
    </>
  );
};
