import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import type { ConflictInfo } from '@/lib/scoutingDataUtils';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictInfo | null;
  currentIndex: number;
  totalConflicts: number;
  onResolve: (action: 'replace' | 'skip') => void;
  onBatchResolve?: (action: 'replace' | 'skip') => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onOpenChange,
  conflict,
  currentIndex,
  totalConflicts,
  onResolve,
  onBatchResolve,
  onUndo,
  canUndo = false
}) => {
  if (!conflict) return null;

  const incomingData = conflict.incoming.data;
  const localData = conflict.local;

  // Format timestamp for display
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Data Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Conflict {currentIndex + 1} of {totalConflicts} • 
            Match {incomingData.matchNumber as string} • 
            Team {incomingData.selectTeam as string || incomingData.teamNumber as string} • 
            {String(incomingData.alliance || '').replace('Alliance', '')} Alliance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Conflict Type Explanation */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {conflict.conflictType === 'corrected-vs-uncorrected' ? (
                  <>
                    <strong>Your local data has been corrected</strong>, but the incoming data is uncorrected. 
                    This typically means you have more accurate information locally.
                  </>
                ) : (
                  <>
                    <strong>Both entries have been corrected</strong>, but at different times. 
                    Review both to determine which has the most accurate information.
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local (Current) Data */}
            <Card className={!conflict.isNewerIncoming ? 'border-blue-200 dark:border-blue-800' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Local (Current)</span>
                  {!conflict.isNewerIncoming && (
                    <Badge className="bg-blue-500 text-white">NEWER</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Scout: </span>
                  {localData.scoutName || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Timestamp: </span>
                  {formatTimestamp(localData.timestamp)}
                </div>
                {localData.isCorrected && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Corrected
                      </Badge>
                      {localData.correctionCount && localData.correctionCount > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ({localData.correctionCount} times)
                        </span>
                      )}
                    </div>
                    {localData.lastCorrectedAt && (
                      <div>
                        <span className="font-medium">Last Corrected: </span>
                        {formatTimestamp(localData.lastCorrectedAt)}
                      </div>
                    )}
                    {localData.lastCorrectedBy && (
                      <div>
                        <span className="font-medium">Corrected By: </span>
                        {localData.lastCorrectedBy}
                      </div>
                    )}
                    {localData.originalScoutName && (
                      <div>
                        <span className="font-medium">Original Scout: </span>
                        {localData.originalScoutName}
                      </div>
                    )}
                    {localData.correctionNotes && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                        <span className="font-medium">Notes: </span>
                        <span className="italic">{localData.correctionNotes}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Incoming Data */}
            <Card className={conflict.isNewerIncoming ? 'border-green-200 dark:border-green-800' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Incoming (From Import)</span>
                  {conflict.isNewerIncoming && (
                    <Badge className="bg-green-500 text-white">NEWER</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Scout: </span>
                  {incomingData.scoutName as string || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Timestamp: </span>
                  {formatTimestamp(conflict.incoming.timestamp)}
                </div>
                {incomingData.isCorrected as boolean && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Corrected
                      </Badge>
                      {Boolean(incomingData.correctionCount) && Number(incomingData.correctionCount) > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ({String(incomingData.correctionCount)} times)
                        </span>
                      )}
                    </div>
                    {incomingData.lastCorrectedAt && (
                      <div>
                        <span className="font-medium">Last Corrected: </span>
                        {formatTimestamp(Number(incomingData.lastCorrectedAt))}
                      </div>
                    )}
                    {incomingData.lastCorrectedBy && (
                      <div>
                        <span className="font-medium">Corrected By: </span>
                        {incomingData.lastCorrectedBy as string}
                      </div>
                    )}
                    {incomingData.originalScoutName && (
                      <div>
                        <span className="font-medium">Original Scout: </span>
                        {incomingData.originalScoutName as string}
                      </div>
                    )}
                    {incomingData.correctionNotes && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                        <span className="font-medium">Notes: </span>
                        <span className="italic">{incomingData.correctionNotes as string}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Changed Fields Section */}
          {conflict.changedFields && conflict.changedFields.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader>
                <CardTitle className="text-base">Changed Fields ({conflict.changedFields.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conflict.changedFields.map(({ field, localValue, incomingValue }) => (
                    <div key={field} className="grid grid-cols-1 gap-2 p-3 bg-background rounded border">
                      <div className="font-medium text-purple-700 dark:text-purple-300 text-sm">
                        {field}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Local: </span>
                          <span className="font-mono">{String(localValue ?? 'null')}</span>
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          <span className="font-medium">Incoming: </span>
                          <span className="font-mono">{String(incomingValue ?? 'null')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3">
          {/* All buttons in one grid - undo spans both columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Button 
              onClick={() => onResolve('skip')}
              className="p-2"
            >
              Skip - Keep Local Data
            </Button>
            <Button 
              variant="destructive"
              onClick={() => onResolve('replace')}
              className="p-2"
            >
              Replace - Use Incoming Data
            </Button>
            
            {/* Batch actions in same grid */}
            {totalConflicts > 1 && onBatchResolve && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onBatchResolve('skip')}
                  className="p-2"
                >
                  Skip All Remaining ({totalConflicts - currentIndex - 1} left)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onBatchResolve('replace')}
                  className="p-2"
                >
                  Replace All Remaining ({totalConflicts - currentIndex - 1} left)
                </Button>
              </>
            )}
            
            {/* Undo button spans both columns */}
            {canUndo && onUndo && (
              <Button 
                variant="outline" 
                onClick={onUndo}
                className="p-2 sm:col-span-2"
              >
                ↶ Undo Last Decision
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictResolutionDialog;
