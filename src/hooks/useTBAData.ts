import { useState } from 'react';
import { toast } from 'sonner';
import { type TBAMatch, getMatchResult } from '@/lib/tbaUtils';
import { setCurrentEvent } from '@/lib/eventDataUtils';
import { 
  getEventTeams, 
  storeEventTeams, 
  getStoredEventTeams, 
  clearStoredEventTeams,
  type TBATeam 
} from '@/lib/tbaUtils';

export const useTBAData = () => {
  // Match Data Loading state
  const [matchDataLoading, setMatchDataLoading] = useState(false);

  // Match Results Loading state
  const [matchResultsLoading, setMatchResultsLoading] = useState(false);
  const [matches, setMatches] = useState<TBAMatch[]>([]);

  // Event Teams Loading state
  const [eventTeamsLoading, setEventTeamsLoading] = useState(false);
  const [teams, setTeams] = useState<TBATeam[]>([]);
  const [isStored, setIsStored] = useState(false);

  const fetchMatchDataFromTBA = async (tbaApiKey: string, tbaEventKey: string, rememberForSession: boolean, setApiKey: (key: string) => void) => {
    if (!tbaApiKey.trim()) {
      toast.error("Please enter your TBA API key");
      return;
    }
    
    if (!tbaEventKey.trim()) {
      toast.error("Please enter an event key");
      return;
    }

    setMatchDataLoading(true);
    
    try {
      const headers = {
        "X-TBA-Auth-Key": tbaApiKey,
      };
      
      const res = await fetch(
        `https://www.thebluealliance.com/api/v3/event/${tbaEventKey}/matches/simple`,
        { headers }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid API key. Please check your TBA API key.");
        } else if (res.status === 404) {
          throw new Error("Event not found. Please check the event key.");
        } else {
          throw new Error(`API request failed with status ${res.status}`);
        }
      }
      
      const fullData = await res.json();

      const qualMatchesCleaned = [];

      for (const match of fullData) {
        if (match.comp_level == "qm") {
          qualMatchesCleaned.push({
            matchNum: match["match_number"],
            redAlliance: match.alliances.red.team_keys.map((team: string) =>
              team.replace("frc", "")
            ),
            blueAlliance: match.alliances.blue.team_keys.map((team: string) =>
              team.replace("frc", "")
            ),
          });
        }
      }
      
      qualMatchesCleaned.sort((a, b) => a.matchNum - b.matchNum);

      localStorage.setItem("matchData", JSON.stringify(qualMatchesCleaned));
      localStorage.setItem("eventName", tbaEventKey);
      
      // Update events list
      const savedEvents = localStorage.getItem("eventsList");
      let eventsList: string[] = [];
      
      if (savedEvents) {
        try {
          eventsList = JSON.parse(savedEvents);
        } catch {
          eventsList = [];
        }
      }
      
      if (!eventsList.includes(tbaEventKey)) {
        eventsList.push(tbaEventKey);
        eventsList.sort();
        localStorage.setItem("eventsList", JSON.stringify(eventsList));
      }

      const successMessage = `Match data loaded: ${qualMatchesCleaned.length} matches for ${tbaEventKey}`;
      toast.success(successMessage);
      
      // Update current event in localStorage after successful load
      setCurrentEvent(tbaEventKey.trim());
      
      // Clear API key from memory after successful fetch if not remembering
      if (!rememberForSession) {
        setApiKey("");
        sessionStorage.removeItem("tbaApiKey");
      }
    } catch (err) {
      toast.error("Failed to fetch match data from TBA");
      console.error(err);
    } finally {
      setMatchDataLoading(false);
    }
  };

  const loadMatchResults = async (tbaApiKey: string, tbaEventKey: string, rememberForSession: boolean, setApiKey: (key: string) => void) => {
    if (!tbaEventKey.trim()) {
      toast.error('Please enter an event key');
      return;
    }

    if (!tbaApiKey.trim()) {
      toast.error('Please enter your TBA API key');
      return;
    }

    setMatchResultsLoading(true);
    try {
      const headers = {
        "X-TBA-Auth-Key": tbaApiKey,
      };
      const response = await fetch(
        `https://www.thebluealliance.com/api/v3/event/${tbaEventKey.trim()}/matches/simple`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const fullData = await response.json();
      
      // Filter for qualification matches
      const qualMatches = fullData.filter((match: TBAMatch) => match.comp_level === "qm");
      qualMatches.sort((a: TBAMatch, b: TBAMatch) => a.match_number - b.match_number);
      
      setMatches(qualMatches);
      toast.success(`Loaded ${qualMatches.length} qualification matches`);
      
      // Update current event in localStorage after successful load
      setCurrentEvent(tbaEventKey.trim());
      
      // Store match results in localStorage for stakes calculation
      const matchResults = qualMatches.map((match: TBAMatch) => ({
        eventKey: tbaEventKey.trim(),
        matchNumber: match.match_number,
        winner: getMatchResult(match).winner,
        redScore: getMatchResult(match).redScore,
        blueScore: getMatchResult(match).blueScore
      }));
      
      localStorage.setItem('matchResults', JSON.stringify(matchResults));
      localStorage.setItem('currentEventKey', tbaEventKey.trim());
      
      // Clear API key from memory if not remembering for session
      if (!rememberForSession) {
        setApiKey("");
        sessionStorage.removeItem("tbaApiKey");
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load matches. Check the event key and API key.');
      setMatches([]);
    } finally {
      setMatchResultsLoading(false);
    }
  };

  const loadEventTeams = async (tbaApiKey: string, tbaEventKey: string, rememberForSession: boolean, setApiKey: (key: string) => void) => {
    if (!tbaEventKey.trim()) {
      toast.error('Please enter an event key');
      return;
    }

    if (!tbaApiKey.trim()) {
      toast.error('Please enter your TBA API key');
      return;
    }

    setEventTeamsLoading(true);
    try {
      // First check if teams are already stored
      const storedTeamNumbers = getStoredEventTeams(tbaEventKey);
      if (storedTeamNumbers && storedTeamNumbers.length > 0) {
        // Convert stored team numbers back to minimal team objects for display
        const storedTeamObjects: TBATeam[] = storedTeamNumbers.map(teamNumber => ({
          key: `frc${teamNumber}`,
          team_number: teamNumber,
          nickname: `Team ${teamNumber}`,
          name: `Team ${teamNumber}`,
        }));
        setTeams(storedTeamObjects);
        setIsStored(true);
        toast.success(`Loaded ${storedTeamNumbers.length} teams from local storage`);
        setEventTeamsLoading(false);
        return;
      }

      // If not stored, fetch from API
      const fetchedTeams = await getEventTeams(tbaEventKey, tbaApiKey);
      setTeams(fetchedTeams);
      
      // Automatically store teams to localStorage for persistence
      try {
        storeEventTeams(tbaEventKey, fetchedTeams);
        setIsStored(true);
        console.log(`Auto-stored ${fetchedTeams.length} teams for event ${tbaEventKey}`);
      } catch (storeError) {
        console.warn('Failed to auto-store teams:', storeError);
        // Don't fail the whole operation if storage fails
        setIsStored(false);
      }
      
      toast.success(`Loaded ${fetchedTeams.length} teams from TBA API`);
      
      // Update current event in localStorage after successful load
      setCurrentEvent(tbaEventKey.trim());
      
      // Clear API key from memory if not remembering for session
      if (!rememberForSession) {
        setApiKey("");
        sessionStorage.removeItem("tbaApiKey");
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load teams');
    } finally {
      setEventTeamsLoading(false);
    }
  };

  const handleStoreTeams = (eventKey: string) => {
    if (teams.length === 0) {
      toast.error('No teams to store');
      return;
    }

    try {
      storeEventTeams(eventKey, teams);
      setIsStored(true);
      toast.success(`Stored ${teams.length} teams for pit scouting assignments`);
    } catch (error) {
      console.error('Error storing teams:', error);
      toast.error('Failed to store teams');
    }
  };

  const handleClearStored = (eventKey: string) => {
    try {
      clearStoredEventTeams(eventKey);
      setIsStored(false);
      toast.success('Cleared stored teams');
    } catch (error) {
      console.error('Error clearing stored teams:', error);
      toast.error('Failed to clear stored teams');
    }
  };

  return {
    // State
    matchDataLoading,
    matchResultsLoading,
    eventTeamsLoading,
    matches,
    teams,
    isStored,
    
    // Actions
    fetchMatchDataFromTBA,
    loadMatchResults,
    loadEventTeams,
    handleStoreTeams,
    handleClearStored,
  };
};
