import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/animate-ui/radix/tabs";
import { AlertCircle, Users, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useScoutManagement } from '@/hooks/useScoutManagement';
import { getAllStoredEventTeams } from '@/lib/tbaUtils';
import { getStoredNexusTeams, getStoredPitAddresses, getStoredPitData } from '@/lib/nexusUtils';
import { loadPitScoutingEntry } from '@/lib/pitScoutingUtils';
import { ScoutManagementSection } from '@/components/PitAssignmentComponents/ScoutManagementSection.tsx';
import { TeamDisplaySection } from '@/components/PitAssignmentComponents/TeamDisplaySection';
import { AssignmentResults } from '@/components/PitAssignmentComponents/AssignmentResults';
import EventInformationCard from '@/components/PitAssignmentComponents/EventInformationCard';
import AssignmentControlsCard from '@/components/PitAssignmentComponents/AssignmentControlsCard';
import { DataAttribution } from '@/components/DataAttribution';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import type { NexusPitMap } from '@/lib/nexusUtils';

const PitAssignmentsPage: React.FC = () => {
  const { scoutsList } = useScoutManagement();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [currentTeams, setCurrentTeams] = useState<number[]>([]);
  const [teamDataSource, setTeamDataSource] = useState<'nexus' | 'tba' | null>(null);
  const [pitAddresses, setPitAddresses] = useState<{ [teamNumber: string]: string } | null>(null);
  const [pitMapData, setPitMapData] = useState<NexusPitMap | null>(null);
  const [assignments, setAssignments] = useState<PitAssignment[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'sequential' | 'spatial' | 'manual'>('sequential');
  const [activeTab, setActiveTab] = useState<string>('teams');
  const [selectedScoutForAssignment, setSelectedScoutForAssignment] = useState<string | null>(null);
  const [assignmentsConfirmed, setAssignmentsConfirmed] = useState<boolean>(false);

  // Save assignments to localStorage whenever they change
  useEffect(() => {
    if (selectedEvent && assignments.length > 0) {
      const storageKey = `pit_assignments_${selectedEvent}`;
      localStorage.setItem(storageKey, JSON.stringify(assignments));
    }
  }, [assignments, selectedEvent]);

  // Load saved assignments when event changes
  useEffect(() => {
    if (selectedEvent) {
      const storageKey = `pit_assignments_${selectedEvent}`;
      const savedAssignments = localStorage.getItem(storageKey);
      if (savedAssignments) {
        try {
          const parsedAssignments = JSON.parse(savedAssignments) as PitAssignment[];
          setAssignments(parsedAssignments);
        } catch (error) {
          console.warn('Error loading saved assignments:', error);
        }
      }
    }
  }, [selectedEvent]);

  // Load the single available event (prioritizing Nexus over TBA)
  useEffect(() => {
    const tbaTeams = getAllStoredEventTeams();
    let foundEvent = '';
    let foundTeams: number[] = [];
    let foundSource: 'nexus' | 'tba' = 'tba';
    
    // Check for Nexus teams first (priority) by scanning localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_event_teams_')) {
        const eventKey = key.replace('nexus_event_teams_', '');
        const nexusTeams = getStoredNexusTeams(eventKey);
        
        if (nexusTeams && nexusTeams.length > 0) {
          // Convert from frc format to numbers (frc123 -> 123)
          const teamNumbers = nexusTeams
            .map(teamKey => teamKey.startsWith('frc') ? parseInt(teamKey.substring(3)) : parseInt(teamKey))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);
          
          if (teamNumbers.length > 0) {
            foundEvent = eventKey;
            foundTeams = teamNumbers;
            foundSource = 'nexus';
            break; // Use first Nexus event found
          }
        }
      }
    }
    
    // Fallback to TBA teams if no Nexus teams found
    if (!foundEvent) {
      const tbaEventKeys = Object.keys(tbaTeams);
      if (tbaEventKeys.length > 0) {
        const firstEventKey = tbaEventKeys[0];
        const tbaTeamsForEvent = tbaTeams[firstEventKey];
        if (tbaTeamsForEvent && tbaTeamsForEvent.length > 0) {
          foundEvent = firstEventKey;
          foundTeams = tbaTeamsForEvent;
          foundSource = 'tba';
        }
      }
    }
    
    setSelectedEvent(foundEvent);
    setCurrentTeams(foundTeams);
    setTeamDataSource(foundSource);
  }, []);

  // Load pit addresses and map data when event changes and uses Nexus data
  useEffect(() => {
    if (selectedEvent && teamDataSource === 'nexus') {
      const addresses = getStoredPitAddresses(selectedEvent);
      const pitData = getStoredPitData(selectedEvent);
      setPitAddresses(addresses);
      setPitMapData(pitData.map);
    } else {
      setPitAddresses(null);
      setPitMapData(null);
    }
  }, [selectedEvent, teamDataSource]);

  // Check for existing pit scouting data and mark assignments as completed
  useEffect(() => {
    if (!selectedEvent || currentTeams.length === 0) return;

    const checkPitScoutingData = async () => {
      // Get event name for the selected event - for demo data, use selectedEvent as the event name
      const eventName = selectedEvent;
      
      // Check each team for existing pit scouting data
      const teamsWithPitData: number[] = [];
      
      for (const teamNumber of currentTeams) {
        try {
          const pitData = await loadPitScoutingEntry(teamNumber.toString(), eventName);
          if (pitData) {
            teamsWithPitData.push(teamNumber);
          }
        } catch (error) {
          console.warn(`Error checking pit data for team ${teamNumber}:`, error);
        }
      }

      // Update assignments to mark teams with pit data as completed
      if (teamsWithPitData.length > 0) {
        setAssignments(prev => {
          return prev.map(assignment => {
            if (teamsWithPitData.includes(assignment.teamNumber)) {
              return { ...assignment, completed: true };
            }
            return assignment;
          });
        });
      }
    };

    checkPitScoutingData();
  }, [selectedEvent, currentTeams]);

  // Check for updates when page regains focus (when user returns from scanner page)
  useEffect(() => {
    if (!selectedEvent || assignments.length === 0) return;

    const checkForUpdates = async () => {
      const eventName = selectedEvent;
      let hasUpdates = false;
      
      const updatedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const pitData = await loadPitScoutingEntry(assignment.teamNumber.toString(), eventName);
            const shouldBeCompleted = !!pitData;
            
            if (assignment.completed !== shouldBeCompleted) {
              hasUpdates = true;
              return { ...assignment, completed: shouldBeCompleted };
            }
          } catch (error) {
            console.warn(`Error checking pit data for team ${assignment.teamNumber}:`, error);
          }
          return assignment;
        })
      );
      
      if (hasUpdates) {
        setAssignments(updatedAssignments);
      }
    };

    // Check when page regains focus (when user returns to tab/page)
    const handleFocus = () => {
      checkForUpdates();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedEvent, assignments]);

  // Initial check for pit data when assignments are first created
  const [hasRunInitialPitCheck, setHasRunInitialPitCheck] = useState<string>('');
  useEffect(() => {
    if (!selectedEvent || assignments.length === 0) return;
    
    // Create a unique key for this set of assignments to prevent repeated checks
    const assignmentKey = `${selectedEvent}_${assignments.length}_${assignments.map(a => a.id).sort().join('_')}`;
    
    // Only run this check if we haven't checked this exact set of assignments before
    if (hasRunInitialPitCheck === assignmentKey) return;

    const checkInitialPitData = async () => {
      const eventName = selectedEvent;
      let hasUpdates = false;
      
      const updatedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const pitData = await loadPitScoutingEntry(assignment.teamNumber.toString(), eventName);
            const shouldBeCompleted = !!pitData;
            
            if (assignment.completed !== shouldBeCompleted) {
              hasUpdates = true;
              return { ...assignment, completed: shouldBeCompleted };
            }
          } catch (error) {
            console.warn(`Error checking pit data for team ${assignment.teamNumber}:`, error);
          }
          return assignment;
        })
      );
      
      if (hasUpdates) {
        setAssignments(updatedAssignments);
      }
      
      setHasRunInitialPitCheck(assignmentKey);
    };

    // Use a timeout to ensure this only runs once after assignments are loaded
    const timeoutId = setTimeout(checkInitialPitData, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedEvent, assignments, hasRunInitialPitCheck]);

  const hasValidData = currentTeams.length > 0 && scoutsList.length > 0;
  const hasAssignments = assignments.length > 0;

  const handleAssignmentModeChange = (mode: 'sequential' | 'spatial' | 'manual') => {
    setAssignmentMode(mode);
    setSelectedScoutForAssignment(null); // Clear selection when switching modes
    setAssignmentsConfirmed(false); // Reset confirmed state
  };

  const handleAssignmentsGenerated = async (newAssignments: PitAssignment[], confirmed: boolean) => {
    // Check for existing pit scouting data and mark teams as completed
    if (selectedEvent && newAssignments.length > 0) {
      const eventName = selectedEvent;
      
      const updatedAssignments = await Promise.all(
        newAssignments.map(async (assignment) => {
          try {
            const pitData = await loadPitScoutingEntry(assignment.teamNumber.toString(), eventName);
            if (pitData) {
              return { ...assignment, completed: true };
            }
          } catch (error) {
            console.warn(`Error checking pit data for team ${assignment.teamNumber}:`, error);
          }
          return assignment;
        })
      );
      
      setAssignments(updatedAssignments);
    } else {
      setAssignments(newAssignments);
    }
    
    setAssignmentsConfirmed(confirmed);
  };

  const handleManualAssignment = async (teamNumber: number, scoutName: string) => {
    const assignmentId = `${selectedEvent}-${teamNumber}`;
    
    // Check if team already has pit scouting data
    let completed = false;
    if (selectedEvent) {
      try {
        const pitData = await loadPitScoutingEntry(teamNumber.toString(), selectedEvent);
        completed = !!pitData;
      } catch (error) {
        console.warn(`Error checking pit data for team ${teamNumber}:`, error);
      }
    }
    
    setAssignments(prev => {
      // Remove any existing assignment for this team
      const filtered = prev.filter(a => a.teamNumber !== teamNumber);
      
      // Add new assignment
      return [...filtered, {
        id: assignmentId,
        eventKey: selectedEvent,
        teamNumber,
        scoutName,
        assignedAt: Date.now(),
        completed
      }];
    });
  };

  const handleRemoveAssignment = (teamNumber: number) => {
    setAssignments(prev => prev.filter(a => a.teamNumber !== teamNumber));
  };

  const handleClearAssignments = () => {
    setAssignments([]);
    setAssignmentsConfirmed(false);
    setSelectedScoutForAssignment(null);
    
    // Also clear from localStorage
    if (selectedEvent) {
      const storageKey = `pit_assignments_${selectedEvent}`;
      localStorage.removeItem(storageKey);
    }
  };

  const handleConfirmAssignments = () => {
    setAssignmentsConfirmed(true);
    setSelectedScoutForAssignment(null);
  };

  const handleToggleCompleted = (assignmentId: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId 
        ? { ...assignment, completed: !assignment.completed }
        : assignment
    ));
  };

  return (
    <div className="min-h-screen container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="text-start">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pit Assignments</h1>
            <p className="text-muted-foreground">
              Manage scouts and assign teams for pit scouting
            </p>
          </div>
          {/* Data source attribution */}
          <div className="hidden md:block">
            <DataAttribution 
              sources={teamDataSource ? [teamDataSource] : ['tba', 'nexus']} 
              variant="full" 
            />
          </div>
        </div>
        {/* Mobile attribution */}
        <div className="md:hidden mt-2">
          <DataAttribution 
            sources={teamDataSource ? [teamDataSource] : ['tba', 'nexus']} 
            variant="compact" 
          />
        </div>
      </div>

      {/* Scout Management - Moved to top */}
      <ScoutManagementSection />

      {/* Event Information and Assignment Controls - Side by side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Event Information */}
        <EventInformationCard
          selectedEvent={selectedEvent}
          teamDataSource={teamDataSource}
          currentTeams={currentTeams}
          pitAddresses={pitAddresses}
          hasTeamData={currentTeams.length > 0}
        />

        {/* Assignment Controls */}
        {hasValidData && (
          <AssignmentControlsCard
            assignmentMode={assignmentMode}
            pitMapData={pitMapData}
            pitAddresses={pitAddresses}
            currentTeams={currentTeams}
            scoutsList={scoutsList}
            selectedEvent={selectedEvent}
            hasAssignments={hasAssignments}
            onAssignmentModeChange={handleAssignmentModeChange}
            onAssignmentsGenerated={handleAssignmentsGenerated}
          />
        )}
      </div>

      {/* Tabbed Interface for Team Display and Assignment Results */}
      {selectedEvent && currentTeams.length > 0 && (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          enableSwipe={true}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Cards
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Table View
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams">
            <div className="min-h-[600px]">
              <TeamDisplaySection 
                eventKey={selectedEvent}
                teams={currentTeams}
                assignments={assignments}
                scoutsList={scoutsList}
                onToggleCompleted={handleToggleCompleted}
                assignmentMode={assignmentMode}
                onManualAssignment={handleManualAssignment}
                onRemoveAssignment={handleRemoveAssignment}
                selectedScoutForAssignment={selectedScoutForAssignment}
                onScoutSelectionChange={setSelectedScoutForAssignment}
                onConfirmAssignments={assignmentMode === 'manual' && !assignmentsConfirmed ? handleConfirmAssignments : undefined}
                onClearAllAssignments={handleClearAssignments}
                assignmentsConfirmed={assignmentsConfirmed}
                pitAddresses={pitAddresses}
                pitMapData={pitMapData}
                teamDataSource={teamDataSource || undefined}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="assignments">
            <div className="min-h-[600px] max-h-[600px] overflow-y-auto">
              <AssignmentResults
                assignments={assignments}
                onToggleCompleted={handleToggleCompleted}
                onClearAllAssignments={handleClearAssignments}
                assignmentMode={assignmentMode}
                scoutsList={scoutsList}
                onManualAssignment={handleManualAssignment}
                onRemoveAssignment={handleRemoveAssignment}
                selectedScoutForAssignment={selectedScoutForAssignment}
                onScoutSelectionChange={setSelectedScoutForAssignment}
                assignmentsConfirmed={assignmentsConfirmed}
                allTeams={currentTeams}
                onConfirmAssignments={assignmentMode === 'manual' && !assignmentsConfirmed ? handleConfirmAssignments : undefined}
                pitAddresses={pitAddresses}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Status Messages */}
      {!hasValidData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {currentTeams.length === 0 && "No team data found. Please load demo data from the home page or import teams from the TBA Data page."}
            {scoutsList.length === 0 && " Please add scouts to create assignments."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PitAssignmentsPage;
