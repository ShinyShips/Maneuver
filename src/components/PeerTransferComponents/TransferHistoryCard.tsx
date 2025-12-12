import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReceivedDataEntry {
  scoutName: string;
  data: unknown;
  timestamp: number;
}

interface TransferHistoryCardProps {
  receivedData: ReceivedDataEntry[];
  historyCollapsed: boolean;
  onToggleCollapse: () => void;
  onClearHistory: () => void;
  getRelativeTime: (timestamp: number) => string;
}

export function TransferHistoryCard({
  receivedData,
  historyCollapsed,
  onToggleCollapse,
  onClearHistory,
  getRelativeTime
}: TransferHistoryCardProps) {
  const handleClearHistory = () => {
    onClearHistory();
    toast.success('Transfer history cleared');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Transfer History
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
              className="px-2"
            >
              {historyCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {receivedData.filter(d => {
                const dataObj = d.data as { type?: string; entries?: unknown[] };
                return dataObj.type !== 'declined' && dataObj.type !== 'push-declined' && dataObj.type !== 'pushed';
              }).length} received
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearHistory}
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Recent data requests and pushes
        </CardDescription>
      </CardHeader>
      {!historyCollapsed && (
        <CardContent>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {receivedData.slice().reverse().map((log, idx) => {
              const dataObj = log.data as { type?: string; dataType?: string; entries?: unknown[] };
              
              // Handle declined request
              if (dataObj.type === 'declined') {
                return (
                  <div key={idx} className="text-sm border-l-2 border-red-500 pl-3 py-1">
                    <p className="font-medium">{log.scoutName} declined request</p>
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(log.timestamp)}
                    </p>
                  </div>
                );
              }
              
              // Handle declined push
              if (dataObj.type === 'push-declined') {
                return (
                  <div key={idx} className="text-sm border-l-2 border-yellow-500 pl-3 py-1">
                    <p className="font-medium">{log.scoutName} declined push</p>
                    <p className="text-xs text-muted-foreground">
                      {dataObj.dataType} • {getRelativeTime(log.timestamp)}
                    </p>
                  </div>
                );
              }
              
              // Handle pushed data (outgoing from lead)
              if (dataObj.type === 'pushed') {
                return (
                  <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                    <p className="font-medium">Pushed to {log.scoutName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataObj.dataType} • {getRelativeTime(log.timestamp)}
                    </p>
                  </div>
                );
              }
              
              // Handle successful data transfer - show appropriate info based on data type
              const transferDataType = (log as { dataType?: string }).dataType;
              let displayText = '';
              
              if (transferDataType === 'scout') {
                const scoutData = dataObj as { scouts?: unknown[]; predictions?: unknown[]; achievements?: unknown[] };
                const totalItems = (scoutData.scouts?.length || 0) + 
                                 (scoutData.predictions?.length || 0) + 
                                 (scoutData.achievements?.length || 0);
                displayText = `${totalItems} profile items`;
              } else if (transferDataType === 'match') {
                const matchData = dataObj as { matches?: unknown[] };
                displayText = `${matchData.matches?.length || 0} matches`;
              } else if (transferDataType === 'pit-scouting') {
                const entryCount = dataObj.entries?.length || 0;
                displayText = `${entryCount} pit entries`;
              } else if (transferDataType === 'combined') {
                const entryCount = dataObj.entries?.length || 0;
                const scoutProfiles = (dataObj as { scoutProfiles?: { scouts?: unknown[]; predictions?: unknown[] } }).scoutProfiles;
                const profileCount = (scoutProfiles?.scouts?.length || 0) + (scoutProfiles?.predictions?.length || 0);
                displayText = `${entryCount} entries + ${profileCount} profiles`;
              } else {
                // Default to entries (scouting data or unknown)
                const entryCount = dataObj.entries?.length || 0;
                displayText = `${entryCount} entries`;
              }
              
              return (
                <div key={idx} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                  <p className="font-medium">{log.scoutName} • {displayText}</p>
                  <p className="text-xs text-muted-foreground">
                    {transferDataType && `${transferDataType} • `}{getRelativeTime(log.timestamp)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
