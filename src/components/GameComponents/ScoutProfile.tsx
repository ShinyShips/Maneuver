import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, Target, TrendingUp, User, Flame, Award } from 'lucide-react';
import { useCurrentScout } from '../../hooks/useCurrentScout';

export const ScoutProfile: React.FC = () => {
  const { currentScout, isLoading, refreshScout } = useCurrentScout();

  const calculateAccuracy = () => {
    if (!currentScout || currentScout.totalPredictions === 0) return 0;
    return Math.round((currentScout.correctPredictions / currentScout.totalPredictions) * 100);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!currentScout) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            No Scout Selected
          </CardTitle>
          <CardDescription>
            Select a scout from the sidebar to view their game stats
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          {currentScout.name}
        </CardTitle>
        <CardDescription>
          Scouting Game Stats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stakes Display */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">Stakes</span>
          </div>
          <Badge variant="secondary" className="text-lg font-bold">
            {currentScout.stakes}
          </Badge>
        </div>

        {/* Predictions Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {currentScout.totalPredictions}
            </div>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {calculateAccuracy()}%
            </div>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Current</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {currentScout.currentStreak}
            </div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Best</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {currentScout.longestStreak}
            </div>
          </div>
        </div>

        {/* Correct Predictions */}
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Correct Predictions
          </div>
          <div className="text-xl font-bold">
            {currentScout.correctPredictions} / {currentScout.totalPredictions}
          </div>
        </div>

        {/* Timestamps */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Created: {new Date(currentScout.createdAt).toLocaleDateString()}</div>
          <div>Last Updated: {new Date(currentScout.lastUpdated).toLocaleDateString()}</div>
          {currentScout.totalPredictions > 0 && (
            <div>Predictions Made: {currentScout.totalPredictions}</div>
          )}
        </div>

        {/* Refresh Button */}
        <Button variant="outline" onClick={refreshScout} className="w-full">
          Refresh Stats
        </Button>
      </CardContent>
    </Card>
  );
};
