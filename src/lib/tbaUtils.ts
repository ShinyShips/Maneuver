// The Blue Alliance API utilities
const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';
// Replace this with your actual TBA API key from https://www.thebluealliance.com/account
const TBA_AUTH_KEY = 'YOUR_TBA_API_KEY_HERE';

export interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: {
      score: number;
      team_keys: string[];
      surrogate_team_keys?: string[];
      dq_team_keys?: string[];
    };
    blue: {
      score: number;
      team_keys: string[];
      surrogate_team_keys?: string[];
      dq_team_keys?: string[];
    };
  };
  score_breakdown: Record<string, unknown> | null;
  winning_alliance: 'red' | 'blue' | '';
  event_key: string;
  time: number;
  actual_time: number;
  predicted_time: number;
  post_result_time: number;
}

export interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district?: {
    abbreviation: string;
    display_name: string;
    key: string;
    year: number;
  };
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
  short_name: string;
  event_type_string: string;
  week?: number;
  address?: string;
  postal_code?: string;
  gmaps_place_id?: string;
  gmaps_url?: string;
  lat?: number;
  lng?: number;
  location_name?: string;
  timezone?: string;
  website?: string;
  first_event_id?: string;
  first_event_code?: string;
  webcasts?: Array<{
    type: string;
    channel: string;
    date?: string;
    file?: string;
  }>;
  division_keys?: string[];
  parent_event_key?: string;
  playoff_type?: number;
  playoff_type_string?: string;
}

export interface TBATeam {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  school_name?: string;
  city?: string;
  state_prov?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  gmaps_place_id?: string;
  gmaps_url?: string;
  lat?: number;
  lng?: number;
  location_name?: string;
  website?: string;
  rookie_year?: number;
  motto?: string;
  home_championship?: {
    [year: string]: string;
  };
}

