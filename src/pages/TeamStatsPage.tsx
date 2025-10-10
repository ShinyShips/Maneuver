/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/radix/tabs";
import AutoStartPositionMap from "@/components/TeamStatsComponents/AutoStartPositionMap";
import { loadLegacyScoutingData } from "../lib/scoutingDataUtils";
import { calculateTeamStats } from "../lib/teamStatsUtils";
import type { TeamStats as TeamStatsType } from "../lib/teamStatsTypes";
import { TeamStatsHeader } from "../components/TeamStatsComponents/TeamStatsHeader";
import { StatCard } from "../components/TeamStatsComponents/StatCard";
import { ProgressCard } from "../components/TeamStatsComponents/ProgressCard";
import { PitScoutingData } from "../components/TeamStatsComponents/PitScoutingData";
import { DataAttribution } from "@/components/DataAttribution";
import { MatchStatsButton } from "@/components/ui/match-stats-button";
import { analytics } from '@/lib/analytics';
import { getAllStoredEventTeams, getStoredEventTeams } from '@/lib/tbaUtils';
import { getStoredNexusTeams } from '@/lib/nexusUtils';
import { getPitScoutingStats } from '@/lib/dexieDB';
import LogoNotFound from "../assets/Logo Not Found.png";

const TeamStatsPage = () => {
  const [scoutingData, setScoutingData] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [compareTeam, setCompareTeam] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStatsType | null>(null);
  const [compareStats, setCompareStats] = useState<TeamStatsType | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Helper function to create default team stats when no match data exists
  const createDefaultTeamStats = (): TeamStatsType => {
    return {
      matchesPlayed: 0,
      avgAutoCoralL1: 0,
      avgAutoCoralL2: 0,
      avgAutoCoralL3: 0,
      avgAutoCoralL4: 0,
      avgTeleopCoralL1: 0,
      avgTeleopCoralL2: 0,
      avgTeleopCoralL3: 0,
      avgTeleopCoralL4: 0,
      avgAutoAlgaeNet: 0,
      avgAutoAlgaeProcessor: 0,
      avgTeleopAlgaeNet: 0,
      avgTeleopAlgaeProcessor: 0,
      avgTotalPoints: 0,
      avgAutoPoints: 0,
      avgTeleopPoints: 0,
      avgEndgamePoints: 0,
      mobilityRate: 0,
      climbRate: 0,
      defenseRate: 0,
      breakdownRate: 0,
      shallowClimbRate: 0,
      deepClimbRate: 0,
      parkRate: 0,
      climbFailRate: 0,
      startPositions: {
        position0: 0,
        position1: 0,
        position2: 0,
        position3: 0,
        position4: 0,
        position5: 0,
      },
      matchResults: [],
    };
  };

  useEffect(() => {
    // Load scouting data using the new deduplication utilities
    const loadData = async () => {
      try {
        const data = await loadLegacyScoutingData();
        setScoutingData(data);
        
        // Get unique event names from scouting data
        const scoutingEvents = [...new Set(data.map((entry: Record<string, unknown>) => entry.eventName?.toString()).filter(Boolean))];
        
        // Get events from TBA stored data
        const tbaEvents = Object.keys(getAllStoredEventTeams());
        
        // Get events from Nexus stored data (iterate through localStorage for nexus_event_teams_*)
        const nexusEvents: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('nexus_event_teams_')) {
            const eventKey = key.replace('nexus_event_teams_', '');
            nexusEvents.push(eventKey);
          }
        }
        
        // Combine all events and remove duplicates
        const allEvents = [...new Set([...scoutingEvents, ...tbaEvents, ...nexusEvents])];
        allEvents.sort();
        setAvailableEvents(allEvents as string[]);
        
        // Track team stats page usage
        analytics.trackPageNavigation('team_stats');
      } catch (error) {
        console.error("Error loading scouting data:", error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Update available teams based on selected event
    const loadTeams = async () => {
      let scoutingTeams: string[] = [];
      const eventTeams: string[] = [];
      let pitScoutingTeams: string[] = [];
      
      // Get teams from scouting data
      let filteredData = scoutingData;
      if (selectedEvent && selectedEvent !== "all") {
        filteredData = scoutingData.filter((entry: Record<string, unknown>) => entry.eventName?.toString() === selectedEvent);
      }
      scoutingTeams = [...new Set(filteredData.map((entry: Record<string, unknown>) => entry.selectTeam?.toString()).filter(Boolean))] as string[];
      
      // Get teams from pit scouting data
      try {
        const pitStats = await getPitScoutingStats();
        if (selectedEvent === "all") {
          pitScoutingTeams = pitStats.teams;
        } else if (selectedEvent) {
          // Filter pit scouting teams by event
          const { loadPitScoutingByEvent } = await import('@/lib/dexieDB');
          const pitEntries = await loadPitScoutingByEvent(selectedEvent);
          pitScoutingTeams = [...new Set(pitEntries.map(entry => entry.teamNumber))];
        }
      } catch (error) {
        console.warn('Error loading pit scouting teams:', error);
      }
      
      // Get teams from event team lists (TBA and Nexus)
      if (selectedEvent && selectedEvent !== "all") {
        // Try to get teams from TBA data
        const tbaTeams = getStoredEventTeams(selectedEvent);
        if (tbaTeams) {
          eventTeams.push(...tbaTeams.map(team => team.toString()));
        }
        
        // Try to get teams from Nexus data
        const nexusTeams = getStoredNexusTeams(selectedEvent);
        if (nexusTeams) {
          eventTeams.push(...nexusTeams);
        }
      }
      
      // Combine all teams and remove duplicates
      const allTeams = [...new Set([...scoutingTeams, ...pitScoutingTeams, ...eventTeams])];
      allTeams.sort((a, b) => Number(a) - Number(b));
      setAvailableTeams(allTeams);
      
      // Reset team selections if current selections are no longer available
      if (selectedTeam && !allTeams.includes(selectedTeam)) {
        setSelectedTeam("");
      }
      if (compareTeam && compareTeam !== "none" && !allTeams.includes(compareTeam)) {
        setCompareTeam("none");
      }
    };
    
    loadTeams();
  }, [scoutingData, selectedEvent, selectedTeam, compareTeam]);

  const calculateTeamStatsCallback = useCallback((teamNumber: string) => {
    return calculateTeamStats(teamNumber, scoutingData, selectedEvent);
  }, [scoutingData, selectedEvent]);

  useEffect(() => {
    if (selectedTeam) {
      const stats = calculateTeamStatsCallback(selectedTeam);
      // If no match scouting data exists, create default stats so user can still access pit data
      setTeamStats(stats || createDefaultTeamStats());
    } else {
      setTeamStats(null);
    }
  }, [selectedTeam, scoutingData, calculateTeamStatsCallback]);

  useEffect(() => {
    if (compareTeam && compareTeam !== "none") {
      const stats = calculateTeamStatsCallback(compareTeam);
      // If no match scouting data exists, create default stats for comparison
      setCompareStats(stats || createDefaultTeamStats());
    } else {
      setCompareStats(null);
    }
  }, [compareTeam, scoutingData, calculateTeamStatsCallback]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 pt-4 pb-6">
      <div className="w-full max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Team Statistics</h1>
          <div className="hidden md:block">
            <DataAttribution sources={['tba']} variant="compact" />
          </div>
        </div>
        <div className="md:hidden mb-4">
          <DataAttribution sources={['tba']} variant="compact" />
        </div>
        <div className="flex flex-col gap-6 w-full">
        
        {/* Header */}
        <TeamStatsHeader
          selectedTeam={selectedTeam}
          compareTeam={compareTeam}
          selectedEvent={selectedEvent}
          availableTeams={availableTeams}
          availableEvents={availableEvents}
          onSelectedTeamChange={setSelectedTeam}
          onCompareTeamChange={setCompareTeam}
          onSelectedEventChange={setSelectedEvent}
        />

        {/* Content */}
        {selectedTeam && teamStats ? (
          <div className="w-full space-y-6">
            
            {/* Team Header */}
            <Card className="w-full">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <CardTitle className="text-2xl">Team {selectedTeam}</CardTitle>
                    {compareTeam && compareTeam !== "none" && compareStats && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-muted-foreground">vs</span>
                        <CardTitle className="text-2xl text-purple-600">Team {compareTeam}</CardTitle>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {teamStats.matchesPlayed > 0 ? `${teamStats.matchesPlayed} matches` : 'No match data'}
                      </Badge>
                      <Badge variant="default">
                        {teamStats.matchesPlayed > 0 ? `${teamStats.avgTotalPoints} avg pts` : 'Pit data only'}
                      </Badge>
                    </div>
                    {compareTeam && compareTeam !== "none" && compareStats && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {compareStats.matchesPlayed > 0 ? `${compareStats.matchesPlayed} matches` : 'No match data'}
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {compareStats.matchesPlayed > 0 ? `${compareStats.avgTotalPoints} avg pts` : 'Pit data only'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" enableSwipe={true}>
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Over.</span>
                </TabsTrigger>
                <TabsTrigger value="scoring" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Scoring</span>
                  <span className="sm:hidden">Score</span>
                </TabsTrigger>
                <TabsTrigger value="auto" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Auto Start</span>
                  <span className="sm:hidden">Auto</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Performance</span>
                  <span className="sm:hidden">Perf.</span>
                </TabsTrigger>
                <TabsTrigger value="pit" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Pit Data</span>
                  <span className="sm:hidden">Pit</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 pb-6">
                {teamStats.matchesPlayed === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <div className="text-center space-y-3">
                        <h3 className="text-lg font-semibold">No Match Scouting Data</h3>
                        <p className="text-muted-foreground">
                          This team doesn't have any match scouting data for the selected event.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Check the <strong>Pit Data</strong> tab to view pit scouting information for this team.
                        </p>
                        <Button  
                          onClick={() => setActiveTab("pit")}
                          className="mt-4 p-4"
                        >
                          View Pit Data →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {teamStats.matchesPlayed > 0 && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard 
                        title="Total Points" 
                        value={teamStats.avgTotalPoints} 
                        color="green"
                        compareValue={compareStats?.avgTotalPoints}
                      />
                      <StatCard 
                        title="Auto Points" 
                        value={teamStats.avgAutoPoints} 
                        color="blue"
                        compareValue={compareStats?.avgAutoPoints}
                      />
                      <StatCard 
                        title="Teleop Points" 
                        value={teamStats.avgTeleopPoints} 
                        color="purple"
                        compareValue={compareStats?.avgTeleopPoints}
                      />
                      <StatCard 
                        title="Endgame Points" 
                        value={teamStats.avgEndgamePoints} 
                        color="orange"
                        compareValue={compareStats?.avgEndgamePoints}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Key Rates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ProgressCard 
                            title="Mobility Rate" 
                            value={teamStats.mobilityRate}
                            compareValue={compareStats?.mobilityRate}
                          />
                          <ProgressCard 
                            title="Climb Success Rate" 
                            value={teamStats.climbRate}
                            compareValue={compareStats?.climbRate}
                          />
                          <ProgressCard 
                            title="Defense Rate" 
                            value={teamStats.defenseRate}
                            compareValue={compareStats?.defenseRate}
                          />
                          <ProgressCard 
                            title="Breakdown Rate" 
                            value={teamStats.breakdownRate}
                            compareValue={compareStats?.breakdownRate}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Climb Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ProgressCard 
                            title="Shallow Climb Rate" 
                            value={teamStats.shallowClimbRate}
                            compareValue={compareStats?.shallowClimbRate}
                          />
                          <ProgressCard 
                            title="Deep Climb Rate" 
                            value={teamStats.deepClimbRate}
                            compareValue={compareStats?.deepClimbRate}
                          />
                          <ProgressCard 
                            title="Park Rate" 
                            value={teamStats.parkRate}
                            compareValue={compareStats?.parkRate}
                          />
                          <ProgressCard 
                            title="Climb Failure Rate" 
                            value={teamStats.climbFailRate}
                            compareValue={compareStats?.climbFailRate}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Comments Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Match Comments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {teamStats.matchResults
                            .filter(match => match.comment && match.comment.trim() !== "")
                            .map((match, index) => (
                              <div key={index} className="flex flex-col p-3 border rounded gap-2">
                                <div className="flex items-center gap-2">
                                  {match.eventName && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      {match.eventName}
                                    </Badge>
                                  )}
                                  <Badge variant="outline">Match {match.matchNumber}</Badge>
                                  <Badge variant={match.alliance === "red" ? "destructive" : "default"}>
                                    {match.alliance}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground italic">"{match.comment}"</p>
                              </div>
                            ))
                          }
                          {teamStats.matchResults.filter(match => match.comment && match.comment.trim() !== "").length === 0 && (
                            <p className="text-center text-muted-foreground text-sm py-4">
                              No comments recorded for this team's matches
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Scoring Tab */}
              <TabsContent value="scoring" className="space-y-6 pb-6">
                {teamStats.matchesPlayed === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-center space-y-3">
                        <h3 className="text-lg font-semibold">No Match Scoring Data</h3>
                        <p className="text-muted-foreground">
                          This team doesn't have match scouting data to display scoring statistics.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("pit")}
                          className="mt-4"
                        >
                          View Pit Data →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Auto Coral Scoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                          title="Level 1" 
                          value={teamStats.avgAutoCoralL1} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgAutoCoralL1}
                        />
                        <StatCard 
                          title="Level 2" 
                          value={teamStats.avgAutoCoralL2} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgAutoCoralL2}
                        />
                        <StatCard 
                          title="Level 3" 
                          value={teamStats.avgAutoCoralL3} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgAutoCoralL3}
                        />
                        <StatCard 
                          title="Level 4" 
                          value={teamStats.avgAutoCoralL4} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgAutoCoralL4}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Teleop Coral Scoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                          title="Level 1" 
                          value={teamStats.avgTeleopCoralL1} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgTeleopCoralL1}
                        />
                        <StatCard 
                          title="Level 2" 
                          value={teamStats.avgTeleopCoralL2} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgTeleopCoralL2}
                        />
                        <StatCard 
                          title="Level 3" 
                          value={teamStats.avgTeleopCoralL3} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgTeleopCoralL3}
                        />
                        <StatCard 
                          title="Level 4" 
                          value={teamStats.avgTeleopCoralL4} 
                          subtitle="avg per match"
                          compareValue={compareStats?.avgTeleopCoralL4}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Auto Algae Scoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                          title="Net Shots" 
                          value={teamStats.avgAutoAlgaeNet} 
                          subtitle="avg per match" 
                          color="green"
                          compareValue={compareStats?.avgAutoAlgaeNet}
                        />
                        <StatCard 
                          title="Processor" 
                          value={teamStats.avgAutoAlgaeProcessor} 
                          subtitle="avg per match" 
                          color="green"
                          compareValue={compareStats?.avgAutoAlgaeProcessor}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Teleop Algae Scoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                          title="Net Shots" 
                          value={teamStats.avgTeleopAlgaeNet} 
                          subtitle="avg per match" 
                          color="green"
                          compareValue={compareStats?.avgTeleopAlgaeNet}
                        />
                        <StatCard 
                          title="Processor" 
                          value={teamStats.avgTeleopAlgaeProcessor} 
                          subtitle="avg per match" 
                          color="green"
                          compareValue={compareStats?.avgTeleopAlgaeProcessor}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}
              </TabsContent>

              {/* Auto Start Tab */}
              <TabsContent value="auto" className="space-y-6 pb-6">
                {teamStats.matchesPlayed === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-center space-y-3">
                        <h3 className="text-lg font-semibold">No Autonomous Data</h3>
                        <p className="text-muted-foreground">
                          This team doesn't have match scouting data to display autonomous statistics.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("pit")}
                          className="mt-4"
                        >
                          View Pit Data →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Starting Position Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <AutoStartPositionMap 
                          startPositions={teamStats.startPositions}
                          matchResults={teamStats.matchResults}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Position Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                          title="Position 0" 
                          value={teamStats.startPositions.position0} 
                          subtitle="% of matches" 
                          color="red"
                          compareValue={compareStats?.startPositions.position0}
                        />
                        <StatCard 
                          title="Position 1" 
                          value={teamStats.startPositions.position1} 
                          subtitle="% of matches" 
                          color="orange"
                          compareValue={compareStats?.startPositions.position1}
                        />
                        <StatCard 
                          title="Position 2" 
                          value={teamStats.startPositions.position2} 
                          subtitle="% of matches" 
                          color="yellow"
                          compareValue={compareStats?.startPositions.position2}
                        />
                        <StatCard 
                          title="Position 3" 
                          value={teamStats.startPositions.position3} 
                          subtitle="% of matches" 
                          color="green"
                          compareValue={compareStats?.startPositions.position3}
                        />
                        <StatCard 
                          title="Position 4" 
                          value={teamStats.startPositions.position4} 
                          subtitle="% of matches" 
                          color="blue"
                          compareValue={compareStats?.startPositions.position4}
                        />
                        <StatCard 
                          title="Position 5" 
                          value={teamStats.startPositions.position5} 
                          subtitle="% of matches" 
                          color="purple"
                          compareValue={compareStats?.startPositions.position5}
                        />
                      </div>

                      <div className="mt-6">
                        <p className="text-sm font-medium mb-3">Position Auto Performance</p>
                        <div className="space-y-2">
                          {[0, 1, 2, 3, 4].map(pos => {
                            const positionMatches = teamStats.matchResults.filter(match => match.startPosition === pos);
                            const avgAutoPoints = positionMatches.length > 0 
                              ? Math.round((positionMatches.reduce((sum, match) => sum + match.autoPoints, 0) / positionMatches.length) * 10) / 10
                              : 0;
                            
                            // Calculate compare team's performance for this position
                            let compareAutoPoints = 0;
                            if (compareStats) {
                              const comparePositionMatches = compareStats.matchResults.filter(match => match.startPosition === pos);
                              compareAutoPoints = comparePositionMatches.length > 0 
                                ? Math.round((comparePositionMatches.reduce((sum, match) => sum + match.autoPoints, 0) / comparePositionMatches.length) * 10) / 10
                                : 0;
                            }
                            
                            const diff = compareStats ? avgAutoPoints - compareAutoPoints : undefined;
                            
                            return (
                              <div key={pos} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <span className="text-sm">Position {pos}</span>
                                <div className="text-right flex items-center gap-2">
                                  <span className="text-sm font-bold">{avgAutoPoints} auto pts</span>
                                  {diff !== undefined && (
                                    <span className={`text-xs font-medium ${
                                      diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">({positionMatches.length} matches)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}
              </TabsContent>

              {/* Performance Tab - Similar updates for match results if needed */}
              <TabsContent value="performance" className="space-y-6 pb-6">
                {teamStats.matchesPlayed === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-center space-y-3">
                        <h3 className="text-lg font-semibold">No Performance Data</h3>
                        <p className="text-muted-foreground">
                          This team doesn't have match scouting data to display performance statistics.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("pit")}
                          className="mt-4"
                        >
                          View Pit Data →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm font-medium mb-3">Points by Phase</p>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                              <span className="text-sm font-medium">Auto</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-600">{teamStats.avgAutoPoints} pts</span>
                                {compareStats && (
                                  <span className={`text-xs font-medium ${
                                    (teamStats.avgAutoPoints - compareStats.avgAutoPoints) > 0 ? 'text-green-600' : 
                                    (teamStats.avgAutoPoints - compareStats.avgAutoPoints) < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    ({(teamStats.avgAutoPoints - compareStats.avgAutoPoints) > 0 ? '+' : ''}{(teamStats.avgAutoPoints - compareStats.avgAutoPoints).toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                              <span className="text-sm font-medium">Teleop</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-purple-600">{teamStats.avgTeleopPoints} pts</span>
                                {compareStats && (
                                  <span className={`text-xs font-medium ${
                                    (teamStats.avgTeleopPoints - compareStats.avgTeleopPoints) > 0 ? 'text-green-600' : 
                                    (teamStats.avgTeleopPoints - compareStats.avgTeleopPoints) < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    ({(teamStats.avgTeleopPoints - compareStats.avgTeleopPoints) > 0 ? '+' : ''}{(teamStats.avgTeleopPoints - compareStats.avgTeleopPoints).toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded">
                              <span className="text-sm font-medium">Endgame</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-orange-600">{teamStats.avgEndgamePoints} pts</span>
                                {compareStats && (
                                  <span className={`text-xs font-medium ${
                                    (teamStats.avgEndgamePoints - compareStats.avgEndgamePoints) > 0 ? 'text-green-600' : 
                                    (teamStats.avgEndgamePoints - compareStats.avgEndgamePoints) < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    ({(teamStats.avgEndgamePoints - compareStats.avgEndgamePoints) > 0 ? '+' : ''}{(teamStats.avgEndgamePoints - compareStats.avgEndgamePoints).toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-3">Reliability Metrics</p>
                          <div className="space-y-3">
                            <ProgressCard 
                              title="Mobility Success" 
                              value={teamStats.mobilityRate}
                              compareValue={compareStats?.mobilityRate}
                            />
                            <ProgressCard 
                              title="Climb Success" 
                              value={teamStats.climbRate}
                              compareValue={compareStats?.climbRate}
                            />
                            <ProgressCard 
                              title="Breakdown Rate" 
                              value={teamStats.breakdownRate}
                              compareValue={compareStats?.breakdownRate}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Match-by-Match Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {teamStats.matchResults.map((match, index) => (
                          <div key={index} className="flex flex-col p-3 border rounded gap-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {match.eventName && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {match.eventName}
                                  </Badge>
                                )}
                                <Badge variant="outline">Match {match.matchNumber}</Badge>
                                <Badge variant={match.alliance === "red" ? "destructive" : "default"}>
                                  {match.alliance}
                                </Badge>
                                {match.startPosition >= 0 && (
                                  <Badge variant="secondary">Pos {match.startPosition}</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {match.climbed && <Badge variant="secondary">Climbed</Badge>}
                                {match.brokeDown && <Badge variant="destructive">Broke Down</Badge>}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="font-bold text-lg">{match.totalPoints} pts</div>
                              <div className="text-sm text-muted-foreground">
                                A: {match.autoPoints} | T: {match.teleopPoints} | E: {match.endgamePoints}
                              </div>
                            </div>
                            {match.comment && match.comment.trim() !== "" && (
                              <div className="text-xs text-muted-foreground italic border-t pt-2">
                                "{match.comment}"
                              </div>
                            )}
                            {match.fullEntry && (
                              <MatchStatsButton 
                                matchData={match.fullEntry}
                                variant="outline"
                                size="default"
                                className="w-full mt-2"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}
              </TabsContent>

              {/* Pit Scouting Tab */}
              <TabsContent value="pit" className="space-y-6 pb-6">
                <PitScoutingData 
                  teamNumber={selectedTeam} 
                  selectedEvent={selectedEvent}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              {availableTeams.length === 0 ?
              <img src={LogoNotFound} alt="No Data" className="mb-4 dark:invert" /> : null}
              <p className="text-lg text-muted-foreground mb-4">
                {availableTeams.length === 0 ? "No scouting data available" : "Select a team to view analysis"}
              </p>
              {availableTeams.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Scout some matches first to see team statistics
                </p>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
};

export default TeamStatsPage;