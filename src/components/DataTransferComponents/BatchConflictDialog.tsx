import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileStack } from "lucide-react";
import type { ScoutingDataWithId } from "@/lib/scoutingDataUtils";

interface BatchConflictDialogProps {
  isOpen: boolean;
  entries: ScoutingDataWithId[];
  onResolve: (decision: 'replace-all' | 'skip-all' | 'review-each') => void;
}

export const BatchConflictDialog: React.FC<BatchConflictDialogProps> = ({
  isOpen,
  entries,
  onResolve
}) => {
  if (entries.length === 0) return null;

  // Extract summary info
  const matches = new Set<string>();
  const teams = new Set<string>();
  const scouts = new Set<string>();

  entries.forEach(entry => {
    const data = entry.data;
    if (data.matchNumber) matches.add(String(data.matchNumber));
    if (data.selectTeam) teams.add(String(data.selectTeam));
    if (data.scoutName) scouts.add(String(data.scoutName));
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            <DialogTitle>Duplicate Entries Detected</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Found <strong>{entries.length}</strong> entries that already exist in your local database. 
              Both versions are uncorrected, so you should review whether to replace them.
            </p>
          </div>

          {/* Summary statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Entries</div>
              <div className="text-2xl font-bold">{entries.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Matches</div>
              <div className="text-2xl font-bold">{matches.size}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Teams</div>
              <div className="text-2xl font-bold">{teams.size}</div>
            </div>
          </div>

          {/* Example entries */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileStack className="h-4 w-4" />
              <span>Example Entries:</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="text-sm p-2 bg-muted rounded border border-border"
                >
                  Match {String(entry.data.matchNumber || '')} • Team {String(entry.data.selectTeam || '')} • {String(entry.data.alliance || '')} Alliance
                  {entry.data.scoutName ? ` • Scout: ${String(entry.data.scoutName)}` : ''}
                </div>
              ))}
              {entries.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  ... and {entries.length - 5} more entries
                </div>
              )}
            </div>
          </div>

          {/* Decision guidance */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">What would you like to do?</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• <strong>Replace All</strong> - Overwrite local entries with incoming data</li>
              <li>• <strong>Skip All</strong> - Keep your current local data</li>
              <li>• <strong>Review Each</strong> - Decide individually for each conflict</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onResolve('skip-all')}
            className="flex-1"
          >
            Skip All - Keep Local
          </Button>
          <Button
            variant="outline"
            onClick={() => onResolve('review-each')}
            className="flex-1"
          >
            Review Each
          </Button>
          <Button
            onClick={() => onResolve('replace-all')}
            className="flex-1"
          >
            Replace All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
