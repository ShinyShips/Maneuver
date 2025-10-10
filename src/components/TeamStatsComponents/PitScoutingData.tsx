import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Calendar, User, Scale, Cog, Code, Info } from "lucide-react";
import { loadPitScoutingEntriesByTeam } from "@/lib/pitScoutingUtils";
import type { PitScoutingEntry } from "@/lib/pitScoutingTypes";

interface PitScoutingDataProps {
  teamNumber: string;
  selectedEvent?: string;
}

export const PitScoutingData = ({ teamNumber, selectedEvent }: PitScoutingDataProps) => {
  const [pitEntries, setPitEntries] = useState<PitScoutingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PitScoutingEntry | null>(null);

  useEffect(() => {
    const loadPitData = async () => {
      if (!teamNumber) {
        setPitEntries([]);
        setSelectedEntry(null);
        return;
      }

      setLoading(true);
      try {
        const entries = await loadPitScoutingEntriesByTeam(teamNumber);
        
        // Filter by event if specified
        const filteredEntries = selectedEvent && selectedEvent !== "all" 
          ? entries.filter(entry => entry.eventName === selectedEvent)
          : entries;
        
        setPitEntries(filteredEntries);
        
        // Auto-select the most recent entry for the selected event
        if (filteredEntries.length > 0) {
          const mostRecent = filteredEntries.reduce((latest, current) => 
            current.timestamp > latest.timestamp ? current : latest
          );
          setSelectedEntry(mostRecent);
        } else {
          setSelectedEntry(null);
        }
      } catch (error) {
        console.error("Error loading pit scouting data:", error);
        setPitEntries([]);
        setSelectedEntry(null);
      } finally {
        setLoading(false);
      }
    };

    loadPitData();
  }, [teamNumber, selectedEvent]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pit Scouting Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading pit scouting data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pitEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pit Scouting Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No pit scouting data found for Team {teamNumber}
              {selectedEvent && selectedEvent !== "all" && ` at ${selectedEvent}`}.
              Visit the pit and collect this data using the Pit Scouting page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entry Selection */}
      {pitEntries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Pit Scouting Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {pitEntries.map((entry) => (
                <Button
                  key={entry.id}
                  variant={selectedEntry?.id === entry.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedEntry(entry)}
                  className="flex items-center gap-2 justify-start sm:justify-center text-left"
                >
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">{entry.eventName}</span>
                  <span className="text-xs opacity-75 shrink-0">
                    ({new Date(entry.timestamp).toLocaleDateString()})
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Entry Details */}
      {selectedEntry && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">Scouted by:</span>
                  <span className="truncate">{selectedEntry.scoutName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">Date:</span>
                  <span className="truncate">{new Date(selectedEntry.timestamp).toLocaleDateString()}</span>
                </div>
                {selectedEntry.weight && (
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Weight:</span>
                    <span className="truncate">{selectedEntry.weight} lbs</span>
                  </div>
                )}
                {selectedEntry.drivetrain && (
                  <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Drivetrain:</span>
                    <span className="truncate">{selectedEntry.drivetrain}</span>
                  </div>
                )}
                {selectedEntry.programmingLanguage && (
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Language:</span>
                    <span className="truncate">{selectedEntry.programmingLanguage}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Robot Photo */}
          {selectedEntry.robotPhoto && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Robot Photo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={selectedEntry.robotPhoto} 
                  alt="Robot" 
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
              </CardContent>
            </Card>
          )}

          {/* Ground Pickup Capabilities */}
          {selectedEntry.groundPickupCapabilities && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Ground Pickup Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.groundPickupCapabilities.coralGroundPickup && (
                    <Badge variant="secondary">Coral Ground Pickup</Badge>
                  )}
                  {selectedEntry.groundPickupCapabilities.algaeGroundPickup && (
                    <Badge variant="secondary">Algae Ground Pickup</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto Scoring Capabilities */}
          {selectedEntry.reportedAutoScoring && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Auto Scoring by Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(selectedEntry.reportedAutoScoring).map(([position, scoring]) => {
                    const hasScoring = [1, 2, 3, 4].some(level => 
                      (scoring[`coralL${level}` as keyof typeof scoring] as number) > 0
                    ) || scoring.algaeNet > 0 || scoring.algaeProcessor > 0;
                    
                    if (!hasScoring) return null;
                    
                    return (
                      <div key={position} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">
                          Position {position.replace('position', '')}
                        </h4>
                        <div className="space-y-2 text-sm">
                          {[1, 2, 3, 4].map(level => {
                            const count = scoring[`coralL${level}` as keyof typeof scoring] as number;
                            return count > 0 ? (
                              <div key={level} className="flex justify-between">
                                <span>Level {level}:</span>
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            ) : null;
                          })}
                          {scoring.algaeNet > 0 && (
                            <div className="flex justify-between">
                              <span>Algae to Net:</span>
                              <Badge variant="secondary">{scoring.algaeNet}</Badge>
                            </div>
                          )}
                          {scoring.algaeProcessor > 0 && (
                            <div className="flex justify-between">
                              <span>Algae to Processor:</span>
                              <Badge variant="secondary">{scoring.algaeProcessor}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teleop Scoring Capabilities */}
          {selectedEntry.reportedTeleopScoring && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Teleop Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Coral Scoring</h4>
                    <div className="space-y-2 text-sm">
                      {[1, 2, 3, 4].map(level => {
                        const count = selectedEntry.reportedTeleopScoring![`coralL${level}` as keyof typeof selectedEntry.reportedTeleopScoring] as number;
                        return count > 0 ? (
                          <div key={level} className="flex justify-between">
                            <span>Level {level}:</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Algae Capabilities</h4>
                    <div className="space-y-2 text-sm">
                      {selectedEntry.reportedTeleopScoring.totalAlgae > 0 && (
                        <div className="flex justify-between">
                          <span>Total Algae:</span>
                          <Badge variant="secondary">{selectedEntry.reportedTeleopScoring.totalAlgae}</Badge>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.reportedTeleopScoring.algaeNetShots && (
                          <Badge variant="outline">Net Shots</Badge>
                        )}
                        {selectedEntry.reportedTeleopScoring.algaeProcessor && (
                          <Badge variant="outline">Processor</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Endgame Capabilities */}
          {selectedEntry.reportedEndgame && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Endgame Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.reportedEndgame.canShallowClimb && (
                    <Badge variant="secondary">Shallow Climb</Badge>
                  )}
                  {selectedEntry.reportedEndgame.canDeepClimb && (
                    <Badge variant="secondary">Deep Climb</Badge>
                  )}
                  {selectedEntry.reportedEndgame.canPark && (
                    <Badge variant="secondary">Can Park</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {selectedEntry.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={selectedEntry.notes}
                  readOnly
                  className="resize-none border-none bg-muted"
                  rows={3}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
