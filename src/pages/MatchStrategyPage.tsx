/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/radix/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import FieldCanvas from "@/components/MatchStrategyComponents/FieldCanvas";
import { loadLegacyScoutingData } from "../lib/scoutingDataUtils";

interface ScoutingEntry {
  matchNumber: string;                    // index 0
  alliance: string;                       // index 1
  scouterInitials: string;               // index 2
  selectTeam: string;                    // index 3
  // Starting positions (indices 4-9)
  startPoses0: boolean;                  // index 4
  startPoses1: boolean;                  // index 5
  startPoses2: boolean;                  // index 6
  startPoses3: boolean;                  // index 7
  startPoses4: boolean;                  // index 8
  startPoses5: boolean;                  // index 9
  // Auto coral placement (indices 10-14)
  autoCoralPlaceL1Count: number;         // index 10
  autoCoralPlaceL2Count: number;         // index 11
  autoCoralPlaceL3Count: number;         // index 12
  autoCoralPlaceL4Count: number;         // index 13
  autoCoralPlaceDropMissCount: number;   // index 14
  // Auto coral pickup (indices 15-19)
  autoCoralPickPreloadCount: number;     // index 15
  autoCoralPickStationCount: number;     // index 16
  autoCoralPickMark1Count: number;       // index 17
  autoCoralPickMark2Count: number;       // index 18
  autoCoralPickMark3Count: number;       // index 19
  // Auto algae (indices 20-24)
  autoAlgaePlaceNetShot: number;         // index 20
  autoAlgaePlaceProcessor: number;       // index 21
  autoAlgaePlaceDropMiss: number;        // index 22
  autoAlgaePlaceRemove: number;          // index 23
  // Auto algae pickup (indices 24-27)
  autoAlgaePickReefCount: number;        // index 24
  autoAlgaePickMark1Count: number;       // index 25
  autoAlgaePickMark2Count: number;       // index 26
  autoAlgaePickMark3Count: number;       // index 27
  // Auto mobility (index 28)
  autoPassedStartLine: boolean;          // index 28
  // Teleop coral (indices 29-34)
  teleopCoralPlaceL1Count: number;       // index 29
  teleopCoralPlaceL2Count: number;       // index 30
  teleopCoralPlaceL3Count: number;       // index 31
  teleopCoralPlaceL4Count: number;       // index 32
  teleopCoralPlaceDropMissCount: number; // index 33
  teleopCoralPickStationCount: number;   // index 34
  teleopCoralPickCarpetCount: number;    // index 35
  // Teleop algae (indices 36-41)
  teleopAlgaePlaceNetShot: number;       // index 36
  teleopAlgaePlaceProcessor: number;     // index 37
  teleopAlgaePlaceDropMiss: number;      // index 38
  teleopAlgaePlaceRemove: number;        // index 39
  teleopAlgaePickReefCount: number;      // index 40
  teleopAlgaePickCarpetCount: number;    // index 41
  // Endgame (indices 42-46)
  shallowClimbAttempted: boolean;        // index 42
  deepClimbAttempted: boolean;           // index 43
  parkAttempted: boolean;                // index 44
  climbFailed: boolean;                  // index 45
  // Other actions (indices 46-48)
  playedDefense: boolean;                // index 46
  brokeDown: boolean;                    // index 47
  // Comments (index 48)
  comment: string;                       // index 48
}

