import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from 'lucide-react';

// No props needed - component handles its own state
const MatchDataLoader: React.FC = () => {
  const [lastLoadedEvent, setLastLoadedEvent] = useState("");
  const [matchCount, setMatchCount] = useState(0);

  // Check for existing match data on mount
  useEffect(() => {
    const matchDataStr = localStorage.getItem("matchData");
    const eventName = localStorage.getItem("eventName");
    
    if (matchDataStr && eventName) {
      try {
        const matchData = JSON.parse(matchDataStr);
        if (Array.isArray(matchData) && matchData.length > 0) {
          setLastLoadedEvent(eventName);
          setMatchCount(matchData.length);
        }
      } catch (error) {
        console.error("Error parsing existing match data:", error);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {lastLoadedEvent && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 dark:text-green-200">
                Currently loaded: <strong>{matchCount} matches</strong> from <strong>{lastLoadedEvent}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Match Data Loading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <span>Enter the event key from The Blue Alliance (found on event pages)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <span>Match data includes team lineups for all qualification matches</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <span>Data is stored locally and used to populate team dropdowns during scouting</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <span>Loading new event data will replace the previously loaded event</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchDataLoader;
