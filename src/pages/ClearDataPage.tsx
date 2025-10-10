import { useState, useEffect } from "react";
import { useDataStats } from "@/hooks/useDataStats";
import { useDataCleaning } from "@/hooks/useDataCleaning";
import { DeviceInfoCard } from "@/components/ClearComponents/DeviceInfoCard";
import { BackupRecommendationAlert } from "@/components/ClearComponents/BackupRecommendationAlert";
import { ClearAllDataDialog } from "@/components/ClearComponents/ClearAllDataDialog";
import { DataClearCard } from "@/components/ClearComponents/DataClearCard";


const ClearDataPage = () => {
  const [playerStation, setPlayerStation] = useState("");
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const { stats, refreshData, resetStats, updateMatchData } = useDataStats();
  const {
    handleClearScoutingData,
    handleClearPitScoutingData,
    handleClearScoutGameData,
    handleClearMatchData,
    handleClearApiData,
    handleClearAllData,
  } = useDataCleaning(refreshData, resetStats, updateMatchData);

  useEffect(() => {
    const station = localStorage.getItem("playerStation") || "Unknown";
    setPlayerStation(station);
  }, []);

  return (
    <div className="min-h-screen w-full px-4 pt-6 pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col items-start gap-4 max-w-2xl mb-6">
          <h1 className="text-2xl font-bold">Clear Data</h1>
          <p className="text-muted-foreground">
            Permanently delete stored data from this device. This action cannot be undone.
          </p>
        </div>

        {/* Top Row - Device Info and Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <DeviceInfoCard playerStation={playerStation} />
          <BackupRecommendationAlert 
            onClearAllClick={() => setShowClearAllConfirm(true)} 
          />
        </div>

        {/* Data Clear Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DataClearCard
            title="Scouting Data"
            description="Match scouting data collected on this device"
            entryCount={stats.scoutingDataCount}
            entryLabel="entries"
            storageSize={stats.scoutingDataSize}
            onClear={handleClearScoutingData}
          />

          <DataClearCard
            title="Pit Scouting Data"
            description="Robot pit scouting data collected at events"
            entryCount={stats.pitScoutingDataCount}
            entryLabel="entries"
            storageSize={stats.pitScoutingDataSize}
            onClear={handleClearPitScoutingData}
          />

          <DataClearCard
            title="Scout Profile Data"
            description="Scout predictions, stakes, and leaderboard data"
            entryCount={stats.scoutGameDataCount}
            entryLabel="entries"
            storageSize={stats.scoutGameDataSize}
            onClear={handleClearScoutGameData}
            warningMessage={`This will permanently delete ${stats.scoutGameDataCount} scout game entries (scouts and predictions).`}
          />

          <DataClearCard
            title="TBA & Nexus API Data"
            description="Teams, pit data, matches, and event data from APIs"
            entryCount={stats.apiDataCount}
            entryLabel="items"
            storageSize={stats.apiDataSize}
            onClear={handleClearApiData}
            warningMessage={`This will permanently delete all downloaded API data including teams, pit addresses, pit maps, match results, and event information.`}
          />

          <DataClearCard
            title="Match Schedule Data"
            description="Tournament match schedule and team information"
            entryCount={stats.matchDataCount}
            entryLabel="matches"
            storageSize={stats.matchDataSize}
            onClear={handleClearMatchData}
          />
        </div>
      </div>

      <ClearAllDataDialog
        open={showClearAllConfirm}
        onOpenChange={setShowClearAllConfirm}
        onConfirm={handleClearAllData}
        scoutingDataCount={stats.scoutingDataCount}
        pitScoutingDataCount={stats.pitScoutingDataCount}
        scoutGameDataCount={stats.scoutGameDataCount}
        apiDataCount={stats.apiDataCount}
        matchDataCount={stats.matchDataCount}
      />
    </div>
  );
};

export default ClearDataPage;
