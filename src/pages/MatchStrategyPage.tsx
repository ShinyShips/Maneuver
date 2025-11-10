import { useState } from "react";
import { MatchHeader } from "@/components/MatchStrategyComponents/MatchHeader";
import { FieldStrategy } from "@/components/MatchStrategyComponents/FieldStrategy";
import { TeamAnalysis } from "@/components/MatchStrategyComponents/TeamAnalysis";
import { clearAllStrategies, saveAllStrategyCanvases } from "@/lib/strategyCanvasUtils";
import { useMatchStrategy } from "@/hooks/useMatchStrategy";

const MatchStrategyPage = () => {
  const [activeTab, setActiveTab] = useState("autonomous");
  const [activeStatsTab, setActiveStatsTab] = useState("overall");
  
  const {
    selectedTeams,
    availableTeams,
    matchNumber,
    isLookingUpMatch,
    confirmedAlliances,
    selectedBlueAlliance,
    selectedRedAlliance,
    getTeamStats,
    handleTeamChange,
    applyAllianceToRed,
    applyAllianceToBlue,
    setMatchNumber
  } = useMatchStrategy();

  const handleClearAll = () => clearAllStrategies(setActiveTab, activeTab);
  const handleSaveAll = () => saveAllStrategyCanvases(matchNumber, selectedTeams);

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 pt-6 pb-6">
      <div className="w-full max-w-7xl">
        <h1 className="text-2xl font-bold">Match Strategy</h1>
      </div>
      <div className="flex flex-col items-center gap-4 max-w-7xl w-full">
        <MatchHeader
          matchNumber={matchNumber}
          isLookingUpMatch={isLookingUpMatch}
          onMatchNumberChange={setMatchNumber}
          onClearAll={handleClearAll}
          onSaveAll={handleSaveAll}
        />

        <div className="flex flex-col gap-8 w-full pb-6">
          <FieldStrategy
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedTeams={selectedTeams}
          />

          <TeamAnalysis
            selectedTeams={selectedTeams}
            availableTeams={availableTeams}
            activeStatsTab={activeStatsTab}
            confirmedAlliances={confirmedAlliances}
            selectedBlueAlliance={selectedBlueAlliance}
            selectedRedAlliance={selectedRedAlliance}
            getTeamStats={getTeamStats}
            onTeamChange={handleTeamChange}
            onStatsTabChange={setActiveStatsTab}
            onBlueAllianceChange={applyAllianceToBlue}
            onRedAllianceChange={applyAllianceToRed}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchStrategyPage;