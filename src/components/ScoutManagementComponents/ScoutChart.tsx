import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LineChart, Line, Legend } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { calculateAccuracy } from '@/lib/scoutGameUtils';
import type { ScoutChartData, ScoutMetric } from '@/hooks/useScoutDashboard';
import type { Scout } from '@/lib/dexieDB';

interface ScoutChartProps {
  chartType: "bar" | "line";
  chartData: ScoutChartData[];
  lineChartData: Array<{ matchNumber: number; [scoutName: string]: number }>;
  scouts: Scout[];
  chartMetric: ScoutMetric;
  selectedMetricLabel: string;
}

export function ScoutChart({ 
  chartType, 
  chartData, 
  lineChartData, 
  scouts, 
  chartMetric, 
  selectedMetricLabel 
}: ScoutChartProps) {
  const chartConfig = {
    value: {
      label: selectedMetricLabel,
      color: "hsl(210, 70%, 50%)",
    },
  };

  if (chartType === "bar") {
    return (
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as ScoutChartData;
                const scout = data.scout;
                const accuracy = calculateAccuracy(scout);
                
                return (
                  <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                    <p className="font-semibold">{scout.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMetricLabel}: {data.value}{chartMetric === "accuracy" ? "%" : ""}
                    </p>
                    <div className="mt-2 text-xs space-y-1">
                      <p>Stakes: {scout.stakes}</p>
                      <p>Predictions: {scout.totalPredictions}</p>
                      <p>Accuracy: {accuracy}%</p>
                      <p>Current Streak: {scout.currentStreak}</p>
                      <p>Best Streak: {scout.longestStreak}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`hsl(${210 + index * 15}, 70%, 50%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
      <LineChart data={lineChartData} margin={{ top: 50, right: 30, left: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="matchNumber" 
          tick={{ fontSize: 12 }}
          label={{ value: 'Match Number', position: 'insideBottom', offset: -5 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <ChartTooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                  <p className="font-semibold">Match {label}</p>
                  {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                      {entry.dataKey}: {entry.value}{chartMetric === "accuracy" ? "%" : ""}
                    </p>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="top" 
          height={36}
          wrapperStyle={{ paddingBottom: '10px' }}
        />
        {scouts.slice(0, 6).map((scout, index) => (
          <Line 
            key={scout.name}
            type="monotone" 
            dataKey={scout.name} 
            stroke={`hsl(${210 + index * 50}, 70%, 50%)`}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
