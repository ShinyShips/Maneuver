import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { transformToObjectFormat } from "@/lib/dataTransformation";
import { generateEntryId } from "@/lib/scoutingDataUtils";
import { 
  saveScoutingEntry,
  db
} from "@/lib/dexieDB";
import type { ScoutingDataWithId } from "@/lib/scoutingDataUtils";
import { ArrowRight } from "lucide-react";

const EndgamePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const states = location.state;

  // Rescout mode detection
  const rescoutData = states?.rescout;
  const isRescoutMode = rescoutData?.isRescout || false;
  const rescoutTeams = rescoutData?.teams || [];
  const currentTeamIndex = rescoutData?.currentTeamIndex || 0;
  const rescoutEventKey = rescoutData?.eventKey;

  const [shallowClimbAttempted, setShallowClimbAttempted] = useState(false);
  const [deepClimbAttempted, setDeepClimbAttempted] = useState(false);
  const [parkAttempted, setParkAttempted] = useState(false);
  const [climbFailed, setClimbFailed] = useState(false);
  const [brokeDown, setBrokeDown] = useState(false);
  const [comment, setComment] = useState("");

  // Correction dialog state
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [pendingSubmission, setPendingSubmission] = useState<{
    entryWithId: ScoutingDataWithId;
    existingEntryId: string;
    idsToDelete?: string[];
  } | null>(null);

  const getActionsFromLocalStorage = (phase: string) => {
    const saved = localStorage.getItem(`${phase}StateStack`);
    return saved ? JSON.parse(saved) : [];
  };

  const handleSubmit = async () => {
    try {
      const autoActions = getActionsFromLocalStorage("auto");
      const teleopActions = getActionsFromLocalStorage("teleop");
      
      const scoutingInputs = {
        matchNumber: states?.inputs?.matchNumber || "",
        alliance: states?.inputs?.alliance || "",
        scoutName: states?.inputs?.scoutName || "",
        selectTeam: states?.inputs?.selectTeam || "",
        eventName: states?.inputs?.eventName || localStorage.getItem("eventName") || "",
        startPoses: states?.inputs?.startPoses || [false, false, false, false, false, false],
        autoActions: autoActions,
        teleopActions: teleopActions,
        autoPassedStartLine: states?.inputs?.autoPassedStartLine || false,
        teleopPlayedDefense: states?.inputs?.teleopPlayedDefense || false,
        shallowClimbAttempted,
        deepClimbAttempted,
        parkAttempted,
        climbFailed,
        brokeDown,
        comment
      };

      const objectData = transformToObjectFormat(scoutingInputs);
      const uniqueId = generateEntryId(objectData);
      
      const entryWithId: ScoutingDataWithId = {
        id: uniqueId,
        data: objectData,
        timestamp: Date.now()
      };

      // Check for existing entries with same match/team/alliance/event
      const allEntries = await db.scoutingData.toArray();
      
      const existingEntries = allEntries.filter(entry => 
        entry.matchNumber === scoutingInputs.matchNumber &&
        entry.teamNumber === scoutingInputs.selectTeam &&
        entry.alliance === scoutingInputs.alliance &&
        entry.eventName === scoutingInputs.eventName
      );

      // Check if we're in rescout mode and there are existing entries
      if (isRescoutMode && existingEntries.length > 0) {
        // Store the IDs to delete later, show correction dialog for notes
        setPendingSubmission({ 
          entryWithId, 
          existingEntryId: existingEntries[0].id,
          idsToDelete: existingEntries.map((e: { id: string }) => e.id)
        });
        setShowCorrectionDialog(true);
        return;
      }

      // If not in rescout mode but there are duplicates, delete them
      if (existingEntries.length > 0) {
        const idsToDelete = existingEntries.map((e: { id: string }) => e.id);
        await db.scoutingData.bulkDelete(idsToDelete);
      }

      // Save the new entry
      await saveScoutingEntry(entryWithId);

      localStorage.removeItem("autoStateStack");
      localStorage.removeItem("teleopStateStack");

      // Handle batch rescout navigation
      if (isRescoutMode && rescoutTeams.length > 0 && currentTeamIndex < rescoutTeams.length - 1) {
        // Move to next team in batch
        const nextIndex = currentTeamIndex + 1;
        const nextTeamNumber = rescoutTeams[nextIndex];
        
        toast.success(`Match data saved! Moving to team ${nextTeamNumber} (${nextIndex + 1}/${rescoutTeams.length})...`);
        
        navigate("/game-start", {
          state: {
            rescout: {
              isRescout: true,
              matchNumber: rescoutData.matchNumber,
              alliance: rescoutData.alliance,
              eventKey: rescoutEventKey,
              teams: rescoutTeams,
              currentTeamIndex: nextIndex,
            },
          },
        });
        return;
      }

      const currentMatchNumber = localStorage.getItem("currentMatchNumber") || "1";
      const nextMatchNumber = (parseInt(currentMatchNumber) + 1).toString();
      localStorage.setItem("currentMatchNumber", nextMatchNumber);

      toast.success("Match data saved successfully!");
      
      // Navigate back to validation detail if in rescout mode, otherwise game-start
      if (isRescoutMode) {
        navigate("/match-validation");
      } else {
        navigate("/game-start");
      }
      
    } catch (error) {
      console.error("Error saving match data:", error);
      toast.error("Error saving match data");
    }
  };

  const handleConfirmCorrection = async () => {
    if (!pendingSubmission) return;

    try {
      const currentScout = states?.inputs?.scoutName || "";
      
      // First, delete all existing entries
      if (pendingSubmission.idsToDelete && pendingSubmission.idsToDelete.length > 0) {
        await db.scoutingData.bulkDelete(pendingSubmission.idsToDelete);
      }
      
      // Then save the new entry with correction metadata added to the data
      const correctedEntry: ScoutingDataWithId = {
        ...pendingSubmission.entryWithId,
        data: {
          ...pendingSubmission.entryWithId.data,
          isCorrected: true,
          correctionCount: 1,
          lastCorrectedAt: Date.now(),
          lastCorrectedBy: currentScout,
          correctionNotes: correctionNotes || undefined,
        }
      };
      
      await saveScoutingEntry(correctedEntry);

      localStorage.removeItem("autoStateStack");
      localStorage.removeItem("teleopStateStack");

      setShowCorrectionDialog(false);
      setPendingSubmission(null);
      setCorrectionNotes("");

      // Handle batch rescout navigation
      if (isRescoutMode && rescoutTeams.length > 0 && currentTeamIndex < rescoutTeams.length - 1) {
        const nextIndex = currentTeamIndex + 1;
        const nextTeamNumber = rescoutTeams[nextIndex];
        
        toast.success(`Correction saved! Moving to team ${nextTeamNumber} (${nextIndex + 1}/${rescoutTeams.length})...`);
        
        navigate("/game-start", {
          state: {
            rescout: {
              isRescout: true,
              matchNumber: rescoutData.matchNumber,
              alliance: rescoutData.alliance,
              eventKey: rescoutEventKey,
              teams: rescoutTeams,
              currentTeamIndex: nextIndex,
            },
          },
        });
        return;
      }

      toast.success("Match data corrected successfully!");
      navigate("/match-validation");
      
    } catch (error) {
      console.error("Error updating match data:", error);
      toast.error("Error updating match data");
    }
  };

  const handleCancelCorrection = () => {
    setShowCorrectionDialog(false);
    setPendingSubmission(null);
    setCorrectionNotes("");
  };

  const handleBack = () => {
    navigate("/teleop-scoring", {
      state: {
        inputs: {
          ...states?.inputs,
          endgameData: {
            shallowClimbAttempted,
            deepClimbAttempted,
            parkAttempted,
            climbFailed,
            brokeDown,
            comment
          }
        }
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col items-center px-4 pt-6 pb-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold pb-4">Endgame</h1>
      </div>
      <div className="flex flex-col items-center gap-6 max-w-2xl w-full h-full min-h-0 pb-4">
        {/* Match Info */}
        {states?.inputs && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Match Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {states.inputs.eventName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event:</span>
                  <span className="font-medium">{states.inputs.eventName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Match:</span>
                <span className="font-medium">{states.inputs.matchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alliance:</span>
                <Badge 
                  variant={states.inputs.alliance === "red" ? "destructive" : "default"}
                  className={states.inputs.alliance === "blue" ? "bg-blue-500 text-white" : "bg-red-500 text-white"}
                >
                  {states.inputs.alliance?.charAt(0).toUpperCase() + states.inputs.alliance?.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team:</span>
                <span className="font-medium">{states.inputs.selectTeam}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Climbing Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Climbing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant={shallowClimbAttempted ? "default" : "outline"}
                onClick={() => {
                  setShallowClimbAttempted(!shallowClimbAttempted);
                  if (!shallowClimbAttempted) {
                    setDeepClimbAttempted(false);
                    setParkAttempted(false);
                  }
                }}
                className="h-12"
                style={shallowClimbAttempted ? {
                  backgroundColor: '#3b82f6',
                  color: 'white'
                } : undefined}
              >
                {shallowClimbAttempted ? "✓ " : ""}Shallow Climb Attempted
              </Button>
              
              <Button
                variant={deepClimbAttempted ? "default" : "outline"}
                onClick={() => {
                  setDeepClimbAttempted(!deepClimbAttempted);
                  if (!deepClimbAttempted) {
                    setShallowClimbAttempted(false);
                    setParkAttempted(false);
                  }
                }}
                className="h-12"
                style={deepClimbAttempted ? {
                  backgroundColor: '#16a34a',
                  color: 'white'
                } : undefined}
              >
                {deepClimbAttempted ? "✓ " : ""}Deep Climb Attempted
              </Button>
              
              <Button
                variant={parkAttempted ? "default" : "outline"}
                onClick={() => {
                  setParkAttempted(!parkAttempted);
                  if (!parkAttempted) {
                    setShallowClimbAttempted(false);
                    setDeepClimbAttempted(false);
                  }
                }}
                className="h-12"
                style={parkAttempted ? {
                  backgroundColor: '#ca8a04',
                  color: 'white'
                } : undefined}
              >
                {parkAttempted ? "✓ " : ""}Park Attempted
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Issues Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant={climbFailed ? "destructive" : "outline"}
                onClick={() => setClimbFailed(!climbFailed)}
                className="h-12"
              >
                {climbFailed ? "✓ " : ""}Climb Failed
              </Button>
              
              <Button
                variant={brokeDown ? "destructive" : "outline"}
                onClick={() => setBrokeDown(!brokeDown)}
                className="h-12"
              >
                {brokeDown ? "✓ " : ""}Broke Down
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="w-full flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="comment">Additional Notes</Label>
              <Textarea
                id="comment"
                placeholder="Enter any additional observations or notes about the match..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full pb-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-12 text-lg"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-2 h-12 text-lg font-semibold"
            style={{
              backgroundColor: '#16a34a',
              color: 'white'
            }}
          >
            Submit Match Data
            <ArrowRight className="ml-0.5" />
          </Button>
        </div>
      </div>

      {/* Correction Notes Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correction Confirmation</DialogTitle>
            <DialogDescription>
              This will overwrite existing data for this match and team. 
              Please provide a reason for the correction (optional but recommended).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="correction-notes">Correction Notes</Label>
              <Textarea
                id="correction-notes"
                placeholder="e.g., Original data was inaccurate, missed actions, incorrect count..."
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCorrection} className="p-2">
              Cancel
            </Button>
            <Button onClick={handleConfirmCorrection} className="p-2">
              Confirm Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EndgamePage;