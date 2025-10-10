import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ScoutAddConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingScoutNames: string[];
  onAddToSelectable: () => void;
  onImportOnly: () => void;
}

const ScoutAddConfirmDialog: React.FC<ScoutAddConfirmDialogProps> = ({
  open,
  onOpenChange,
  pendingScoutNames,
  onAddToSelectable,
  onImportOnly
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Scouts to Selectable List?</DialogTitle>
          <DialogDescription>
            The imported data contains {pendingScoutNames.length} scout(s) that are not currently in your selectable scout list: <strong>{pendingScoutNames.join(", ")}</strong>
            <br /><br />
            Would you like to add them to the selectable scout list? This will make them available in the scout selection dropdown.
            <br /><br />
            <strong>Choose "No" if you're a lead scout</strong> and want to control which scouts can be selected.
            <br />
            <strong>Choose "Yes" if you're setting up a new tablet</strong> and want these scouts to be selectable.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onImportOnly} className="px-2">
            No, Import Data Only
          </Button>
          <Button onClick={onAddToSelectable} className="px-2">
            Yes, Add to Selectable List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScoutAddConfirmDialog;
