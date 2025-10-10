import React from 'react';
import { ScoutProfileWithSelector } from '../components/GameComponents/ScoutProfileWithSelector';
import { AchievementOverview } from '../components/ScoutManagementComponents/AchievementOverview';
import { ScoutChartSection } from '../components/ScoutManagementComponents/ScoutChartSection';
import { ScoutStatsSummary } from '../components/ScoutManagementComponents/ScoutStatsSummary';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useCurrentScout } from '@/hooks/useCurrentScout';
import { useNavigate } from 'react-router-dom';
import { useScoutDashboard } from '@/hooks/useScoutDashboard';

const ScoutManagementDashboardPage: React.FC = () => {
  const { currentScout } = useCurrentScout();
  const navigate = useNavigate();
  
  const {
    scouts,
    loading,
    chartMetric,
    setChartMetric,
    chartType,
    setChartType,
    metricOptions,
    chartData,
    lineChartData,
    loadScoutData
  } = useScoutDashboard();

  return (
    <div className="min-h-screen container mx-auto p-4 space-y-6">
      <div className="text-start space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Scout Management Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor scout performance and leaderboards
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <ScoutChartSection
        loading={loading}
        chartData={chartData}
        lineChartData={lineChartData}
        scouts={scouts}
        chartMetric={chartMetric}
        setChartMetric={setChartMetric}
        chartType={chartType}
        setChartType={setChartType}
        metricOptions={metricOptions}
      />

      {/* Profile and Stats Section - Combined on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Profile Section - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 flex justify-center lg:justify-start">
          <ScoutProfileWithSelector />
        </div>

        {/* Achievement Overview - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          {currentScout ? (
            <AchievementOverview 
              scoutName={currentScout.name} 
              onViewAll={() => navigate('/achievements')}
              onDataRefresh={loadScoutData}
            />
          ) : (
            <Card className='h-full'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a scout to view achievements</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Summary - Takes 3 columns on large screens, stacked on smaller */}
        <ScoutStatsSummary scouts={scouts} />
      </div>
    </div>
  );
};

export default ScoutManagementDashboardPage;
