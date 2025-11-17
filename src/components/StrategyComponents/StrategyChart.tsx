import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericSelector } from "@/components/ui/generic-selector";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ScatterChart, Scatter } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BoxPlot } from "./BoxPlot";

interface ColumnConfig {
  key: string;
  label: string;
  category: string;
  visible: boolean;
  numeric: boolean;
}

interface ChartData {
  team: string;
  value?: number;
  x?: number;
  y?: number;
  autoPoints?: number;
  teleopPoints?: number;
  endgamePoints?: number;
  totalPoints?: number;
  eventName: string;
}

interface StrategyChartProps {
  chartData: ChartData[];
  chartType: "bar" | "scatter" | "box" | "stacked";
  onChartTypeChange: (type: "bar" | "scatter" | "box" | "stacked") => void;
  chartMetric: string;
  onChartMetricChange: (metric: string) => void;
  scatterXMetric: string;
  onScatterXMetricChange: (metric: string) => void;
  scatterYMetric: string;
  onScatterYMetricChange: (metric: string) => void;
  columnConfig: ColumnConfig[];
  chartConfig: {
    value?: { label: string; color: string };
    x?: { label: string; color: string };
    y?: { label: string; color: string };
    autoPoints?: { label: string; color: string };
    teleopPoints?: { label: string; color: string };
    endgamePoints?: { label: string; color: string };
  };
}