const MatchStrategyPage = () => {
  const [scoutingData, setScoutingData] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(Array(6).fill(""));
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("autonomous");
  const [matchNumber, setMatchNumber] = useState<string>("");
  const [activeStatsTab, setActiveStatsTab] = useState("overall");
  const isMobile = useIsMobile();

  useEffect(() => {
    // Load scouting data using the new deduplication utilities
    try {
      const data = loadLegacyScoutingData();
      setScoutingData(data);
      
      // Get unique team numbers (team number is now at index 4 due to ID at index 0)
      const teams = [...new Set(data.map((entry: any[]) => entry[4]?.toString()).filter(Boolean))];
      teams.sort((a, b) => Number(a) - Number(b));
      setAvailableTeams(teams as string[]);
    } catch (error) {
      console.error("Error loading scouting data:", error);
    }
  }, []);

  const parseScoutingEntry = (dataArray: any[]): ScoutingEntry => {
    // Account for ID at index 0, so actual data starts at index 1
    return {
      matchNumber: dataArray[1]?.toString() || "",     // was 0, now 1
      alliance: dataArray[2] || "",                    // was 1, now 2
      scouterInitials: dataArray[3] || "",             // was 2, now 3
      selectTeam: dataArray[4]?.toString() || "",      // was 3, now 4
      startPoses0: dataArray[5] || false,              // was 4, now 5
      startPoses1: dataArray[6] || false,              // was 5, now 6
      startPoses2: dataArray[7] || false,              // was 6, now 7
      startPoses3: dataArray[8] || false,              // was 7, now 8
      startPoses4: dataArray[9] || false,              // was 8, now 9
      startPoses5: dataArray[10] || false,             // was 9, now 10
      autoCoralPlaceL1Count: dataArray[11] || 0,       // was 10, now 11
      autoCoralPlaceL2Count: dataArray[12] || 0,       // was 11, now 12
      autoCoralPlaceL3Count: dataArray[13] || 0,       // was 12, now 13
      autoCoralPlaceL4Count: dataArray[14] || 0,       // was 13, now 14
      autoCoralPlaceDropMissCount: dataArray[15] || 0, // was 14, now 15
      autoCoralPickPreloadCount: dataArray[16] || 0,   // was 15, now 16
      autoCoralPickStationCount: dataArray[17] || 0,   // was 16, now 17
      autoCoralPickMark1Count: dataArray[18] || 0,     // was 17, now 18
      autoCoralPickMark2Count: dataArray[19] || 0,     // was 18, now 19
      autoCoralPickMark3Count: dataArray[20] || 0,     // was 19, now 20
      autoAlgaePlaceNetShot: dataArray[21] || 0,       // was 20, now 21
      autoAlgaePlaceProcessor: dataArray[22] || 0,     // was 21, now 22
      autoAlgaePlaceDropMiss: dataArray[23] || 0,      // was 22, now 23
      autoAlgaePlaceRemove: dataArray[24] || 0,           // was 23, now 24
      autoAlgaePickReefCount: dataArray[25] || 0,         // was 24, now 25
      autoAlgaePickMark1Count: dataArray[26] || 0,        // was 25, now 26
      autoAlgaePickMark2Count: dataArray[27] || 0,        // was 26, now 27
      autoAlgaePickMark3Count: dataArray[28] || 0,        // was 27, now 28
      autoPassedStartLine: dataArray[29] || false,        // was 28, now 29
      teleopCoralPlaceL1Count: dataArray[30] || 0,        // was 29, now 30
      teleopCoralPlaceL2Count: dataArray[31] || 0,        // was 30, now 31
      teleopCoralPlaceL3Count: dataArray[32] || 0,        // was 31, now 32
      teleopCoralPlaceL4Count: dataArray[33] || 0,        // was 32, now 33
      teleopCoralPlaceDropMissCount: dataArray[34] || 0,  // was 33, now 34
      teleopCoralPickStationCount: dataArray[35] || 0,    // was 34, now 35
      teleopCoralPickCarpetCount: dataArray[36] || 0,     // was 35, now 36
      teleopAlgaePlaceNetShot: dataArray[37] || 0,        // was 36, now 37
      teleopAlgaePlaceProcessor: dataArray[38] || 0,      // was 37, now 38
      teleopAlgaePlaceDropMiss: dataArray[39] || 0,       // was 38, now 39
      teleopAlgaePlaceRemove: dataArray[40] || 0,         // was 39, now 40
      teleopAlgaePickReefCount: dataArray[41] || 0,       // was 40, now 41
      teleopAlgaePickCarpetCount: dataArray[42] || 0,     // was 41, now 42
      shallowClimbAttempted: dataArray[43] || false,      // was 42, now 43
      deepClimbAttempted: dataArray[44] || false,         // was 43, now 44
      parkAttempted: dataArray[45] || false,              // was 44, now 45
      climbFailed: dataArray[46] || false,                // was 45, now 46
      playedDefense: dataArray[47] || false,              // was 46, now 47
      brokeDown: dataArray[48] || false,                  // was 47, now 48
      comment: dataArray[49] || ""                        // was 48, now 49
    };
  };

  const getTeamStats = (teamNumber: string) => {
    if (!teamNumber) return null;

    const teamDataArrays = scoutingData.filter(dataArray => dataArray[4]?.toString() === teamNumber); // was index 3, now 4
    
    if (teamDataArrays.length === 0) {
      return {
        matchesPlayed: 0,
        overall: {
          totalPiecesScored: 0,
          avgTotalPoints: 0,
          avgCoral: 0,
          avgAlgae: 0
        },
        auto: {
          mobilityRate: 0,
          avgCoral: 0,
          avgAlgae: 0,
          startingPositions: [],
          avgTotalPoints: 0
        },
        teleop: {
          avgCoral: 0,
          avgAlgae: 0,
          avgTotalPoints: 0
        },
        endgame: {
          climbRate: 0,
          parkRate: 0,
          shallowClimbRate: 0,
          deepClimbRate: 0,
          avgTotalPoints: 0
        }
      };
    }

    const teamEntries = teamDataArrays.map(parseScoutingEntry);
    const matchCount = teamEntries.length;

    // Calculate overall stats
    const totalPiecesScored = teamEntries.reduce((sum, entry) => {
      const autoCoralScored = entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
                           entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count;
      const teleopCoralScored = entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
                             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
      const autoAlgaeScored = entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor;
      const teleopAlgaeScored = entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
      
      return sum + autoCoralScored + teleopCoralScored + autoAlgaeScored + teleopAlgaeScored;
    }, 0);

    const totalCoral = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
             entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count +
             entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
    }, 0);

    const totalAlgae = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor +
             entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
    }, 0);

    const autoPoints = teamEntries.reduce((sum, entry) => {
      // Auto points
      const autoCoralPoints = (entry.autoCoralPlaceL1Count * 3) + (entry.autoCoralPlaceL2Count * 4) + 
                           (entry.autoCoralPlaceL3Count * 6) + (entry.autoCoralPlaceL4Count * 7);
      const autoAlgaePoints = (entry.autoAlgaePlaceNetShot * 4) + (entry.autoAlgaePlaceProcessor * 2);
      const autoMobilityPoints = entry.autoPassedStartLine ? 3 : 0;

      return sum + autoCoralPoints + autoAlgaePoints + autoMobilityPoints;
    }, 0);

    const teleopPoints = teamEntries.reduce((sum, entry) => {
      // Teleop points
      const teleopCoralPoints = (entry.teleopCoralPlaceL1Count * 2) + (entry.teleopCoralPlaceL2Count * 3) + 
                             (entry.teleopCoralPlaceL3Count * 4) + (entry.teleopCoralPlaceL4Count * 5);
      const teleopAlgaePoints = (entry.teleopAlgaePlaceNetShot * 4) + (entry.teleopAlgaePlaceProcessor * 2);

      return sum + teleopCoralPoints + teleopAlgaePoints;
    }, 0);

    const endgamePoints = teamEntries.reduce((sum, entry) => {
      // Endgame points
      let points = 0;
      if ((entry.parkAttempted && !entry.climbFailed) || (entry.shallowClimbAttempted && entry.climbFailed) || (entry.deepClimbAttempted && entry.climbFailed)) points += 2;
      if (entry.shallowClimbAttempted && !entry.climbFailed) points += 6;
      if (entry.deepClimbAttempted && !entry.climbFailed) points += 12;

      return sum + points;
    }, 0);

    // Calculate average total points
    const totalPoints = autoPoints + teleopPoints + endgamePoints;

    // Calculate auto stats
    const mobilityCount = teamEntries.filter(entry => entry.autoPassedStartLine).length;
    const autoCoralTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
             entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count;
    }, 0);
    const autoAlgaeTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor;
    }, 0);

    // Calculate starting positions
    const startingPositions = [];
    const positions = ['Pos 0', 'Pos 1', 'Pos 2', 'Pos 3', 'Pos 4', 'Pos 5'];
    const positionCounts = [
      teamEntries.filter(entry => entry.startPoses0).length,
      teamEntries.filter(entry => entry.startPoses1).length,
      teamEntries.filter(entry => entry.startPoses2).length,
      teamEntries.filter(entry => entry.startPoses3).length,
      teamEntries.filter(entry => entry.startPoses4).length,
      teamEntries.filter(entry => entry.startPoses5).length
    ];

    for (let i = 0; i < positions.length; i++) {
      const percentage = Math.round((positionCounts[i] / matchCount) * 100);
      if (percentage > 0) {
        startingPositions.push({ position: positions[i], percentage });
      }
    }

    // Calculate teleop stats
    const teleopCoralTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
    }, 0);
    const teleopAlgaeTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
    }, 0);

    // Calculate endgame stats
    const successfulClimbs = teamEntries.filter(entry => 
      (entry.shallowClimbAttempted || entry.deepClimbAttempted) && !entry.climbFailed
    ).length;
    const parkCount = teamEntries.filter(entry => entry.parkAttempted && !entry.climbFailed).length;
    const shallowClimbCount = teamEntries.filter(entry => entry.shallowClimbAttempted && !entry.climbFailed).length;
    const deepClimbCount = teamEntries.filter(entry => entry.deepClimbAttempted && !entry.climbFailed).length;

    return {
      matchesPlayed: matchCount,
      overall: {
        totalPiecesScored: Math.round((totalPiecesScored / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((totalPoints / matchCount) * 10) / 10,
        avgCoral: Math.round((totalCoral / matchCount) * 10) / 10,
        avgAlgae: Math.round((totalAlgae / matchCount) * 10) / 10
      },
      auto: {
        mobilityRate: Math.round((mobilityCount / matchCount) * 100),
        avgCoral: Math.round((autoCoralTotal / matchCount) * 10) / 10,
        avgAlgae: Math.round((autoAlgaeTotal / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((autoPoints / matchCount) * 10) / 10,
        startingPositions
      },
      teleop: {
        avgCoral: Math.round((teleopCoralTotal / matchCount) * 10) / 10,
        avgAlgae: Math.round((teleopAlgaeTotal / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((teleopPoints / matchCount) * 10) / 10
      },
      endgame: {
        climbRate: Math.round((successfulClimbs / matchCount) * 100),
        parkRate: Math.round((parkCount / matchCount) * 100),
        shallowClimbRate: Math.round((shallowClimbCount / matchCount) * 100),
        deepClimbRate: Math.round((deepClimbCount / matchCount) * 100),
        avgTotalPoints: Math.round((endgamePoints / matchCount) * 10) / 10
      }
    };
  };

  const handleTeamChange = (index: number, teamNumber: string) => {
    const newSelectedTeams = [...selectedTeams];
    newSelectedTeams[index] = teamNumber === "none" ? "" : teamNumber;
    setSelectedTeams(newSelectedTeams);
  };

  // Touch handlers for alliance card swipe functionality
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleAllianceCardTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleAllianceCardTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Import haptics dynamically
      import('@/lib/haptics').then(({ haptics }) => {
        haptics.light();
      });
      
      const tabValues = ['overall', 'auto', 'teleop', 'endgame'];
      const currentIndex = tabValues.indexOf(activeStatsTab);
      
      if (currentIndex !== -1) {
        let newIndex;
        if (deltaX > 0) {
          // Swipe right - go to previous tab
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabValues.length - 1;
        } else {
          // Swipe left - go to next tab
          newIndex = currentIndex < tabValues.length - 1 ? currentIndex + 1 : 0;
        }
        
        const newValue = tabValues[newIndex];
        console.log(`Alliance card swipe: ${activeStatsTab} → ${newValue}`);
        setActiveStatsTab(newValue);
      }
    }
    
    touchStartRef.current = null;
  };

  // Responsive Team Selector Component
  const TeamSelector = ({ 
    label, 
    value, 
    onValueChange 
  }: {
    index: number;
    label: string;
    labelColor: string;
    value: string;
    onValueChange: (value: string) => void;
  }) => {
    if (isMobile) {
      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1 justify-between h-10"
            >
              <span className="truncate">
                {value ? `Team ${value}` : "Select team"}
              </span>
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh] pb-8">
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-2">
                <SheetClose asChild>
                  <Button 
                    variant={!value ? "default" : "outline"}
                    className="w-full justify-start h-12 px-4"
                    onClick={() => onValueChange("none")}
                  >
                    No team
                  </Button>
                </SheetClose>
                {availableTeams.map((teamNum) => (
                  <SheetClose key={teamNum} asChild>
                    <Button 
                      variant={value === teamNum ? "default" : "outline"}
                      className="w-full justify-start h-12 px-4"
                      onClick={() => onValueChange(teamNum)}
                    >
                      Team {teamNum}
                    </Button>
                  </SheetClose>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    // Desktop version - keep existing Select
    return (
      <Select 
        value={value || "none"} 
        onValueChange={onValueChange}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No team</SelectItem>
          {availableTeams.map((teamNum) => (
            <SelectItem key={teamNum} value={teamNum}>
              Team {teamNum}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const TeamStatsHeaders = ({ alliance, activeStatsTab }: {
    alliance: 'red' | 'blue',
    activeStatsTab: string
  }) => {
    // Get the correct team slice based on alliance
    const teamSlice = alliance === 'red' ? selectedTeams.slice(0, 3) : selectedTeams.slice(3, 6);
    
    const renderStatsHeader = () => {
      switch (activeStatsTab) {
        case "overall":
          return(
            <div className="text-right text-sm h-12 flex flex-col justify-center">
              <div className="font-bold text-lg">
                {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.overall.avgTotalPoints || 0);
                }, 0))} pts
              </div>
              <div className="text-xs text-muted-foreground">
                {teamSlice.filter(team => {
                  const stats = getTeamStats(team);
                  return stats && stats.endgame.climbRate > 50;
                }).length}/3 climbers
              </div>
            </div>
          );
        case "auto":
          return (
            <div className="text-right text-sm h-12 flex flex-col justify-center">
              <div className="font-bold text-lg">
                {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.auto.avgTotalPoints || 0);
                }, 0))} pts
              </div>
              <div className="text-xs text-muted-foreground">
                {teamSlice.filter(team => {
                  const stats = getTeamStats(team);
                  return stats && stats.auto.mobilityRate > 50;
                }).length}/3 mobile
              </div>
            </div>
          );
        case "teleop":
          return (
            <div className="text-right text-sm h-12 flex flex-col justify-center">
              <div className="font-bold text-lg">
                {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.teleop.avgTotalPoints || 0);
                }, 0))} pts
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.teleop.avgCoral || 0);
                }, 0) * 10) / 10} coral | {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.teleop.avgAlgae || 0);
                }, 0) * 10) / 10} algae
              </div>
            </div>
          );
        case "endgame":
          return (
            <div className="text-right text-sm h-12 flex flex-col justify-center">
              <div className="font-bold text-lg">
                {Math.round(teamSlice.reduce((sum, team) => {
                  const stats = getTeamStats(team);
                  return sum + (stats?.endgame.avgTotalPoints || 0);
                }, 0))} pts
              </div>
               <div className="text-xs text-muted-foreground">
                {teamSlice.filter(team => {
                  const stats = getTeamStats(team);
                  return stats && stats.endgame.climbRate > 50;
                }).length}/3 climbers
              </div>
            </div>
          );
      }
    }

    return (
      <>
        {renderStatsHeader()}
      </>
    );
  };

  // Helper component to render team stats for the active phase
  const TeamStatsDetail = ({ stats, activeStatsTab }: { 
    stats: any, 
    activeStatsTab: string
  }) => {
    if (!stats) return null;

    const renderStatsContent = () => {
      switch (activeStatsTab) {
        case "overall":
          return (
            <div className="h-24 flex items-center">
              <div className="grid grid-cols-3 gap-2 text-sm w-full">
                <div className="text-center">
                  <p className="font-medium text-xs">Coral</p>
                  <p className="text-lg font-bold text-orange-600">{stats.overall.avgCoral}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Algae</p>
                  <p className="text-lg font-bold text-green-600">{stats.overall.avgAlgae}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Avg Points</p>
                  <p className="text-lg font-bold text-blue-600">{stats.overall.avgTotalPoints}</p>
                </div>
              </div>
            </div>
          );

        case "auto":
          return (
            <div className="h-24 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div className="text-center">
                  <p className="font-medium text-xs">Mobility</p>
                  <p className="text-lg font-bold text-blue-600">{stats.auto.mobilityRate}%</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Coral</p>
                  <p className="text-lg font-bold text-orange-600">{stats.auto.avgCoral}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Algae</p>
                  <p className="text-lg font-bold text-green-600">{stats.auto.avgAlgae}</p>
                </div>
              </div>
              {stats.auto.startingPositions.length > 0 && (
                <div className="flex flex-col items-center">
                  <p className="font-medium text-xs mb-1">Starting Positions:</p>
                  <div className="flex flex-wrap gap-1 justify-center max-h-8 overflow-hidden">
                    {stats.auto.startingPositions.slice(0, 4).map((pos: { position: string, percentage: number }, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {pos.position}: {pos.percentage}%
                      </Badge>
                    ))}
                    {stats.auto.startingPositions.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{stats.auto.startingPositions.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );

        case "teleop":
          return (
            <div className="h-24 flex items-center">
              <div className="grid grid-cols-2 gap-2 text-sm w-full">
                <div className="text-center">
                  <p className="font-medium text-xs">Coral</p>
                  <p className="text-lg font-bold text-orange-600">{stats.teleop.avgCoral}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Algae</p>
                  <p className="text-lg font-bold text-green-600">{stats.teleop.avgAlgae}</p>
                </div>
              </div>
            </div>
          );

        case "endgame":
          return (
            <div className="h-24 flex items-center">
              <div className="grid grid-cols-2 gap-2 text-sm w-full">
                <div className="text-center">
                  <p className="font-medium text-xs">Overall Climb</p>
                  <p className="text-lg font-bold text-purple-600">{stats.endgame.climbRate}%</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Park</p>
                  <p className="text-sm font-bold text-gray-600">{stats.endgame.parkRate}%</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Shallow</p>
                  <p className="text-sm font-bold text-blue-600">{stats.endgame.shallowClimbRate}%</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">Deep</p>
                  <p className="text-sm font-bold text-red-600">{stats.endgame.deepClimbRate}%</p>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        {renderStatsContent()}
        <div className="text-center text-xs text-muted-foreground mt-2">
          {stats.matchesPlayed} matches played
        </div>
      </div>
    );
  };

  const clearAllStrategies = () => {
    // Clear all localStorage data for the three stages
    localStorage.removeItem('fieldStrategy_autonomous');
    localStorage.removeItem('fieldStrategy_teleop');
    localStorage.removeItem('fieldStrategy_endgame');
    
    // Force refresh of all canvases by changing the activeTab and back
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => {
      setActiveTab(currentTab);
    }, 50);
    
    console.log('All strategy canvases cleared');
  };

  const saveAllStrategyCanvases = () => {
    // Add a small delay to ensure all canvases are rendered
    setTimeout(() => {
      // Try to get from localStorage first since it's more reliable
      const autonomousData = localStorage.getItem('fieldStrategy_autonomous');
      const teleopData = localStorage.getItem('fieldStrategy_teleop');
      const endgameData = localStorage.getItem('fieldStrategy_endgame');

      if (!autonomousData || !teleopData || !endgameData) {
        alert('Please draw on all three strategy tabs (Autonomous, Teleop, and Endgame) before saving');
        return;
      }

      // Create a new canvas to composite all three images
      const compositeCanvas = document.createElement('canvas');
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) return;

      // Load all three images
      const autonomousImg = new Image();
      const teleopImg = new Image();
      const endgameImg = new Image();

      let loadedCount = 0;
      const totalImages = 3;

      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          // All images loaded, now composite them
          const imgWidth = autonomousImg.width;
          const imgHeight = autonomousImg.height;
          
          // Set composite canvas size (3x height for stacking + extra space for match number)
          const topMargin = matchNumber ? 60 : 40; // Extra space if match number exists
          compositeCanvas.width = imgWidth;
          compositeCanvas.height = imgHeight * 3 + topMargin;

          // Clear canvas with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

          // Add match number at the very top if provided
          if (matchNumber) {
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`Match ${matchNumber}`, imgWidth / 2, 30);
          }

          // Draw title labels for each section
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';

          // Draw Autonomous section
          ctx.fillText('AUTONOMOUS', imgWidth / 2, topMargin + 30);
          ctx.drawImage(autonomousImg, 0, topMargin + 40, imgWidth, imgHeight - 40);

          // Draw Teleop section
          ctx.fillText('TELEOP', imgWidth / 2, topMargin + imgHeight + 30);
          ctx.drawImage(teleopImg, 0, topMargin + imgHeight + 40, imgWidth, imgHeight - 40);

          // Draw Endgame section
          ctx.fillText('ENDGAME', imgWidth / 2, topMargin + (imgHeight * 2) + 30);
          ctx.drawImage(endgameImg, 0, topMargin + (imgHeight * 2) + 40, imgWidth, imgHeight - 40);

          // Add team information at the top - corrected positioning and alliance sides
          ctx.font = 'bold 16px Arial';
          const blueTeams = selectedTeams.slice(3, 6).filter(Boolean); // Blue teams (originally index 3-5)
          const redTeams = selectedTeams.slice(0, 3).filter(Boolean);  // Red teams (originally index 0-2)
          
          if (blueTeams.length > 0 || redTeams.length > 0) {
            const teamInfoY = matchNumber ? 50 : 20; // Position below match number if it exists
            
            // Blue alliance on left side
            ctx.fillStyle = '#0000ff';
            ctx.textAlign = 'left';
            ctx.fillText(`Blue: ${blueTeams.join(', ')}`, 10, teamInfoY);
            
            // Red alliance on right side
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'right';
            ctx.fillText(`Red: ${redTeams.join(', ')}`, imgWidth - 10, teamInfoY);
          }

          // Download the composite image
          const dataURL = compositeCanvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataURL;
          const filename = matchNumber 
            ? `match-${matchNumber}-strategy-${new Date().toISOString().slice(0, 10)}.png`
            : `match-strategy-complete-${new Date().toISOString().slice(0, 10)}.png`;
          link.download = filename;
          link.click();

          console.log('Composite strategy image saved successfully');
        }
      };

      // Set up image load handlers
      autonomousImg.onload = onImageLoad;
      teleopImg.onload = onImageLoad;
      endgameImg.onload = onImageLoad;

      // Load the images
      autonomousImg.src = autonomousData;
      teleopImg.src = teleopData;
      endgameImg.src = endgameData;

    }, 100); // Small delay to ensure DOM is ready
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 pt-6 pb-6">
      <div className="flex flex-col items-center gap-4 max-w-7xl w-full">
        {/* Header section - should scroll naturally */}
        <div className="flex md:justify-between w-full flex-wrap md:flex-nowrap gap-2 pt-4">
          <div className="flex items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
            <label htmlFor="match-number" className="font-semibold whitespace-nowrap">
              Match #:
            </label>
            <Input
              id="match-number"
              type="text"
              placeholder="Optional"
              value={matchNumber}
              onChange={(e) => setMatchNumber(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="flex items-center md:justify-end w-full md:w-auto gap-2">
            <Button onClick={clearAllStrategies} variant="outline" className="flex-1 md:flex-none px-3 py-2">
              Clear All
            </Button>
            <Button onClick={saveAllStrategyCanvases} variant="outline" className="flex-1 md:flex-none px-3 py-2">
              Save All
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-col gap-8 w-full pb-6">
          {/* Field Strategy Tabs */}
          <Card className="w-full">
            <CardContent className="h-[500px] p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col" enableSwipe={true}>
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="autonomous">Autonomous</TabsTrigger>
                  <TabsTrigger value="teleop">Teleop</TabsTrigger>
                  <TabsTrigger value="endgame">Endgame</TabsTrigger>
                </TabsList>
                
                {/* Canvas container */}
                <div className="flex-1 mt-0">
                  <TabsContent value="autonomous" className="h-full mt-0" data-stage="autonomous">
                    <FieldCanvas 
                      key="autonomous" 
                      stageId="autonomous" 
                      onStageChange={(newStageId) => setActiveTab(newStageId)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="teleop" className="h-full mt-0" data-stage="teleop">
                    <FieldCanvas 
                      key="teleop" 
                      stageId="teleop" 
                      onStageChange={(newStageId) => setActiveTab(newStageId)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="endgame" className="h-full mt-0" data-stage="endgame">
                    <FieldCanvas 
                      key="endgame" 
                      stageId="endgame" 
                      onStageChange={(newStageId) => setActiveTab(newStageId)}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Team Analysis Card - Combined Layout */}
          <Card className="w-full">
            <CardHeader>
              {/* Team Stats Tabs */}
              <Tabs value={activeStatsTab} onValueChange={setActiveStatsTab} className="w-full" enableSwipe={true}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overall">Overall</TabsTrigger>
                  <TabsTrigger value="auto">Auto</TabsTrigger>
                  <TabsTrigger value="teleop">Teleop</TabsTrigger>
                  <TabsTrigger value="endgame">Endgame</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent>
              {/* Alliance Split Layout */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Blue Alliance */}
                <div className="flex-1" onTouchStart={handleAllianceCardTouchStart} onTouchEnd={handleAllianceCardTouchEnd}>
                  <div className="border rounded-lg border-blue-200 dark:border-blue-800">
                    <div className="p-4 border-b border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Blue Alliance</h3>
                        <TeamStatsHeaders
                          alliance="blue" 
                          activeStatsTab={activeStatsTab}
                        />
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 3 }, (_, index) => {
                        const team = selectedTeams[index + 3];
                        const stats = getTeamStats(team);

                        return (
                          <Card key={index + 3} className="p-3">
                            <div className="space-y-3">
                              {/* Team Selector */}
                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-blue-600 dark:text-blue-400 min-w-0">
                                  Blue Team {index + 1}:
                                </label>
                                <TeamSelector
                                  index={index + 3}
                                  label={`Blue Team ${index + 1}`}
                                  labelColor="text-blue-600 dark:text-blue-400"
                                  value={selectedTeams[index + 3]}
                                  onValueChange={(value) => handleTeamChange(index + 3, value)}
                                />
                              </div>

                              {/* Team Stats */}
                              {team && stats ? (
                                <TeamStatsDetail 
                                  stats={stats} 
                                  activeStatsTab={activeStatsTab} 
                                />
                              ) : (
                                <div className="text-center py-2 text-muted-foreground text-sm">
                                  {team ? "No data available" : "No team selected"}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Separator - Vertical on lg, horizontal on smaller screens */}
                <div className="lg:w-px lg:bg-border lg:mx-0 lg:h-auto h-px bg-border w-full my-0 lg:my-4"></div>
                
                {/* Red Alliance */}
                <div className="flex-1" onTouchStart={handleAllianceCardTouchStart} onTouchEnd={handleAllianceCardTouchEnd}>
                  <div className="border rounded-lg border-red-200 dark:border-red-800">
                    <div className="p-4 border-b border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Red Alliance</h3>
                        <TeamStatsHeaders
                          alliance="red" 
                          activeStatsTab={activeStatsTab}
                        />
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 3 }, (_, index) => {
                        const team = selectedTeams[index];
                        const stats = getTeamStats(team);

                        return (
                          <Card key={index} className="p-3">
                            <div className="space-y-3">
                              {/* Team Selector */}
                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-red-600 dark:text-red-400 min-w-0">
                                  Red Team {index + 1}:
                                </label>
                                <TeamSelector
                                  index={index}
                                  label={`Red Team ${index + 1}`}
                                  labelColor="text-red-600 dark:text-red-400"
                                  value={selectedTeams[index]}
                                  onValueChange={(value) => handleTeamChange(index, value)}
                                />
                              </div>

                              {/* Team Stats */}
                              {team && stats ? (
                                <TeamStatsDetail 
                                  stats={stats} 
                                  activeStatsTab={activeStatsTab} 
                                />
                              ) : (
                                <div className="text-center py-2 text-muted-foreground text-sm">
                                  {team ? "No data available" : "No team selected"}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchStrategyPage;