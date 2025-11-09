import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';

interface BoxPlotData {
  team: string;
  value: number;
  eventName: string;
}

interface BoxPlotProps {
  data: BoxPlotData[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  metricLabel: string;
}

interface SummaryStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

// Calculate summary statistics for box plot
const getSummaryStats = (values: number[]): SummaryStats | null => {
  if (values.length === 0) return null;
  
  const sortedData = values.sort((a, b) => a - b);
  
  const q1 = d3.quantile(sortedData, 0.25);
  const median = d3.quantile(sortedData, 0.5);
  const q3 = d3.quantile(sortedData, 0.75);
  
  if (!q1 || !median || !q3) return null;
  
  const iqr = q3 - q1;
  const minThreshold = q1 - 1.5 * iqr;
  const maxThreshold = q3 + 1.5 * iqr;
  
  // Find min and max within 1.5 * IQR
  const min = Math.max(minThreshold, Math.min(...sortedData));
  const max = Math.min(maxThreshold, Math.max(...sortedData));
  
  // Find outliers
  const outliers = sortedData.filter(d => d < minThreshold || d > maxThreshold);
  
  return { min, q1, median, q3, max, outliers };
};

// Box component for rendering individual boxes
const Box: React.FC<{
  x: number;
  width: number;
  stats: SummaryStats;
  yScale: d3.ScaleLinear<number, number>;
  color: string;
  team: string;
  onHover?: (team: string, event: React.MouseEvent) => void;
  onLeave?: () => void;
}> = ({ x, width, stats, yScale, color, team, onHover, onLeave }) => {
  const boxWidth = width * 0.8;
  const boxX = x - boxWidth / 2;
  
  const handleMouseEnter = (event: React.MouseEvent) => {
    if (onHover) {
      onHover(team, event);
    }
  };
  
  const handleMouseLeave = () => {
    if (onLeave) {
      onLeave();
    }
  };
  
  return (
    <g>
      {/* Invisible hover target */}
      <rect
        x={boxX - 10}
        y={yScale(stats.max) - 10}
        width={boxWidth + 20}
        height={yScale(stats.min) - yScale(stats.max) + 20}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {/* Whiskers */}
      <line
        x1={x}
        x2={x}
        y1={yScale(stats.min)}
        y2={yScale(stats.q1)}
        stroke={color}
        strokeWidth={1.5}
      />
      <line
        x1={x}
        x2={x}
        y1={yScale(stats.q3)}
        y2={yScale(stats.max)}
        stroke={color}
        strokeWidth={1.5}
      />
      
      {/* Whisker caps */}
      <line
        x1={x - boxWidth / 4}
        x2={x + boxWidth / 4}
        y1={yScale(stats.min)}
        y2={yScale(stats.min)}
        stroke={color}
        strokeWidth={1.5}
      />
      <line
        x1={x - boxWidth / 4}
        x2={x + boxWidth / 4}
        y1={yScale(stats.max)}
        y2={yScale(stats.max)}
        stroke={color}
        strokeWidth={1.5}
      />
      
      {/* Box */}
      <rect
        x={boxX}
        y={yScale(stats.q3)}
        width={boxWidth}
        height={yScale(stats.q1) - yScale(stats.q3)}
        fill={color}
        fillOpacity={0.8}
        stroke={color}
        strokeWidth={1.5}
        rx={2}
      />
      
      {/* Median line */}
      <line
        x1={boxX}
        x2={boxX + boxWidth}
        y1={yScale(stats.median)}
        y2={yScale(stats.median)}
        stroke="currentColor"
        strokeWidth={2.5}
      />
      
      {/* Outliers */}
      {stats.outliers.map((outlier, i) => (
        <circle
          key={i}
          cx={x}
          cy={yScale(outlier)}
          r={2.5}
          fill={color}
          stroke="white"
          strokeWidth={1}
          opacity={0.9}
          style={{
            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))'
          }}
        />
      ))}
    </g>
  );
};