export const StrategyChart = ({
  chartData,
  chartType,
  onChartTypeChange,
  chartMetric,
  onChartMetricChange,
  scatterXMetric,
  onScatterXMetricChange,
  scatterYMetric,
  onScatterYMetricChange,
  columnConfig,
  chartConfig,
}: StrategyChartProps) => {
  const handleChartTypeChange = (value: string) => {
    onChartTypeChange(value as "bar" | "scatter" | "box" | "stacked");
  };

  const getChartDescription = () => {
    switch (chartType) {
      case "scatter":
        return "Compare two metrics across all teams";
      case "box":
        return "Performance distribution and consistency analysis (shows min, Q1, median, Q3, max, and outliers)";
      case "stacked":
        return "Points breakdown by game phase (Auto/Teleop/Endgame)";
      default:
        return "Top performing teams by selected metric";
    }
  };

  const getChartDisplayName = (type: string) => {
    switch (type) {
      case "bar":
        return "Bar Chart";
      case "scatter":
        return "Scatter Plot";
      case "box":
        return "Box Plot";
      case "stacked":
        return "Stacked Bar";
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col w-full justify-between md:flex-row items-start md:items-center gap-4">
          <div className="flex flex-col w-full">
            <CardTitle className="flex items-start gap-2 pb-2">
              <BarChart3 className="h-5 w-5" />
              Team Performance Chart
            </CardTitle>
            <CardDescription className="px-4">
              {getChartDescription()}
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 w-full">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-2">
            <p className="whitespace-nowrap">Chart:</p>
              <GenericSelector
                label="Select Chart Type"
                value={chartType}
                availableOptions={["bar", "scatter", "box", "stacked"]}
                onValueChange={handleChartTypeChange}
                placeholder="Chart type"
                displayFormat={getChartDisplayName}
                className="w-auto max-w-32"
              />
            </div>

            {chartType === "scatter" ? (
              <div className="flex gap-2 md:flex-none items-center">
                {/* X-Axis Metric */}
                <p className="whitespace-nowrap">X-Axis:</p>
                <GenericSelector
                  label="Select X-Axis Metric"
                  value={scatterXMetric}
                  availableOptions={columnConfig.filter(col => col.numeric || col.key === 'teamNumber').map(col => col.key)}
                  onValueChange={onScatterXMetricChange}
                  placeholder="X-Axis"
                  displayFormat={(key) => columnConfig.find(col => col.key === key)?.label || key}
                  className="w-auto max-w-40"
                />
                
                {/* Y-Axis Metric */}
                <p className="whitespace-nowrap">Y-Axis:</p>
                <GenericSelector
                  label="Select Y-Axis Metric"
                  value={scatterYMetric}
                  availableOptions={columnConfig.filter(col => col.numeric || col.key === 'teamNumber').map(col => col.key)}
                  onValueChange={onScatterYMetricChange}
                  placeholder="Y-Axis"
                  displayFormat={(key) => columnConfig.find(col => col.key === key)?.label || key}
                  className="w-auto max-w-40"
                />
              </div>
            ) : chartType === "stacked" ? (
              <div className="flex gap-2 md:flex-none items-center">
                <p className="text-sm text-muted-foreground">Points breakdown by game phase</p>
              </div>
            ) : (
              /* Bar Chart and Box Plot Metric */
              <div className="flex gap-2 md:flex-none items-center">
                <p className="whitespace-nowrap">Metric:</p>
                <div className="w-full">
                  <GenericSelector
                    label="Select Metric"
                    value={chartMetric}
                    availableOptions={columnConfig.filter(col => col.numeric || col.key === 'teamNumber').map(col => col.key)}
                    onValueChange={onChartMetricChange}
                  placeholder="Select metric"
                  displayFormat={(key) => columnConfig.find(col => col.key === key)?.label || key}
                  className="w-full md:w-48"
                />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          {chartType === "scatter" ? (
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                dataKey="x"
                name={chartConfig.x?.label || "X"}
                tickLine={false}
                axisLine={false}
                className="text-xs"
                label={{ 
                  value: chartConfig.x?.label || "X", 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle', fontSize: '12px', fill: 'currentColor' }
                }}
              />
              <YAxis 
                type="number"
                dataKey="y"
                name={chartConfig.y?.label || "Y"}
                tickLine={false}
                axisLine={false}
                className="text-xs"
                label={{ 
                  value: chartConfig.y?.label || "Y", 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: 'currentColor' }
                }}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                      <div className="font-medium text-foreground mb-2">
                        Team {data.team}
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {data.eventName}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{chartConfig.x?.label || "X"}:</span>
                          <span className="font-medium">{typeof data.x === 'number' ? data.x.toFixed(1) : data.x}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{chartConfig.y?.label || "Y"}:</span>
                          <span className="font-medium">{typeof data.y === 'number' ? data.y.toFixed(1) : data.y}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter 
                dataKey="y" 
                fill="var(--color-y)"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} />
                ))}
              </Scatter>
            </ScatterChart>
          ) : chartType === "stacked" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="team" 
                tickLine={false}
                axisLine={false}
                className="text-xs"
                angle={-90}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 10 }}
                dx={-3}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                className="text-xs"
                label={{ 
                  value: "Points", 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: 'currentColor' }
                }}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  const calculatedTotal = (data.autoPoints || 0) + (data.teleopPoints || 0) + (data.endgamePoints || 0);
                  
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                      <div className="font-medium text-foreground mb-2">
                        Team {label}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {data.eventName}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Auto Points:</span>
                          <span className="font-medium" style={{color: "var(--color-chart-1)"}}>
                            {data.autoPoints?.toFixed(1) || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Teleop Points:</span>
                          <span className="font-medium" style={{color: "var(--color-chart-2)"}}>
                            {data.teleopPoints?.toFixed(1) || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Endgame Points:</span>
                          <span className="font-medium" style={{color: "var(--color-chart-3)"}}>
                            {data.endgamePoints?.toFixed(1) || 0}
                          </span>
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between items-center font-medium">
                            <span>Total:</span>
                            <span>{calculatedTotal.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
                cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
              />
              <Bar dataKey="autoPoints" stackId="points" fill="var(--color-chart-1)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="teleopPoints" stackId="points" fill="var(--color-chart-2)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="endgamePoints" stackId="points" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "box" ? (
            <BoxPlot
              data={chartData as Array<{ team: string; value: number; eventName: string }>}
              width={480}
              height={256}
              margin={{ top: 20, right: 40, bottom: 60, left: 60 }}
              metricLabel={chartConfig.value?.label || "Value"}
            />
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="team" 
                tickLine={false}
                axisLine={false}
                className="text-xs"
                angle={-90}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 10 }}
                dx={-3}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                className="text-xs"
                label={{ 
                  value: chartConfig.value?.label || "Value", 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: 'currentColor' }
                }}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
                      <div className="font-medium text-foreground mb-2">
                        Team {data.team}
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {data.eventName}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{chartConfig.value?.label || "Value"}:</span>
                        <span className="font-medium">{typeof data.value === 'number' ? data.value.toFixed(1) : data.value}</span>
                      </div>
                    </div>
                  );
                }}
                cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
              />
              <Bar 
                dataKey="value" 
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${210 + index * 15}, 70%, 50%)`} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
