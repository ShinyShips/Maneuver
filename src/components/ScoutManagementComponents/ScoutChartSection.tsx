import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericSelector } from "@/components/ui/generic-selector";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { ScoutChart } from "./ScoutChart";
import { ScoutTable } from "./ScoutTable";
import type { ScoutMetric, ScoutChartData } from '@/hooks/useScoutDashboard';
import type { Scout } from '@/lib/dexieDB';

const iconMap = {
  Trophy,
  Target,
  TrendingUp,
  Award
};

interface ScoutChartSectionProps {
  loading: boolean;
  chartData: ScoutChartData[];
  lineChartData: Array<{ matchNumber: number; [scoutName: string]: number }>;
  scouts: Scout[];
  chartMetric: ScoutMetric;
  setChartMetric: (metric: ScoutMetric) => void;
  chartType: "bar" | "line" | "table";
  setChartType: (type: "bar" | "line" | "table") => void;
  metricOptions: Array<{ key: string; label: string; icon: string }>;
}

export function ScoutChartSection({
  loading,
  chartData,
  lineChartData,
  scouts,
  chartMetric,
  setChartMetric,
  chartType,
  setChartType,
  metricOptions
}: ScoutChartSectionProps) {
  const selectedMetricInfo = metricOptions.find(opt => opt.key === chartMetric);
  const IconComponent = selectedMetricInfo?.icon ? iconMap[selectedMetricInfo.icon as keyof typeof iconMap] : Trophy;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col w-full justify-between md:flex-row items-start md:items-center gap-4">
          <div className="flex flex-col w-full">
            <CardTitle className="flex items-start gap-2 pb-2">
              <IconComponent className="h-5 w-5" />
              Scout {chartType === "table" ? "Statistics" : "Leaderboard"}
            </CardTitle>
            <CardDescription className="px-4">
              {chartType === "table" 
                ? `Detailed scout statistics sorted by ${selectedMetricInfo?.label.toLowerCase()}`
                : `Top performing scouts by ${selectedMetricInfo?.label.toLowerCase()}`
              }
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 w-full">
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap">Metric:</p>
              <GenericSelector
                label="Select Metric"
                value={chartMetric}
                availableOptions={metricOptions.map(opt => opt.key)}
                onValueChange={(value) => setChartMetric(value as ScoutMetric)}
                placeholder="Select metric"
                displayFormat={(key) => metricOptions.find(opt => opt.key === key)?.label || key}
                className="w-auto max-w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap">View:</p>
              <GenericSelector
                label="Select View Type"
                value={chartType}
                availableOptions={["bar", "line", "table"]}
                onValueChange={(value) => setChartType(value as "bar" | "line" | "table")}
                placeholder="Select view type"
                displayFormat={(key) => {
                  switch(key) {
                    case "bar": return "Bar Chart";
                    case "line": return "Line Chart";
                    case "table": return "Table";
                    default: return key;
                  }
                }}
                className="w-auto max-w-32"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading scout data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No scout data available</p>
              <p className="text-sm text-gray-500">Create scouts and make predictions to see the leaderboard</p>
            </div>
          </div>
        ) : (
          <>
            {chartType === "table" ? (
              <ScoutTable 
                chartData={chartData}
                chartMetric={chartMetric}
                selectedMetricLabel={selectedMetricInfo?.label || "Value"}
              />
            ) : (
              <ScoutChart
                chartType={chartType}
                chartData={chartData}
                lineChartData={lineChartData}
                scouts={scouts}
                chartMetric={chartMetric}
                selectedMetricLabel={selectedMetricInfo?.label || "Value"}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
