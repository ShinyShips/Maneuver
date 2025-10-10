import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sigma, TrendingUpDown, Award, Target } from "lucide-react";
import { calculateAccuracy } from '@/lib/scoutGameUtils';
import type { Scout } from '@/lib/dexieDB';

interface ScoutStatsSummaryProps {
  scouts: Scout[];
}

export function ScoutStatsSummary({ scouts }: ScoutStatsSummaryProps) {
  const totalPredictions = scouts.reduce((sum, s) => sum + s.totalPredictions, 0);
  const totalStakes = scouts.reduce((sum, s) => sum + s.stakes, 0);
  const avgAccuracy = scouts.length > 0 
    ? Math.round(scouts.reduce((sum, s) => sum + calculateAccuracy(s), 0) / scouts.length)
    : 0;

  return (
    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Scouts</CardTitle>
          <Sigma className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{scouts.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
          <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPredictions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stakes</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStakes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgAccuracy}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