// Helper function to make TBA API requests
const makeTBARequest = async (endpoint: string): Promise<unknown> => {
  const response = await fetch(`${TBA_BASE_URL}${endpoint}`, {
    headers: {
      'X-TBA-Auth-Key': TBA_AUTH_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TBA API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Get all events for a year
export const getEventsForYear = async (year: number): Promise<TBAEvent[]> => {
  return makeTBARequest(`/events/${year}`) as Promise<TBAEvent[]>;
};

// Search events by name/code
export const searchEvents = async (year: number, query: string): Promise<TBAEvent[]> => {
  const events = await getEventsForYear(year);
  const searchTerm = query.toLowerCase();
  
  return events.filter(event => 
    event.name.toLowerCase().includes(searchTerm) ||
    event.event_code.toLowerCase().includes(searchTerm) ||
    event.short_name.toLowerCase().includes(searchTerm)
  );
};

// Get matches for an event
export const getEventMatches = async (eventKey: string): Promise<TBAMatch[]> => {
  return makeTBARequest(`/event/${eventKey}/matches`) as Promise<TBAMatch[]>;
};

// Get a specific match
export const getMatch = async (matchKey: string): Promise<TBAMatch> => {
  return makeTBARequest(`/match/${matchKey}`) as Promise<TBAMatch>;
};

// Get matches for a specific event and filter by qualification matches
export const getQualificationMatches = async (eventKey: string): Promise<TBAMatch[]> => {
  const matches = await getEventMatches(eventKey);
  return matches
    .filter(match => match.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);
};

// Get playoff matches for an event
export const getPlayoffMatches = async (eventKey: string): Promise<TBAMatch[]> => {
  const matches = await getEventMatches(eventKey);
  return matches.filter(match => match.comp_level !== 'qm');
};

// Get match results with winner determination
export const getMatchResult = (match: TBAMatch): {
  redScore: number;
  blueScore: number;
  winner: 'red' | 'blue' | 'tie';
  winningAlliance: 'red' | 'blue' | '';
} => {
  const redScore = match.alliances.red.score;
  const blueScore = match.alliances.blue.score;
  
  let winner: 'red' | 'blue' | 'tie';
  if (redScore > blueScore) {
    winner = 'red';
  } else if (blueScore > redScore) {
    winner = 'blue';
  } else {
    winner = 'tie';
  }

  return {
    redScore,
    blueScore,
    winner,
    winningAlliance: match.winning_alliance || (winner === 'tie' ? '' : winner)
  };
};

// Build match key from event key and match number
export const buildMatchKey = (eventKey: string, matchNumber: number, compLevel: string = 'qm'): string => {
  return `${eventKey}_${compLevel}${matchNumber}`;
};

// Parse match number from match key
export const parseMatchKey = (matchKey: string): {
  eventKey: string;
  compLevel: string;
  matchNumber: number;
} => {
  const parts = matchKey.split('_');
  if (parts.length !== 2) {
    throw new Error('Invalid match key format');
  }

  const eventKey = parts[0];
  const matchPart = parts[1];
  
  // Extract comp level (qm, sf, f, etc.) and match number
  const compLevelMatch = matchPart.match(/^([a-z]+)(\d+)$/);
  if (!compLevelMatch) {
    throw new Error('Invalid match key format');
  }

  const compLevel = compLevelMatch[1];
  const matchNumber = parseInt(compLevelMatch[2]);

  return { eventKey, compLevel, matchNumber };
};

/**
 * Extract team number from TBA team key
 * @param teamKey - TBA team key (e.g., "frc1234")
 * @returns Team number as string (e.g., "1234")
 */
export const extractTeamNumber = (teamKey: string): string => {
  return teamKey.replace('frc', '');
};

/**
 * Extract team numbers from array of TBA team keys
 * @param teamKeys - Array of TBA team keys
 * @returns Array of team numbers as strings
 */
export const extractTeamNumbers = (teamKeys: string[]): string[] => {
  return teamKeys.map(extractTeamNumber);
};

// Validate TBA API key (simple test)
export const validateAPIKey = async (): Promise<boolean> => {
  try {
    // Try to get current year events as a test
    const currentYear = new Date().getFullYear();
    await makeTBARequest(`/events/${currentYear}/simple`);
    return true;
  } catch (error) {
    console.error('TBA API key validation failed:', error);
    return false;
  }
};

// Get event info by key
export const getEvent = async (eventKey: string): Promise<TBAEvent> => {
  return makeTBARequest(`/event/${eventKey}`) as Promise<TBAEvent>;
};

// Get teams for an event
export const getEventTeams = async (eventKey: string, apiKey?: string): Promise<TBATeam[]> => {
  const endpoint = `/event/${eventKey}/teams/keys`;
  
  if (apiKey) {
    // Use provided API key for this request
    const response = await fetch(`${TBA_BASE_URL}${endpoint}`, {
      headers: {
        'X-TBA-Auth-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TBA API Error: ${response.status} ${response.statusText}`);
    }

    const teamKeys = await response.json() as string[];
    // Convert team keys (e.g., "frc1234") to team objects
    return teamKeys.map(key => {
      const teamNumber = parseInt(key.replace('frc', ''));
      return {
        key,
        team_number: teamNumber,
        nickname: `Team ${teamNumber}`,
        name: `Team ${teamNumber}`,
      };
    }).sort((a, b) => a.team_number - b.team_number);
  } else {
    const teamKeys = await makeTBARequest(endpoint) as string[];
    // Convert team keys (e.g., "frc1234") to team objects
    return teamKeys.map(key => {
      const teamNumber = parseInt(key.replace('frc', ''));
      return {
        key,
        team_number: teamNumber,
        nickname: `Team ${teamNumber}`,
        name: `Team ${teamNumber}`,
      };
    }).sort((a, b) => a.team_number - b.team_number);
  }
};

// Local storage utilities for event teams
const TEAMS_STORAGE_PREFIX = 'tba_event_teams_';

export const storeEventTeams = (eventKey: string, teams: TBATeam[]): void => {
  const storageKey = `${TEAMS_STORAGE_PREFIX}${eventKey}`;
  // Extract just the team numbers for more efficient storage
  const teamNumbers = teams.map(team => team.team_number).sort((a, b) => a - b);
  const data = {
    teamNumbers,
    timestamp: Date.now(),
    eventKey
  };
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`Stored ${teamNumbers.length} team numbers for event ${eventKey}`);
  } catch (error) {
    console.error('Failed to store teams in localStorage:', error);
    throw new Error('Failed to store teams data');
  }
};

export const getStoredEventTeams = (eventKey: string): number[] | null => {
  const storageKey = `${TEAMS_STORAGE_PREFIX}${eventKey}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    // Check for both old format (teams) and new format (teamNumbers) for backward compatibility
    if (data.teamNumbers) {
      return data.teamNumbers;
    } else if (data.teams) {
      // Legacy format - extract team numbers from full team objects
      return data.teams.map((team: TBATeam) => team.team_number).sort((a: number, b: number) => a - b);
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve teams from localStorage:', error);
    return null;
  }
};

export const clearStoredEventTeams = (eventKey: string): void => {
  const storageKey = `${TEAMS_STORAGE_PREFIX}${eventKey}`;
  localStorage.removeItem(storageKey);
};

export const getAllStoredEventTeams = (): { [eventKey: string]: number[] } => {
  const result: { [eventKey: string]: number[] } = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(TEAMS_STORAGE_PREFIX)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          const eventKey = key.replace(TEAMS_STORAGE_PREFIX, '');
          
          // Handle both new format (teamNumbers) and legacy format (teams)
          if (data.teamNumbers) {
            result[eventKey] = data.teamNumbers;
          } else if (data.teams) {
            // Legacy format - extract team numbers
            result[eventKey] = data.teams.map((team: TBATeam) => team.team_number).sort((a: number, b: number) => a - b);
          }
        }
      } catch (error) {
        console.error(`Failed to parse stored teams for key ${key}:`, error);
      }
    }
  }
  
  return result;
};