export const BoxPlot: React.FC<BoxPlotProps> = ({ 
  data, 
  width, 
  height, 
  margin,
  metricLabel 
}) => {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  const boundsWidth = width - margin.left - margin.right;
  const boundsHeight = height - margin.top - margin.bottom;
  
  const handleHover = (team: string, event: React.MouseEvent) => {
    setHoveredTeam(team);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleLeave = () => {
    setHoveredTeam(null);
    setMousePosition(null);
  };

  // Group data by team and calculate summary stats
  const processedData = useMemo(() => {
    const grouped = d3.group(data, (d: BoxPlotData) => d.team);
    const results: Array<{ team: string; stats: SummaryStats; sampleSize: number }> = [];
    
    grouped.forEach((values: BoxPlotData[], team: string) => {
      const numbers = values.map((d: BoxPlotData) => d.value);
      const stats = getSummaryStats(numbers);
      if (stats) {
        results.push({ team, stats, sampleSize: numbers.length });
      }
    });
    
    // Sort by median descending
    return results.sort((a, b) => b.stats.median - a.stats.median);
  }, [data]);
  
  // Scales
  const xScale = useMemo(() => {
    return d3.scaleBand()
      .domain(processedData.map(d => d.team))
      .range([0, boundsWidth])
      .padding(0.2);
  }, [processedData, boundsWidth]);
  
  const yScale = useMemo(() => {
    const allValues = data.map(d => d.value);
    const extent = d3.extent(allValues) as [number, number];
    return d3.scaleLinear()
      .domain(extent)
      .range([boundsHeight, 0])
      .nice();
  }, [data, boundsHeight]);
  
  // Generate colors for each team using CSS custom properties like other charts
  const colorScale = useMemo(() => {
    const colors = [
      'var(--color-chart-1)',
      'var(--color-chart-2)', 
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
      'var(--color-chart-1)', // Cycle back for more teams
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
    ];
    
    return d3.scaleOrdinal()
      .domain(processedData.map(d => d.team))
      .range(colors);
  }, [processedData]);
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="text-foreground">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis */}
          <g>
            {yScale.ticks().map((tick: number) => (
              <g key={tick}>
                <line
                  x1={0}
                  x2={boundsWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke="currentColor"
                  strokeDasharray="3,3"
                  className="text-border"
                />
                <text
                  x={-10}
                  y={yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {tick}
                </text>
              </g>
            ))}
            {/* Y-axis line */}
            <line
              x1={0}
              x2={0}
              y1={0}
              y2={boundsHeight}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
            {/* Y-axis label */}
            <text
              x={-40}
              y={boundsHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="currentColor"
              className="text-foreground"
              transform={`rotate(-90, ${-40}, ${boundsHeight / 2})`}
            >
              {metricLabel}
            </text>
          </g>
          
          {/* X-axis */}
          <g transform={`translate(0, ${boundsHeight})`}>
            {processedData.map(({ team }) => {
              const x = (xScale(team) || 0) + (xScale.bandwidth() / 2);
              return (
                <text
                  key={team}
                  x={x}
                  y={16}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="text-foreground"
                  transform={`rotate(-90, ${x}, 16)`}
                >
                  {team}
                </text>
              );
            })}
            {/* X-axis line */}
            <line
              x1={0}
              x2={boundsWidth}
              y1={0}
              y2={0}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
            {/* X-axis label */}
            <text
              x={boundsWidth / 2}
              y={50}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="currentColor"
              className="text-foreground"
            >
              Team
            </text>
          </g>
          
          {/* Box plots */}
          {processedData.map(({ team, stats }) => {
            const x = (xScale(team) || 0) + (xScale.bandwidth() / 2);
            return (
              <Box
                key={team}
                x={x}
                width={xScale.bandwidth()}
                stats={stats}
                yScale={yScale}
                color={colorScale(team) as string}
                team={team}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            );
          })}
        </g>
      </svg>
      
      {/* Tooltip */}
      {hoveredTeam && mousePosition && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px] pointer-events-none"
          style={{
            left: (mousePosition?.x || 0) + 10,
            top: (mousePosition?.y || 0) - 10,
          }}
        >
          {(() => {
            const teamData = processedData.find(d => d.team === hoveredTeam);
            if (!teamData) return null;
            
            const { stats, sampleSize } = teamData;
            
            return (
              <>
                <div className="font-medium text-foreground mb-2">
                  Team {hoveredTeam}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {metricLabel} Distribution ({sampleSize} matches)
                  <br />
                  <span className="text-xs opacity-75">Full statistical breakdown</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="font-medium">{stats.min.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Q1:</span>
                    <span className="font-medium">{stats.q1.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Median:</span>
                    <span className="font-medium text-primary">{stats.median.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Q3:</span>
                    <span className="font-medium">{stats.q3.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="font-medium">{stats.max.toFixed(1)}</span>
                  </div>
                  {stats.outliers.length > 0 && (
                    <div className="flex justify-between items-center border-t pt-1 mt-1">
                      <span className="text-muted-foreground">Outliers:</span>
                      <span className="font-medium text-orange-600">{stats.outliers.length}</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
