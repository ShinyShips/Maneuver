import React from 'react';

interface DataStatsDisplayProps {
  dataStats: {
    total: number;
    byMatch: Record<string, number>;
  };
  eventKey: string;
}

export const DataStatsDisplay: React.FC<DataStatsDisplayProps> = ({ 
  dataStats, 
  eventKey 
}) => {
  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="text-sm space-y-1">
        <p className="font-medium text-blue-900 dark:text-blue-300">
          Found {dataStats.total} entries for {eventKey}
        </p>
        <div className="mt-2 text-xs text-blue-800 dark:text-blue-400 max-h-32 overflow-y-auto">
          {Object.entries(dataStats.byMatch)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .slice(0, 10)
            .map(([match, count]) => (
              <div key={match} className="flex justify-between">
                <span>Match {match}:</span>
                <span className={count !== 6 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                  {count} entries {count !== 6 ? '⚠️' : '✓'}
                </span>
              </div>
            ))}
          {Object.keys(dataStats.byMatch).length > 10 && (
            <p className="text-center mt-1">... and {Object.keys(dataStats.byMatch).length - 10} more matches</p>
          )}
        </div>
      </div>
    </div>
  );
};
