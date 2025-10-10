import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save } from "lucide-react";
import { usePitScoutingForm } from "@/hooks/usePitScoutingForm";
import { BasicInformation } from "@/components/PitScoutingComponents/BasicInformation";
import { RobotPhotoSection } from "@/components/PitScoutingComponents/RobotPhotoSection";
import { TechnicalSpecifications } from "@/components/PitScoutingComponents/TechnicalSpecifications";
import { GroundPickupSection } from "@/components/PitScoutingComponents/GroundPickupSection";
import { AutoScoringByPosition } from "@/components/PitScoutingComponents/AutoScoringByPosition";
import { TeleopScoringSection } from "@/components/PitScoutingComponents/TeleopScoringSection";
import { EndgameCapabilities } from "@/components/PitScoutingComponents/EndgameCapabilities";
import { AdditionalNotes } from "@/components/PitScoutingComponents/AdditionalNotes";

const PitScoutingPage = () => {
  const {
    teamNumber,
    eventName,
    scoutName,
    weight,
    drivetrain,
    programmingLanguage,
    robotPhoto,
    notes,
    autoScoring,
    teleopScoring,
    groundPickupCapabilities,
    reportedEndgame,
    existingEntry,
    isLoading,
    setTeamNumber,
    setEventName,
    setScoutName,
    setWeight,
    setDrivetrain,
    setProgrammingLanguage,
    setRobotPhoto,
    setNotes,
    setAutoScoring,
    setTeleopScoring,
    setGroundPickupCapabilities,
    setReportedEndgame,
    handleSubmit,
  } = usePitScoutingForm();

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 pt-6 pb-8 md:pb-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pit Scouting</h1>
        </div>

        {existingEntry && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Existing pit scouting data found for Team {teamNumber} at {eventName}. 
              Submitting will update the existing entry.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <BasicInformation
            teamNumber={teamNumber}
            setTeamNumber={setTeamNumber}
            eventName={eventName}
            setEventName={setEventName}
            scoutName={scoutName}
            setScoutName={setScoutName}
          />

          <RobotPhotoSection
            robotPhoto={robotPhoto}
            setRobotPhoto={setRobotPhoto}
          />

          <TechnicalSpecifications
            weight={weight}
            setWeight={setWeight}
            drivetrain={drivetrain}
            setDrivetrain={setDrivetrain}
            programmingLanguage={programmingLanguage}
            setProgrammingLanguage={setProgrammingLanguage}
          />

          <GroundPickupSection
            groundPickupCapabilities={groundPickupCapabilities}
            setGroundPickupCapabilities={setGroundPickupCapabilities}
          />

          <AutoScoringByPosition
            autoScoring={autoScoring}
            setAutoScoring={setAutoScoring}
          />

          <TeleopScoringSection
            teleopScoring={teleopScoring}
            setTeleopScoring={setTeleopScoring}
          />

          <EndgameCapabilities
            reportedEndgame={reportedEndgame}
            setReportedEndgame={setReportedEndgame}
          />

          <AdditionalNotes
            notes={notes}
            setNotes={setNotes}
          />

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="w-full max-w-92 px-8"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : existingEntry ? "Update Pit Data" : "Save Pit Data"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitScoutingPage;
