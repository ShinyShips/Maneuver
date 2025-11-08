import type { DataCategory } from '@/lib/matchValidationTypes';

export interface CategoryInfo {
  key: DataCategory;
  label: string;
  description: string;
  examples: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    key: 'auto-coral',
    label: 'Auto Coral',
    description: 'Coral scored during autonomous period',
    examples: 'L1, L2, L3, L4 placements'
  },
  {
    key: 'teleop-coral',
    label: 'Teleop Coral',
    description: 'Coral scored during teleoperated period',
    examples: 'L1, L2, L3, L4 placements'
  },
  {
    key: 'algae',
    label: 'Algae',
    description: 'Algae scored in net or processor',
    examples: 'Net, Processor counts'
  },
  {
    key: 'endgame',
    label: 'Endgame',
    description: 'End of match positioning',
    examples: 'Deep, Shallow, Park'
  },
  {
    key: 'mobility',
    label: 'Mobility',
    description: 'Robots that crossed auto line',
    examples: 'Count of robots (0-3)'
  },
  {
    key: 'fouls',
    label: 'Fouls',
    description: 'Foul and tech foul counts',
    examples: 'Regular fouls, tech fouls'
  },
  {
    key: 'total-score',
    label: 'Total Score',
    description: 'Overall alliance score',
    examples: 'Final match score'
  }
];
