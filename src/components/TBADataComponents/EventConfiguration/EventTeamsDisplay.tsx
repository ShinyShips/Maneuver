import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { type TBATeam } from '@/lib/tbaUtils';
import { hasStoredNexusTeams } from '@/lib/nexusUtils';

interface EventTeamsDisplayProps {
  teams: TBATeam[];
  eventKey: string;
  isStored: boolean;
  onStoreTeams: () => void;
  onClearStored: () => void;
}

export const EventTeamsDisplay: React.FC<EventTeamsDisplayProps> = ({
  teams,
  eventKey,
  isStored,
  onStoreTeams,
  onClearStored,
}) => {
  const hasNexusTeams = hasStoredNexusTeams(eventKey);
  
  if (teams.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Event Teams ({teams.length})
              {isStored && (
                <Badge variant="outline" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Stored
                </Badge>
              )}
            </CardTitle>
            <CardTitle className="text-sm text-muted-foreground">
              Teams participating in event: {eventKey}
              {hasNexusTeams && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <MapPin className="h-3 w-3 mr-1" />
                    Nexus teams also available with pit locations
                  </Badge>
                </div>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            {!isStored && (
              <Button onClick={onStoreTeams} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Store for Pit Scouting</span>
              </Button>
            )}
            {isStored && (
              <Button onClick={onClearStored} variant="outline" size="sm" className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Clear Stored</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
          {teams
            .sort((a, b) => a.team_number - b.team_number)
            .map((team) => (
            <div
              key={team.key}
              className="flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-semibold text-sm text-center">
                {team.team_number}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {teams.length} teams total
        </div>
        
        {!isStored && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Teams not stored yet</p>
                <p>Click "Store for Pit Scouting" to save this team list for pit scouting assignments.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
