import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Database } from 'lucide-react';

interface EventSwitchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEvent: string;
  newEvent: string;
  hasStoredData: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EventSwitchConfirmDialog: React.FC<EventSwitchConfirmDialogProps> = ({
  open,
  onOpenChange,
  currentEvent,
  newEvent,
  hasStoredData,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Switch Event?
          </DialogTitle>
          <DialogDescription className="space-y-4">
            <div className="space-y-2">
              <p>You're about to switch from one event to another:</p>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Current Event</div>
                    <div className="text-sm text-muted-foreground">{currentEvent}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">New Event</div>
                    <div className="text-sm text-muted-foreground">{newEvent}</div>
                  </div>
                </div>
              </div>
            </div>

            {hasStoredData && (
              <Alert variant="destructive">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> You have stored data for event "{currentEvent}". 
                  Switching to "{newEvent}" may cause confusion if you're working with different event data.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <strong>Recommendation:</strong> Consider clearing stored data for "{currentEvent}" before switching to avoid data mixing.
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className='px-2'>
            Cancel
          </Button>
          <Button onClick={onConfirm} className='px-2'>
            Switch to {newEvent}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
