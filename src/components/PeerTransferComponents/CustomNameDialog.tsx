/**
 * Custom Name Dialog Component
 * Used in Lead Scout mode to enter custom names for scouts
 */

import Button from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customNameInput: string;
  onCustomNameInputChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function CustomNameDialog({
  open,
  onOpenChange,
  customNameInput,
  onCustomNameInputChange,
  onSubmit,
  onCancel,
}: CustomNameDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Scout Name</DialogTitle>
          <DialogDescription>
            Enter a custom name for this scout (e.g., "Pit Scout", "Strategy Lead", etc.)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Scout name..."
            value={customNameInput}
            onChange={(e) => onCustomNameInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Create QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
