import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ClearAllDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  scoutingDataCount: number;
  pitScoutingDataCount: number;
  scoutGameDataCount: number;
  apiDataCount: number;
  matchDataCount: number;
}

export const ClearAllDataDialog = ({
  open,
  onOpenChange,
  onConfirm,
  scoutingDataCount,
  pitScoutingDataCount,
  scoutGameDataCount,
  apiDataCount,
  matchDataCount,
}: ClearAllDataDialogProps) => {
  const handleConfirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Clear All Data - Complete Reset
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="font-medium text-foreground">
                This will permanently delete ALL data from this device:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• {scoutingDataCount} scouting entries</li>
                <li>• {pitScoutingDataCount} pit scouting entries</li>
                <li>• {scoutGameDataCount} scout profile entries</li>
                <li>• {apiDataCount} API data items</li>
                <li>• {matchDataCount} match schedule entries</li>
                <li>• All settings and preferences</li>
                <li>• All cached data</li>
              </ul>
              <p className="text-sm text-red-600 font-medium">
                ⚠️ This action cannot be undone. Make sure you have backed up any important data.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="p-4">
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            className="text-white p-4"
          >
            🗑️ Clear Everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
