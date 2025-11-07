import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock, Trash2, WifiOff, AlertTriangle } from 'lucide-react';
import { hasScoreBreakdown, type TBAMatchData } from '@/lib/tbaMatchData';
import type { TBACacheMetadata } from '@/lib/tbaCache';

interface MatchValidationDataDisplayProps {
  matches: TBAMatchData[];
  cacheMetadata: TBACacheMetadata | null;
  eventKey: string;
  onClearCache: () => void;
  isOnline?: boolean;
  cacheExpired?: boolean;
}

/**
 * Format cache age in human-readable format
 */
function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  
  if (ageMinutes < 1) {
    return 'Just now';
  } else if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  } else {
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ${ageMinutes % 60}m ago`;
  }
}

/**
 * Display component for match validation data loaded from TBA
 * Shows cache status, match counts, and data availability
 */
export function MatchValidationDataDisplay({
  matches,
  cacheMetadata,
  eventKey,
  onClearCache,
  isOnline = true,
  cacheExpired = false,
}: MatchValidationDataDisplayProps) {
  const qualMatches = matches.filter(m => m.comp_level === 'qm');
  const playoffMatches = matches.filter(m => m.comp_level !== 'qm');
  const matchesWithBreakdown = matches.filter(hasScoreBreakdown).length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Match Validation Data
          {!isOnline && (
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              Offline
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Detailed match breakdowns cached for validation against scouting data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">
              No validation data loaded yet.
            </p>
            <p className="text-sm text-muted-foreground">
              {isOnline 
                ? "Click \"Load Match Validation Data\" above to fetch detailed match breakdowns from TBA."
                : "You are offline. Load data while online to cache it for offline use."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Offline/Stale Data Warning */}
            {(!isOnline || cacheExpired) && (
              <Alert variant={!isOnline ? "default" : "destructive"}>
                {!isOnline ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>
                  {!isOnline 
                    ? "You are offline. Showing cached data from your last online session."
                    : "Cache expired. Data may be stale. Connect to internet and reload for fresh data."
                  }
                </AlertDescription>
              </Alert>
            )}
            {/* Match Count Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Qualification</p>
                <p className="text-2xl font-bold">{qualMatches.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Playoff</p>
                <p className="text-2xl font-bold">{playoffMatches.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">With Breakdowns</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {matchesWithBreakdown}
                </p>
              </div>
            </div>
            
            <Separator />
            
            {/* Cache Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Cache Status
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Event: <span className="font-medium text-foreground">{eventKey}</span>
                </p>
                <p>
                  Last Updated: <span className="font-medium text-foreground">
                    {cacheMetadata 
                      ? formatCacheAge(cacheMetadata.lastFetchedAt)
                      : 'Unknown'
                    }
                  </span>
                </p>
                <p className="text-xs">
                  {isOnline 
                    ? "Cache persists offline. Data refreshes automatically when you reload while online."
                    : "Cache preserved for offline use. Data will refresh when you're back online."
                  }
                </p>
              </div>
            </div>
            
            <Separator />
            
            {/* Available Data Fields */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Validation Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Coral Placement</p>
                    <p className="text-xs text-muted-foreground">By level (L1-L4), auto & teleop</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Algae Scoring</p>
                    <p className="text-xs text-muted-foreground">Net shots & processor</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Auto Line Crossings</p>
                    <p className="text-xs text-muted-foreground">Per robot (0-3)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Endgame Status</p>
                    <p className="text-xs text-muted-foreground">Deep, shallow, park per robot</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Penalties</p>
                    <p className="text-xs text-muted-foreground">Fouls & tech fouls</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Bonuses</p>
                    <p className="text-xs text-muted-foreground">Auto, coral, barge bonuses</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Actions */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? "This data will be used to compare against your scouted entries and identify discrepancies."
                  : "This cached data is available offline for validation. Reconnect to refresh."
                }
              </p>
              <Button 
                variant="outline" 
                onClick={onClearCache}
                className="w-full"
                size="sm"
                disabled={!isOnline}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isOnline ? "Clear Validation Cache" : "Clear Cache (requires internet)"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
