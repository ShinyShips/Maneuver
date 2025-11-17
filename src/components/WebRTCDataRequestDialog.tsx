/**
 * Global WebRTC Data Request Dialog
 * Shows a popup when the lead requests data, regardless of which page the scout is on
 */

import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { loadScoutingData } from '@/lib/scoutingDataUtils';
import { applyFilters } from '@/lib/dataFiltering';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function WebRTCDataRequestDialog() {
  const context = useWebRTC();
  const { dataRequested, setDataRequested, sendData, requestFilters } = context;
  const [transferStatus, setTransferStatus] = useState<string>('');

  const handleAcceptRequest = async () => {
    setTransferStatus('Loading data...');
    try {
      let data = await loadScoutingData();
      const originalCount = data.entries.length;
      
      // Apply filters if provided
      if (requestFilters) {
        console.log('📋 Applying filters:', requestFilters);
        console.log('📋 Filter type:', requestFilters.matchRange.type);
        console.log('📋 Filter preset:', requestFilters.matchRange.preset);
        
        setTransferStatus(`Filtering ${originalCount} entries...`);
        
        // applyFilters works with ScoutingDataCollection, structure is runtime compatible
        const filteredData = applyFilters(data as unknown as Parameters<typeof applyFilters>[0], requestFilters);
        console.log('📊 Original entries:', originalCount);
        console.log('📊 Filtered entries:', filteredData.entries.length);
        data = { entries: filteredData.entries as unknown as typeof data.entries };
        
        console.log(`📊 Filtered: ${originalCount} entries → ${data.entries.length} entries`);
        setTransferStatus(`Sending ${data.entries.length} of ${originalCount} entries...`);
      } else {
        console.log('📋 No filters applied - sending all data');
        setTransferStatus(`Sending ${originalCount} entries...`);
      }
      
      const dataSize = JSON.stringify(data).length;
      console.log('Scout sending data:', data);
      console.log('Data size:', dataSize, 'characters');
      
      sendData(data);
      
      // Show success with details
      if (requestFilters && data.entries.length < originalCount) {
        setTransferStatus(`✅ Sent ${data.entries.length} entries (${originalCount - data.entries.length} filtered out)`);
      } else {
        setTransferStatus(`✅ Sent ${data.entries.length} entries`);
      }
      
      setTimeout(() => {
        setTransferStatus('');
        setDataRequested(false);
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to load/send data:', err);
      setTransferStatus(`❌ Error: ${errorMsg}`);
      setTimeout(() => {
        setTransferStatus('');
        setDataRequested(false);
      }, 5000);
    }
  };

  const handleDecline = () => {
    // Send decline message to lead
    context.sendControlMessage({ type: 'request-declined' });
    
    setDataRequested(false);
    setTransferStatus('');
  };

  // Generate filter description
  const getFilterDescription = () => {
    if (!requestFilters) return 'All data';
    
    const parts: string[] = [];
    
    // Match range
    if (requestFilters.matchRange.type === 'preset' && requestFilters.matchRange.preset !== 'all') {
      const presetLabels = {
        'last10': 'Last 10 matches',
        'last15': 'Last 15 matches',
        'last30': 'Last 30 matches',
        'fromLastExport': 'From last export'
      };
      parts.push(presetLabels[requestFilters.matchRange.preset as keyof typeof presetLabels] || 'Custom range');
    } else if (requestFilters.matchRange.type === 'custom') {
      const start = requestFilters.matchRange.customStart || '?';
      const end = requestFilters.matchRange.customEnd || '?';
      parts.push(`Matches ${start}-${end}`);
    }
    
    // Teams
    if (!requestFilters.teams.includeAll && requestFilters.teams.selectedTeams.length > 0) {
      parts.push(`${requestFilters.teams.selectedTeams.length} teams`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All data';
  };

  // Debug: log when dialog opens
  console.log('🔍 Dialog state - dataRequested:', dataRequested, 'requestFilters:', requestFilters);

  return (
    <>
      <AlertDialog open={dataRequested && !transferStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Request from Lead Scout
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>The lead scout is requesting your scouting data.</p>
              {requestFilters ? (
                <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800 mt-2">
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-900 dark:text-blue-100">Filter Request</span>
                    <span className="text-xs text-blue-700 dark:text-blue-300">{getFilterDescription()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">
                  Requesting all available data
                </div>
              )}
              <p className="text-sm mt-2">Send your data?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDecline} className='p-2'>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptRequest} className='p-2'>Send Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer status overlay - shows what's being sent */}
      <AlertDialog open={!!transferStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Sending Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div className="text-center py-2 text-lg">
                {transferStatus}
              </div>
              {requestFilters && transferStatus.includes('Loading') && (
                <div className="text-xs bg-muted p-2 rounded">
                  <Filter className="h-3 w-3 inline mr-1" />
                  Filtering: {getFilterDescription()}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
