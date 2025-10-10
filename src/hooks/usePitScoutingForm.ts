import { useState, useEffect } from "react";
import { type AutoPositionScoring, type TeleopScoring, type GroundPickupCapabilities } from "@/lib/pitScoutingTypes";
import { loadPitScoutingEntry, savePitScoutingEntry } from "@/lib/pitScoutingUtils";
import { analytics } from '@/lib/analytics';
import { toast } from "sonner";

interface PitScoutingFormState {
  teamNumber: string;
  eventName: string;
  scoutName: string;
  weight: string;
  drivetrain: string;
  programmingLanguage: string;
  robotPhoto: string | null;
  notes: string;
  autoScoring: {
    position0: AutoPositionScoring;
    position1: AutoPositionScoring;
    position2: AutoPositionScoring;
    position3: AutoPositionScoring;
    position4: AutoPositionScoring;
  };
  teleopScoring: TeleopScoring;
  groundPickupCapabilities: GroundPickupCapabilities;
  reportedEndgame: {
    canShallowClimb: boolean;
    canDeepClimb: boolean;
    canPark: boolean;
  };
  existingEntry: boolean;
  isLoading: boolean;
}

const initialAutoScoring = {
  position0: { coralL1: 0, coralL2: 0, coralL3: 0, coralL4: 0, algaeNet: 0, algaeProcessor: 0 },
  position1: { coralL1: 0, coralL2: 0, coralL3: 0, coralL4: 0, algaeNet: 0, algaeProcessor: 0 },
  position2: { coralL1: 0, coralL2: 0, coralL3: 0, coralL4: 0, algaeNet: 0, algaeProcessor: 0 },
  position3: { coralL1: 0, coralL2: 0, coralL3: 0, coralL4: 0, algaeNet: 0, algaeProcessor: 0 },
  position4: { coralL1: 0, coralL2: 0, coralL3: 0, coralL4: 0, algaeNet: 0, algaeProcessor: 0 },
};

const initialTeleopScoring = {
  coralL1: 0,
  coralL2: 0,
  coralL3: 0,
  coralL4: 0,
  totalAlgae: 0,
  algaeNetShots: false,
  algaeProcessor: false,
};

const initialGroundPickupCapabilities = {
  coralGroundPickup: false,
  algaeGroundPickup: false,
};

const initialEndgame = {
  canShallowClimb: false,
  canDeepClimb: false,
  canPark: false,
};

export const usePitScoutingForm = (): PitScoutingFormState & {
  setTeamNumber: (value: string) => void;
  setEventName: (value: string) => void;
  setScoutName: (value: string) => void;
  setWeight: (value: string) => void;
  setDrivetrain: (value: string) => void;
  setProgrammingLanguage: (value: string) => void;
  setRobotPhoto: (value: string | null) => void;
  setNotes: (value: string) => void;
  setAutoScoring: React.Dispatch<React.SetStateAction<PitScoutingFormState['autoScoring']>>;
  setTeleopScoring: React.Dispatch<React.SetStateAction<TeleopScoring>>;
  setGroundPickupCapabilities: React.Dispatch<React.SetStateAction<GroundPickupCapabilities>>;
  setReportedEndgame: React.Dispatch<React.SetStateAction<PitScoutingFormState['reportedEndgame']>>;
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
} => {
  const [teamNumber, setTeamNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [scoutName, setScoutName] = useState("");
  const [weight, setWeight] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [programmingLanguage, setProgrammingLanguage] = useState("");
  const [robotPhoto, setRobotPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [autoScoring, setAutoScoring] = useState(initialAutoScoring);
  const [teleopScoring, setTeleopScoring] = useState(initialTeleopScoring);
  const [groundPickupCapabilities, setGroundPickupCapabilities] = useState(initialGroundPickupCapabilities);
  const [reportedEndgame, setReportedEndgame] = useState(initialEndgame);
  const [existingEntry, setExistingEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with saved data
  useEffect(() => {
    const savedScoutName = localStorage.getItem("currentScouter") || localStorage.getItem("scouterInitials") || "";
    const savedEventName = localStorage.getItem("eventName") || "";
    
    setScoutName(savedScoutName);
    setEventName(savedEventName);
    
    // Track page visit
    analytics.trackPageNavigation('pit_scouting');
  }, []);

  // Load existing data when team and event are set
  useEffect(() => {
    const loadExistingData = async () => {
      if (teamNumber && eventName) {
        try {
          const existing = await loadPitScoutingEntry(teamNumber, eventName);
          if (existing) {
            setExistingEntry(true);
            setWeight(existing.weight?.toString() || "");
            setDrivetrain(existing.drivetrain || "");
            setProgrammingLanguage(existing.programmingLanguage || "");
            setRobotPhoto(existing.robotPhoto || null);
            setNotes(existing.notes || "");
            
            // Load auto scoring data
            if (existing.reportedAutoScoring) {
              setAutoScoring(existing.reportedAutoScoring);
            }
            
            // Load teleop scoring data
            if (existing.reportedTeleopScoring) {
              setTeleopScoring(existing.reportedTeleopScoring);
            }
            
            // Load ground pickup capabilities
            if (existing.groundPickupCapabilities) {
              setGroundPickupCapabilities(existing.groundPickupCapabilities);
            }
            
            // Load endgame data
            setReportedEndgame({
              canShallowClimb: existing.reportedEndgame?.canShallowClimb ?? false,
              canDeepClimb: existing.reportedEndgame?.canDeepClimb ?? false,
              canPark: existing.reportedEndgame?.canPark ?? false,
            });
          } else {
            setExistingEntry(false);
          }
        } catch (error) {
          console.error("Error loading existing pit scouting data:", error);
        }
      }
    };
    
    loadExistingData();
  }, [teamNumber, eventName]);

  const validateForm = (): boolean => {
    if (!teamNumber.trim()) {
      toast.error("Team number is required");
      return false;
    }
    if (!eventName.trim()) {
      toast.error("Event name is required");
      return false;
    }
    if (!scoutName.trim()) {
      toast.error("Scout name is required");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setTeamNumber("");
    setWeight("");
    setDrivetrain("");
    setProgrammingLanguage("");
    setRobotPhoto(null);
    setNotes("");
    setAutoScoring(initialAutoScoring);
    setTeleopScoring(initialTeleopScoring);
    setGroundPickupCapabilities(initialGroundPickupCapabilities);
    setReportedEndgame(initialEndgame);
    setExistingEntry(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const entry = {
        teamNumber: teamNumber.trim(),
        eventName: eventName.trim(),
        scoutName: scoutName.trim(),
        weight: weight ? parseFloat(weight) : undefined,
        drivetrain: drivetrain || undefined,
        programmingLanguage: programmingLanguage || undefined,
        robotPhoto: robotPhoto || undefined,
        groundPickupCapabilities,
        reportedAutoScoring: autoScoring,
        reportedTeleopScoring: teleopScoring,
        reportedEndgame,
        notes: notes.trim() || undefined,
      };

      await savePitScoutingEntry(entry);
      
      const action = existingEntry ? "updated" : "saved";
      toast.success(`Pit scouting data ${action} successfully!`);
      
      // Track submission
      analytics.trackEvent('pit_scouting_submitted', {
        teamNumber: teamNumber.trim(),
        eventName: eventName.trim(),
        isUpdate: existingEntry
      });
      
      // Reset form for next team
      resetForm();
      
    } catch (error) {
      console.error("Error saving pit scouting data:", error);
      toast.error("Error saving pit scouting data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
    validateForm,
    handleSubmit,
    resetForm,
  };
};
