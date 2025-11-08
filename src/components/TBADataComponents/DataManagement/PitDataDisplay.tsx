import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Map, AlertCircle, Users } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasStoredNexusTeams } from '@/lib/nexusUtils';
import type { NexusPitAddresses, NexusPitMap } from '@/lib/nexusUtils';

interface PitDataDisplayProps {
  addresses: NexusPitAddresses | null;
  map: NexusPitMap | null;
  eventKey: string;
}

export const PitDataDisplay: React.FC<PitDataDisplayProps> = ({
  addresses,
  map,
  eventKey
}) => {
  const addressCount = addresses ? Object.keys(addresses).length : 0;
  const hasMap = map !== null;
  const hasExtractedTeams = hasStoredNexusTeams(eventKey);

  if (!addresses && !map) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No pit data available. Load pit data using the Nexus API above.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pit Data for {eventKey}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={addressCount > 0 ? "default" : "secondary"}>
                {addressCount} Pit Addresses
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hasMap ? "default" : "secondary"}>
                {hasMap ? "Pit Map Available" : "No Pit Map"}
              </Badge>
            </div>
            {hasExtractedTeams && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Users className="h-3 w-3 mr-1" />
                  Teams Extracted for Pit Assignments
                </Badge>
              </div>
            )}
          </div>
          {hasExtractedTeams && (
            <p className="text-xs text-muted-foreground mt-2">
              Team list automatically extracted from pit addresses and stored for pit scouting assignments
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pit Addresses */}
      {addresses && addressCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Pit Addresses ({addressCount} teams)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(addresses)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([teamNumber, pitAddress]) => (
                  <div 
                    key={teamNumber}
                    className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                  >
                    <span className="font-medium">Team {teamNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {pitAddress}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pit Map */}
      {map && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Pit Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Map Size: {map.size?.width || 0} × {map.size?.height || 0}</span>
                <span>Pits: {map.pits ? Object.keys(map.pits).length : 0}</span>
                {map.areas && <span>Areas: {Object.keys(map.areas).length}</span>}
              </div>
              
              {/* Simple text representation - could be enhanced with actual map rendering */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Pit map data loaded successfully. This contains:
                </p>
                <ul className="text-sm space-y-1">
                  {map.pits && <li>• {Object.keys(map.pits).length} pit locations</li>}
                  {map.areas && <li>• {Object.keys(map.areas).length} labeled areas</li>}
                  {map.walls && <li>• {Object.keys(map.walls).length} walls/boundaries</li>}
                  {map.labels && <li>• {Object.keys(map.labels).length} text labels</li>}
                  {map.arrows && <li>• {Object.keys(map.arrows).length} directional arrows</li>}
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Visual map rendering will be available in a future update.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
