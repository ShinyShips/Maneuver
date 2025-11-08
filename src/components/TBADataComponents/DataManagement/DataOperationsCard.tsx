import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download,
  Loader2,
  MapPin,
  Bug,
  Database,
  Trophy,
  Users,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { type TBADataType } from '../EventConfiguration/DataTypeSelector';

interface DataOperationsCardProps {
  dataType: TBADataType;
  eventKey: string;
  apiKey: string;
  nexusApiKey: string;
  matchDataLoading: boolean;
  matchResultsLoading: boolean;
  validationLoading?: boolean;
  eventTeamsLoading: boolean;
  pitDataLoading: boolean;
  debugNexusLoading: boolean;
  onLoadMatchData: () => void;
  onLoadMatchResults: () => void;
  onLoadValidationData?: () => void;
  onLoadEventTeams: () => void;
  onLoadPitData: () => void;
  onDebugNexus: () => void;
}

export const DataOperationsCard: React.FC<DataOperationsCardProps> = ({
  dataType,
  eventKey,
  apiKey,
  nexusApiKey,
  matchDataLoading,
  matchResultsLoading,
  validationLoading,
  eventTeamsLoading,
  pitDataLoading,
  debugNexusLoading,
  onLoadMatchData,
  onLoadMatchResults,
  onLoadValidationData,
  onLoadEventTeams,
  onLoadPitData,
  onDebugNexus,
}) => {
  const getDataTypeInfo = () => {
    switch (dataType) {
      case 'match-data':
        return {
          title: 'Load Match Schedules',
          description: 'Download match schedules from The Blue Alliance for scouting',
          icon: Database,
          requiresEvent: true,
          requiresTBA: true,
          requiresNexus: false,
        };
      case 'match-results':
        return {
          title: 'Load Match Results',
          description: 'Download actual match scores and winners from The Blue Alliance',
          icon: Trophy,
          requiresEvent: true,
          requiresTBA: true,
          requiresNexus: false,
        };
      case 'match-validation-data':
        return {
          title: 'Load Match Validation Data',
          description: 'Download detailed match breakdowns for scouting validation',
          icon: CheckCircle,
          requiresEvent: true,
          requiresTBA: true,
          requiresNexus: false,
        };
      case 'event-teams':
        return {
          title: 'Load Event Teams',
          description: 'Download team list participating in the event from The Blue Alliance',
          icon: Users,
          requiresEvent: true,
          requiresTBA: true,
          requiresNexus: false,
        };
      case 'pit-data':
        return {
          title: 'Load Pit Data',
          description: 'Download pit assignments and map from Nexus API',
          icon: MapPin,
          requiresEvent: true,
          requiresTBA: false,
          requiresNexus: true,
        };
      case 'debug-nexus':
        return {
          title: 'Debug Nexus Events',
          description: 'Test Nexus API connectivity and list available events',
          icon: Bug,
          requiresEvent: false,
          requiresTBA: false,
          requiresNexus: true,
        };
      default:
        return null;
    }
  };

  const dataTypeInfo = getDataTypeInfo();
  if (!dataTypeInfo) return null;

  const getLoadButton = () => {
    const { requiresEvent, requiresTBA, requiresNexus } = dataTypeInfo;
    
    // Check requirements
    const hasEventKey = !requiresEvent || eventKey.trim();
    const hasTBAKey = !requiresTBA || apiKey.trim();
    const hasNexusKey = !requiresNexus || nexusApiKey.trim();
    
    const canLoad = hasEventKey && hasTBAKey && hasNexusKey;
    
    switch (dataType) {
      case 'match-data':
        return (
          <Button
            className="w-full h-12"
            onClick={onLoadMatchData}
            disabled={matchDataLoading || !canLoad}
          >
            {matchDataLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Match Data...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Load Match Data
              </>
            )}
          </Button>
        );
      case 'match-results':
        return (
          <Button
            className="w-full h-12"
            onClick={onLoadMatchResults}
            disabled={matchResultsLoading || !canLoad}
          >
            {matchResultsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Match Results...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Load Match Results
              </>
            )}
          </Button>
        );
      case 'match-validation-data':
        return (
          <Button
            className="w-full h-12"
            onClick={onLoadValidationData}
            disabled={validationLoading || !canLoad}
          >
            {validationLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Validation Data...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Load Match Validation Data
              </>
            )}
          </Button>
        );
      case 'event-teams':
        return (
          <Button
            className="w-full h-12"
            onClick={onLoadEventTeams}
            disabled={eventTeamsLoading || !canLoad}
          >
            {eventTeamsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Teams...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Load Event Teams
              </>
            )}
          </Button>
        );
      case 'pit-data':
        return (
          <Button
            className="w-full h-12"
            onClick={onLoadPitData}
            disabled={pitDataLoading || !canLoad}
          >
            {pitDataLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Pit Data...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Load Pit Data
              </>
            )}
          </Button>
        );
      case 'debug-nexus':
        return (
          <Button
            className="w-full h-12"
            onClick={onDebugNexus}
            disabled={debugNexusLoading || !canLoad}
          >
            {debugNexusLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Nexus Events...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Debug Nexus Events
              </>
            )}
          </Button>
        );
      default:
        return null;
    }
  };

  const getMissingRequirements = () => {
    const missing = [];
    if (dataTypeInfo.requiresEvent && !eventKey.trim()) {
      missing.push('Event Key');
    }
    if (dataTypeInfo.requiresTBA && !apiKey.trim()) {
      missing.push('TBA API Key');
    }
    if (dataTypeInfo.requiresNexus && !nexusApiKey.trim()) {
      missing.push('Nexus API Key');
    }
    return missing;
  };

  const missingRequirements = getMissingRequirements();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <dataTypeInfo.icon className="h-5 w-5" />
          {dataTypeInfo.title}
        </CardTitle>
        <CardDescription>
          {dataTypeInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements Check */}
        {missingRequirements.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Missing required information: {missingRequirements.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Load Button */}
        {getLoadButton()}

        {/* API Requirements Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {dataTypeInfo.requiresTBA && (
            <p>• Requires TBA API Key</p>
          )}
          {dataTypeInfo.requiresNexus && (
            <p>• Requires Nexus API Key</p>
          )}
          {dataTypeInfo.requiresEvent && (
            <p>• Requires Event Key</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
