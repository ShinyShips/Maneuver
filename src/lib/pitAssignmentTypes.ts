// Types for pit assignment functionality

export interface PitAssignment {
  id: string;
  eventKey: string;
  teamNumber: number;
  scoutName: string;
  assignedAt: number;
  completed: boolean;
  notes?: string;
}

export interface PitAssignmentScout {
  name: string;
  addedAt: number;
}

export type AssignmentMode = 'sequential' | 'manual';
