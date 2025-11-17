/**
 * Global WebRTC Pushed Data Dialog
 * Shows a popup when the lead pushes data to the scout
 */

import { useState } from 'react';
import { Upload, Info } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { pitDB, gameDB, saveScoutingEntries } from '@/lib/dexieDB';
import { toast } from 'sonner';
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

export function WebRTCPushedDataDialog() {
  const context = useWebRTC();
  const { dataPushed, setDataPushed, pushedData, pushedDataType, sendControlMessage } = context;
  const [importStatus, setImportStatus] = useState<string>('');

  const getDataTypeLabel = (dataType: string | null) => {
    switch (dataType) {
      case 'scouting': return 'Scouting Data';
      case 'pit-scouting': return 'Pit Scouting Data';
      case 'match': return 'Match Schedule';
      case 'scout': return 'Scout Profiles';
      case 'combined': return 'Combined Data';
      default: return 'Data';
    }
  };

  const getDataSummary = () => {
    if (!pushedData) return 'No data';

    try {
      const data = pushedData as any;
      const parts: string[] = [];

      if (pushedDataType === 'combined') {
        // Combined data structure (scouting + scout profiles)
        if (data.entries) parts.push(`${data.entries.length} scouting entries`);
        if (data.scoutProfiles?.scouts) parts.push(`${data.scoutProfiles.scouts.length} scouts`);
        if (data.scoutProfiles?.predictions) parts.push(`${data.scoutProfiles.predictions.length} predictions`);
      } else if (pushedDataType === 'scouting' || pushedDataType === 'pit-scouting') {
        // Scouting or pit data
        if (data.entries) parts.push(`${data.entries.length} entries`);
      } else if (pushedDataType === 'match') {
        // Match data
        if (data.matches) parts.push(`${Array.isArray(data.matches) ? data.matches.length : 0} matches`);
      } else if (pushedDataType === 'scout') {
        // Scout profile data
        if (data.scouts) parts.push(`${Array.isArray(data.scouts) ? data.scouts.length : 0} scouts`);
        if (data.predictions) parts.push(`${Array.isArray(data.predictions) ? data.predictions.length : 0} predictions`);
      }

      return parts.length > 0 ? parts.join(', ') : 'Unknown data structure';
    } catch (err) {
      console.error('Error parsing pushed data:', err);
      return 'Error reading data';
    }
  };

  const handleAcceptPushedData = async () => {
    setImportStatus('Importing data...');
    try {
      let importedCount = 0;

      console.log('📦 Pushed data type:', pushedDataType);
      console.log('📦 Pushed data:', pushedData);

      if (pushedDataType === 'combined') {
        // Import combined data (scouting + scout profiles)
        const data = pushedData as any;
        
        console.log('📦 Combined data structure:', {
          hasEntries: !!data.entries,
          entriesIsArray: Array.isArray(data.entries),
          entriesLength: data.entries?.length,
          hasScoutProfiles: !!data.scoutProfiles
        });
        
        // Import scouting data
        if (data.entries && Array.isArray(data.entries)) {
          await saveScoutingEntries(data.entries);
          importedCount += data.entries.length;
          console.log('✅ Imported', data.entries.length, 'scouting entries');
        } else {
          console.warn('⚠️ No scouting entries to import or entries is not an array');
        }

        // Import scout profiles
        if (data.scoutProfiles) {
          if (data.scoutProfiles.scouts && Array.isArray(data.scoutProfiles.scouts)) {
            for (const scout of data.scoutProfiles.scouts) {
              await gameDB.scouts.put(scout);
            }
            importedCount += data.scoutProfiles.scouts.length;
            console.log('✅ Imported', data.scoutProfiles.scouts.length, 'scout profiles');
          }

          // Import predictions
          if (data.scoutProfiles.predictions && Array.isArray(data.scoutProfiles.predictions)) {
            for (const prediction of data.scoutProfiles.predictions) {
              await gameDB.predictions.put(prediction);
            }
            console.log('✅ Imported', data.scoutProfiles.predictions.length, 'predictions');
          }
        }

      } else if (pushedDataType === 'scouting') {
        // Import scouting data
        const data = pushedData as any;
        
        console.log('📦 Scouting data structure:', {
          dataType: typeof data,
          hasEntries: !!data?.entries,
          entriesIsArray: Array.isArray(data?.entries),
          entriesLength: data?.entries?.length,
          dataKeys: data ? Object.keys(data) : 'no data',
          firstEntry: data?.entries?.[0]
        });
        
        if (!data) {
          throw new Error('No scouting data received');
        }
        
        if (!data.entries) {
          throw new Error('Scouting data missing entries property');
        }
        
        if (!Array.isArray(data.entries)) {
          throw new Error('Scouting data entries is not an array');
        }
        
        if (data.entries.length === 0) {
          console.warn('⚠️ No scouting entries to import (empty array)');
          toast.info('No scouting data to import');
        } else {
          console.log('🔄 Saving', data.entries.length, 'scouting entries...');
          
          // Check if entries are valid
          for (let i = 0; i < data.entries.length; i++) {
            const entry = data.entries[i];
            if (!entry) {
              throw new Error(`Entry at index ${i} is null or undefined`);
            }
            if (!entry.id) {
              throw new Error(`Entry at index ${i} missing id: ${JSON.stringify(entry).substring(0, 100)}`);
            }
            if (!entry.data) {
              throw new Error(`Entry at index ${i} missing data property: ${JSON.stringify(entry).substring(0, 100)}`);
            }
          }
          
          await saveScoutingEntries(data.entries);
          importedCount = data.entries.length;
          console.log('✅ Imported', importedCount, 'scouting entries');
        }

      } else if (pushedDataType === 'pit-scouting') {
        // Import pit scouting data
        const data = pushedData as any;
        if (data.entries) {
          for (const entry of data.entries) {
            await pitDB.pitScoutingData.put(entry);
          }
          importedCount = data.entries.length;
          console.log('✅ Imported', importedCount, 'pit scouting entries');
        }

      } else if (pushedDataType === 'match') {
        // Import match data
        const data = pushedData as any;
        if (data.matches && Array.isArray(data.matches)) {
          localStorage.setItem('matchData', JSON.stringify(data.matches));
          importedCount = data.matches.length;
          console.log('✅ Imported', importedCount, 'matches');
        }

      } else if (pushedDataType === 'scout') {
        // Import scout profile data
        const data = pushedData as any;
        if (data.scouts && Array.isArray(data.scouts)) {
          for (const scout of data.scouts) {
            await gameDB.scouts.put(scout);
          }
          importedCount = data.scouts.length;
          console.log('✅ Imported', importedCount, 'scout profiles');
        }
        if (data.predictions && Array.isArray(data.predictions)) {
          for (const prediction of data.predictions) {
            await gameDB.predictions.put(prediction);
          }
          console.log('✅ Imported', data.predictions.length, 'predictions');
        }
        if (data.achievements && Array.isArray(data.achievements)) {
          for (const achievement of data.achievements) {
            await gameDB.scoutAchievements.put(achievement);
          }
          console.log('✅ Imported', data.achievements.length, 'achievements');
        }
      }

      setImportStatus(`✅ Successfully imported ${getDataTypeLabel(pushedDataType)}`);
      toast.success(`Imported ${getDataTypeLabel(pushedDataType)}`);
      
      setTimeout(() => {
        setImportStatus('');
        setDataPushed(false);
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to import pushed data:', err);
      setImportStatus(`❌ Error: ${errorMsg}`);
      toast.error(`Failed to import: ${errorMsg}`);
      setTimeout(() => {
        setImportStatus('');
        setDataPushed(false);
      }, 5000);
    }
  };

  const handleDecline = () => {
    console.log('Scout declined pushed data');
    
    // Send decline message to lead
    sendControlMessage({ 
      type: 'push-declined',
      dataType: pushedDataType 
    });
    
    toast.info('Declined data from lead');
    setDataPushed(false);
    setImportStatus('');
  };

  return (
    <>
      <AlertDialog open={dataPushed && !importStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Lead Scout is Pushing Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>The lead scout wants to send you data.</p>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {getDataTypeLabel(pushedDataType)}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {getDataSummary()}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Accepting will merge this data with your existing data. Any conflicts will use the newest data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDecline} className='p-2'>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptPushedData} className='p-2'>Accept & Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import status overlay */}
      <AlertDialog open={!!importStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importing Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div className="text-center py-2 text-lg">
                {importStatus}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
