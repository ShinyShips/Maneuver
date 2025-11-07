import React, { useState, useEffect, useMemo } from 'react';
import { useMatchValidation } from '@/hooks';
import { 
  ValidationSummaryCard, 
  MatchValidationDetail, 
  MatchListFilters, 
  ValidationSettingsSheet,
  MatchListCard,
  type MatchFilters 
} from '@/components/MatchValidationComponents';
import { GenericSelector } from '@/components/ui/generic-selector';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Settings, AlertTriangle } from 'lucide-react';
import type { MatchValidationResult, ValidationConfig } from '@/lib/matchValidationTypes';
import { DEFAULT_VALIDATION_CONFIG } from '@/lib/matchValidationTypes';
import { formatMatchLabel, filterAndSortResults } from '@/lib/validationDisplayUtils';

const VALIDATION_CONFIG_KEY = 'validationConfig';

export const MatchValidationPage: React.FC = () => {
  const [eventKey, setEventKey] = useState('');
  const [eventsList, setEventsList] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchValidationResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [validationConfig, setValidationConfig] = useState<ValidationConfig>(DEFAULT_VALIDATION_CONFIG);
  const [filters, setFilters] = useState<MatchFilters>({
    status: 'all',
    matchType: 'all',
    searchQuery: '',
    sortBy: 'match',
    sortOrder: 'desc',
  });
  
  // Load events list, current event, and validation config from localStorage on mount
  useEffect(() => {
    const currentEvent = localStorage.getItem('eventName') || '';
    setEventKey(currentEvent);
    
    const savedEvents = localStorage.getItem('eventsList');
    if (savedEvents) {
      try {
        setEventsList(JSON.parse(savedEvents));
      } catch {
        setEventsList([]);
      }
    }
    
    // Load validation config
    const savedConfig = localStorage.getItem(VALIDATION_CONFIG_KEY);
    if (savedConfig) {
      try {
        setValidationConfig(JSON.parse(savedConfig));
      } catch {
        setValidationConfig(DEFAULT_VALIDATION_CONFIG);
      }
    }
  }, []);
  
  const {
    isValidating,
    validationResults,
    validateEvent,
    refreshResults,
  } = useMatchValidation({
    eventKey: eventKey,
    autoLoad: true,
    config: validationConfig, // Pass config to validation hook
  });

  // Handle event change
  const handleEventChange = (newEventKey: string) => {
    setEventKey(newEventKey);
    localStorage.setItem('eventName', newEventKey);
  };

  // Handle validation config save
  const handleConfigSave = (newConfig: ValidationConfig) => {
    setValidationConfig(newConfig);
    localStorage.setItem(VALIDATION_CONFIG_KEY, JSON.stringify(newConfig));
    // Note: Will need to re-validate for changes to take effect
  };

  // Sort and filter matches
  const sortedAndFilteredResults = useMemo(() => {
    return filterAndSortResults(validationResults, filters);
  }, [validationResults, filters]);

  return (
    <div className="container min-h-screen mx-auto p-4 pb-24 space-y-6 mt-safe">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold">Match Validation</h1>
            <p className="text-muted-foreground">
              Verify scouting data against official TBA results
            </p>
          </div>
          <div className="flex gap-2 flex-wrap z-50 relative">
            <Button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
              }}
              variant="outline"
              size="icon"
              title="Validation Settings"
              aria-label="Open validation settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => refreshResults()}
              disabled={isValidating}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => validateEvent()}
              disabled={isValidating || !eventKey}
              className='p-4'
            >
              {isValidating ? 'Validating...' : 'Validate Event'}
            </Button>
          </div>
        </div>
        
        {/* No Events Alert */}
        {eventsList.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4 text-amber-500" color="orange"/>
            <AlertDescription className='text-amber-500'>
              No events available. Please fetch event data from the API Data page.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Event Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="font-medium shrink-0">Event:</label>
            <GenericSelector
              label="Select Event"
              value={eventKey}
              availableOptions={eventsList}
              onValueChange={handleEventChange}
              placeholder="Select an event"
              displayFormat={(val) => val}
              className="min-w-[200px] max-w-[300px]"
            />
          </div>
          {!eventKey && eventsList.length > 0 && (
            <p className="text-sm text-muted-foreground break-words">
              Please select an event to view validation results
            </p>
          )}
        </div>
      </div>

      {/* No Event Selected */}
      {!eventKey && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No Event Selected</p>
              <p className="text-sm mt-2">
                Please select an event from the dropdown above to view validation results.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {validationResults.length > 0 && (
        <ValidationSummaryCard results={validationResults} />
      )}

      {/* Filters */}
      {validationResults.length > 0 && (
        <MatchListFilters
          filters={filters}
          onFiltersChange={setFilters}
          matchCount={validationResults.length}
          filteredCount={sortedAndFilteredResults.length}
        />
      )}

      {/* Match List */}
      <MatchListCard
        results={validationResults}
        filteredResults={sortedAndFilteredResults}
        onMatchClick={setSelectedMatch}
      />

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchValidationDetail
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onReValidate={() => {
            // Re-validate this specific match
            setSelectedMatch(null);
            validateEvent();
          }}
          formatMatchLabel={formatMatchLabel}
        />
      )}

      {/* Validation Settings Sheet */}
      <ValidationSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentConfig={validationConfig}
        onSave={handleConfigSave}
      />
    </div>
  );
};
