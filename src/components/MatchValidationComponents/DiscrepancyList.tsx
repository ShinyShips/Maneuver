import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Discrepancy } from '@/lib/matchValidationTypes';

interface DiscrepancyWithAlliance extends Discrepancy {
  alliance: 'red' | 'blue';
}

interface DiscrepancyListProps {
  discrepancies: DiscrepancyWithAlliance[];
  getSeverityVariant: (severity: Discrepancy['severity']) => 'destructive' | 'default' | 'secondary' | 'outline';
}

export const DiscrepancyList: React.FC<DiscrepancyListProps> = ({
  discrepancies,
  getSeverityVariant,
}) => {
  if (discrepancies.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Detailed Discrepancies ({discrepancies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {discrepancies.map((disc, index) => (
            <div
              key={`${disc.alliance}-${disc.field}-${index}`}
              className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={disc.alliance === 'red' ? 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800' : 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800'}
                    >
                      {disc.alliance.toUpperCase()}
                    </Badge>
                    <Badge variant={getSeverityVariant(disc.severity)}>
                      {disc.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {disc.category.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="font-medium text-sm mb-1">{disc.message}</div>
                  <div className="text-xs text-muted-foreground">{disc.field}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Scouted:</div>
                    <div className="font-bold">{disc.scoutedValue}</div>
                  </div>
                  <div className="text-sm mt-1">
                    <div className="text-muted-foreground">TBA:</div>
                    <div className="font-bold">{disc.tbaValue}</div>
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    Δ {disc.difference} ({disc.percentDiff.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
