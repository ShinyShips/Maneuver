import React, { useState, useEffect } from 'react';

// Import hooks and components
import { useTBAData } from '@/hooks/useTBAData';
import { useTBAMatchData } from '@/hooks/useTBAMatchData';
import ApiKeyForm from '@/components/MatchResultsComponents/ApiKeyForm';
import { MatchSelector } from '@/components/MatchResultsComponents/MatchSelector';
import { ProcessingResults } from '@/components/MatchResultsComponents/ProcessingResults';
import { 
  MatchDataLoader,
  DataStatusCard,
  DataOperationsCard,
  MatchValidationDataDisplay,
  PitDataDisplay
} from '@/components/TBADataComponents/DataManagement';
import {
  DataTypeSelector,
  EventConfigurationCard,
  EventSwitchConfirmDialog,
  EventTeamsDisplay,
  type TBADataType
} from '@/components/TBADataComponents/EventConfiguration';
import { ValidationTesting } from '@/components/TBADataComponents/ValidationTesting';
import { DataAttribution } from '@/components/DataAttribution';
import { getNexusPitData, storePitData, getStoredPitData, getNexusEvents, extractAndStoreTeamsFromPitAddresses, type NexusPitAddresses, type NexusPitMap } from '@/lib/nexusUtils';
import { clearEventData, hasStoredEventData, setCurrentEvent, getCurrentEvent, isDifferentEvent } from '@/lib/eventDataUtils';
import { toast } from 'sonner';

interface ProcessingResult {
  matchNumber: number;
  winner: string;
  predictionsCount: number;
  correctPredictions: number;
  stakesAwarded: number;
}

