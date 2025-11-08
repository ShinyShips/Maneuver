import React from 'react';
import { CheckCircle } from 'lucide-react';

interface GenerationResult {
  totalMatches: number;
  totalEntries: number;
  profiles: Record<string, number>;
}

interface GenerationResultDisplayProps {
  result: GenerationResult;
}

export const GenerationResultDisplay: React.FC<GenerationResultDisplayProps> = ({ result }) => {
  return (
    <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
        <CheckCircle className="h-5 w-5" />
        Generation Complete!
      </div>
      <div className="text-sm space-y-1 text-foreground">
        <p><strong>{result.totalMatches}</strong> matches processed</p>
        <p><strong>{result.totalEntries}</strong> scouting entries created</p>
        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
          <p className="font-medium mb-1">Profile Distribution:</p>
          {Object.entries(result.profiles).map(([profile, count]) => (
            <div key={profile} className="flex justify-between">
              <span className="capitalize">{profile}:</span>
              <span>{count} matches</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
