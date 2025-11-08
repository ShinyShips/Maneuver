import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// This component is now simplified to just show information
// Loading functionality has been moved to TBADataPage
export const EventTeamsLoader: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Event Teams Loading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <span>Enter the event key from The Blue Alliance (found on event pages)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <span>Team list includes all teams registered for the event</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <span>Teams can be stored locally for pit scouting assignments</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <span>Stored team lists persist across sessions for easy access</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