const APIDataPage: React.FC = () => {
  // Shared state for API configuration
  const [apiKey, setApiKey] = useState('');
  const [nexusApiKey, setNexusApiKey] = useState('');
  const [eventKey, setEventKey] = useState('');
  const [rememberForSession, setRememberForSession] = useState(false);
  const [dataType, setDataType] = useState<TBADataType>('match-data');
  
  // Event data management
  const [clearingEventData, setClearingEventData] = useState(false);
  const [storedDataExists, setStoredDataExists] = useState(false);
  
  // Event switch confirmation
  const [showEventSwitchDialog, setShowEventSwitchDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  
  // Processing results state
  const [processedResults, setProcessedResults] = useState<ProcessingResult[]>([]);
  
  // Nexus data state
  const [pitDataLoading, setPitDataLoading] = useState(false);
  const [pitData, setPitData] = useState<{
    addresses: NexusPitAddresses | null;
    map: NexusPitMap | null;
  }>({ addresses: null, map: null });
  
  // Debug Nexus state
  const [debugNexusLoading, setDebugNexusLoading] = useState(false);
  const [nexusEvents, setNexusEvents] = useState<Record<string, unknown> | null>(null);

  // Use the TBA data hook
  const {
    matchDataLoading,
    matchResultsLoading,
    eventTeamsLoading,
    matches,
    teams,
    isStored,
    fetchMatchDataFromTBA,
    loadMatchResults,
    loadEventTeams,
    handleStoreTeams,
    handleClearStored,
  } = useTBAData();

  // Use the TBA match validation data hook
  const {
    loading: validationLoading,
    matches: validationMatches,
    cacheMetadata,
    isOnline: validationOnline,
    cacheExpired: validationCacheExpired,
    fetchEventMatches: fetchValidationMatches,
    clearCache: clearValidationCache,
  } = useTBAMatchData();

  // Check for stored data when event key changes
  useEffect(() => {
    if (eventKey.trim()) {
      setStoredDataExists(hasStoredEventData(eventKey));
    } else {
      setStoredDataExists(false);
    }
  }, [eventKey]);

  // Handler to clear all event data
  const handleClearAllEventData = async () => {
    if (!eventKey.trim()) {
      toast.error('No event selected');
      return;
    }

    setClearingEventData(true);
    try {
      clearEventData(eventKey);
      setStoredDataExists(false);
      
      // Reset component state
      setPitData({ addresses: null, map: null });
      setProcessedResults([]);
    } catch (error) {
      console.error('Error clearing event data:', error);
      toast.error('Failed to clear some event data');
    } finally {
      setClearingEventData(false);
    }
  };

  // Helper function to check if confirmation is needed before data operations
  const executeWithConfirmation = (action: () => void) => {
    if (isDifferentEvent(eventKey)) {
      setPendingAction(() => action);
      setShowEventSwitchDialog(true);
    } else {
      action();
    }
  };

  const handleConfirmEventSwitch = () => {
    pendingAction();
    setShowEventSwitchDialog(false);
    setPendingAction(() => {});
  };

  const handleCancelEventSwitch = () => {
    setShowEventSwitchDialog(false);
    setPendingAction(() => {});
  };

  // Handler functions that call the hook functions with current state
  const handleLoadMatchData = () => {
    executeWithConfirmation(() => {
      fetchMatchDataFromTBA(apiKey, eventKey, rememberForSession, setApiKey);
    });
  };

  const handleLoadMatchResults = () => {
    executeWithConfirmation(() => {
      loadMatchResults(apiKey, eventKey, rememberForSession, setApiKey);
    });
  };

  const handleLoadValidationData = () => {
    executeWithConfirmation(async () => {
      if (!apiKey.trim() || !eventKey.trim()) {
        toast.error('Please provide API key and event key');
        return;
      }
      
      try {
        await fetchValidationMatches(eventKey, apiKey, false);
        toast.success('Match validation data loaded and cached');
        
        // Update current event in localStorage after successful load
        setCurrentEvent(eventKey.trim());
      } catch (error) {
        console.error('Error loading validation data:', error);
        toast.error('Failed to load validation data');
      }
    });
  };

  const handleLoadEventTeams = () => {
    executeWithConfirmation(() => {
      loadEventTeams(apiKey, eventKey, rememberForSession, setApiKey);
    });
  };

  const handleLoadPitData = async () => {
    if (!nexusApiKey.trim()) {
      toast.error('Please enter your Nexus API key');
      return;
    }

    if (!eventKey.trim()) {
      toast.error('Please enter an event key');
      return;
    }

    executeWithConfirmation(async () => {
      setPitDataLoading(true);
      try {
        // First check if pit data is already stored
      const storedData = getStoredPitData(eventKey);
      if (storedData.addresses || storedData.map) {
        setPitData(storedData);
        toast.success('Loaded pit data from local storage');
        
        // Update current event in localStorage after successful load
        setCurrentEvent(eventKey.trim());
        
        setPitDataLoading(false);
        return;
      }

      // If not stored, fetch from Nexus API
      const fetchedData = await getNexusPitData(eventKey, nexusApiKey);
      setPitData(fetchedData);
      
      // Store the data locally
      storePitData(eventKey, fetchedData.addresses, fetchedData.map);
      
      // Update current event in localStorage after successful load
      setCurrentEvent(eventKey.trim());
      
      // Extract and store teams from pit addresses for pit assignments
      let extractedTeamCount = 0;
      if (fetchedData.addresses && Object.keys(fetchedData.addresses).length > 0) {
        try {
          const extractedTeams = extractAndStoreTeamsFromPitAddresses(eventKey, fetchedData.addresses);
          extractedTeamCount = extractedTeams.length;
          console.log(`Extracted ${extractedTeamCount} teams from pit addresses for pit assignments`);
        } catch (error) {
          console.warn('Failed to extract teams from pit addresses:', error);
        }
      }
      
      const addressCount = fetchedData.addresses ? Object.keys(fetchedData.addresses).length : 0;
      const hasMap = fetchedData.map !== null;
      
      if (addressCount > 0 && hasMap) {
        const message = extractedTeamCount > 0 
          ? `Loaded pit data: ${addressCount} addresses, pit map, and extracted ${extractedTeamCount} teams for pit assignments`
          : `Loaded pit data: ${addressCount} addresses and pit map`;
        toast.success(message);
      } else if (addressCount > 0) {
        const message = extractedTeamCount > 0
          ? `Loaded ${addressCount} pit addresses and extracted ${extractedTeamCount} teams for pit assignments (no map available)`
          : `Loaded ${addressCount} pit addresses (no map available)`;
        toast.success(message);
      } else if (hasMap) {
        toast.warning('Loaded pit map but no team addresses found');
      } else {
        toast.warning('No pit data available for this event');
      }
      
      // Clear API key from memory if not remembering for session
      if (!rememberForSession) {
        setNexusApiKey("");
        sessionStorage.removeItem("nexusApiKey");
      }
    } catch (error) {
      console.error('Error loading pit data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load pit data');
    } finally {
      setPitDataLoading(false);
    }
    });
  };

  const handleDebugNexus = async () => {
    if (!nexusApiKey.trim()) {
      toast.error('Please enter your Nexus API key');
      return;
    }

    setDebugNexusLoading(true);
    try {
      const eventsData = await getNexusEvents(nexusApiKey);      
      const eventCount = Object.keys(eventsData).length;
      setNexusEvents(eventsData);
      toast.success(`Loaded ${eventCount} events from Nexus API`);
      
      // Clear API key from memory if not remembering for session
      if (!rememberForSession) {
        setNexusApiKey("");
        sessionStorage.removeItem("nexusApiKey");
      }
    } catch (error) {
      console.error('Error loading Nexus events:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load Nexus events');
      setNexusEvents(null);
    } finally {
      setDebugNexusLoading(false);
    }
  };

  const handleProcessingComplete = (results: ProcessingResult[]) => {
    setProcessedResults(results);
  };

  // Create handlers with correct signatures for the components
  const handleStoreTeamsWithEventKey = () => {
    handleStoreTeams(eventKey);
  };

  const handleClearStoredWithEventKey = () => {
    handleClearStored(eventKey);
  };

  return (
    <div className="min-h-screen container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="text-start">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Data</h1>
            <p className="text-muted-foreground">
              Import match schedules, results, and team lists from The Blue Alliance or pit information from Nexus for FRC.
            </p>
          </div>
          {/* Attribution for TBA and Nexus APIs */}
          <div className="hidden md:block">
            <DataAttribution sources={['tba', 'nexus']} variant="full" />
          </div>
        </div>
        <div className="md:hidden mt-2">
          <DataAttribution sources={['tba', 'nexus']} variant="compact" />
        </div>
      </div>

      {/* Configuration Cards - Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Key Form */}
        <div className="lg:col-span-1 h-full">
          <ApiKeyForm
            apiKey={apiKey}
            setApiKey={setApiKey}
            nexusApiKey={nexusApiKey}
            setNexusApiKey={setNexusApiKey}
            rememberForSession={rememberForSession}
            setRememberForSession={setRememberForSession}
          />
        </div>

        <div className='flex flex-col justify-between gap-6 lg:col-span-1'>
          {/* Event Configuration */}
          <div className="lg:col-span-1">
            <EventConfigurationCard
              eventKey={eventKey}
              setEventKey={setEventKey}
              hasStoredData={storedDataExists}
              onClearAllData={handleClearAllEventData}
              clearingData={clearingEventData}
            />
          </div>

          {/* Data Type Selection */}
          <div className="lg:col-span-1">
            <DataTypeSelector
              dataType={dataType}
              setDataType={setDataType}
            />
          </div>
        </div>
        
      </div>

      {/* Data Status Card */}
      <DataStatusCard eventKey={eventKey} />

      {/* Data Operations */}
      <DataOperationsCard
        dataType={dataType}
        eventKey={eventKey}
        apiKey={apiKey}
        nexusApiKey={nexusApiKey}
        matchDataLoading={matchDataLoading}
        matchResultsLoading={matchResultsLoading}
        validationLoading={validationLoading}
        eventTeamsLoading={eventTeamsLoading}
        pitDataLoading={pitDataLoading}
        debugNexusLoading={debugNexusLoading}
        onLoadMatchData={handleLoadMatchData}
        onLoadMatchResults={handleLoadMatchResults}
        onLoadValidationData={handleLoadValidationData}
        onLoadEventTeams={handleLoadEventTeams}
        onLoadPitData={handleLoadPitData}
        onDebugNexus={handleDebugNexus}
      />

      {/* Match Data Loader */}
      {dataType === 'match-data' && (
        <MatchDataLoader />
      )}

      {/* Match Results Section */}
      {dataType === 'match-results' && (
        <>
          <MatchSelector matches={matches} onProcessingComplete={handleProcessingComplete} />
          
          {processedResults.length > 0 && (
            <ProcessingResults results={processedResults} />
          )}
        </>
      )}

      {/* Match Validation Data Display */}
      {dataType === 'match-validation-data' && (
        <MatchValidationDataDisplay
          matches={validationMatches}
          cacheMetadata={cacheMetadata}
          eventKey={eventKey}
          isOnline={validationOnline}
          cacheExpired={validationCacheExpired}
          onClearCache={() => clearValidationCache(eventKey)}
        />
      )}

      {/* Event Teams Display */}
      {dataType === 'event-teams' && (
        <EventTeamsDisplay
          teams={teams}
          eventKey={eventKey}
          isStored={isStored}
          onStoreTeams={handleStoreTeamsWithEventKey}
          onClearStored={handleClearStoredWithEventKey}
        />
      )}

      {/* Pit Data Display */}
      {dataType === 'pit-data' && (
        <PitDataDisplay
          addresses={pitData.addresses}
          map={pitData.map}
          eventKey={eventKey}
        />
      )}

      {/* Debug Nexus Events Display */}
      {dataType === 'debug-nexus' && nexusEvents && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">Available Nexus Events</h3>
            <div className="space-y-2">
              {Object.entries(nexusEvents).map(([eventCode, eventData]) => (
                <div key={eventCode} className="p-3 border rounded bg-muted/50">
                  <div className="font-medium">{eventCode}</div>
                  <div className="text-sm text-muted-foreground">
                    {JSON.stringify(eventData, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Testing */}
      {dataType === 'validation-testing' && eventKey && (
        <ValidationTesting eventKey={eventKey} tbaApiKey={apiKey} />
      )}

      {/* Event Switch Confirmation Dialog */}
      <EventSwitchConfirmDialog
        open={showEventSwitchDialog}
        onOpenChange={setShowEventSwitchDialog}
        onConfirm={handleConfirmEventSwitch}
        onCancel={handleCancelEventSwitch}
        currentEvent={getCurrentEvent()}
        newEvent={eventKey}
        hasStoredData={getCurrentEvent() ? hasStoredEventData(getCurrentEvent()) : false}
      />
    </div>
  );
};

export default APIDataPage;
