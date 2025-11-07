import React from 'react';
import { Label } from '@/components/ui/label';

interface TestDistributionDisplayProps {
  distribution: Record<string, number>;
}

export const TestDistributionDisplay: React.FC<TestDistributionDisplayProps> = ({ 
  distribution 
}) => {
  return (
    <div className="space-y-2">
      <Label>Test Distribution</Label>
      <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
        <div className="flex justify-between">
          <span>✅ Clean (Pass):</span>
          <span className="font-medium">{(distribution.clean * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>🔵 Minor Issues:</span>
          <span className="font-medium">{(distribution.minor * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>🟡 Warnings (Flagged):</span>
          <span className="font-medium">{(distribution.warning * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>🔴 Critical (Failed):</span>
          <span className="font-medium">{(distribution.critical * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>🔀 Mixed:</span>
          <span className="font-medium">{(distribution.mixed * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
