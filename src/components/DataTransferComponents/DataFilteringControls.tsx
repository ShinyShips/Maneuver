/**
 * Data Filtering Components
 * UI components for filtering large scouting datasets before QR generation
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  QrCode
} from "lucide-react";
import {
  type DataFilters,
  type FilteredDataStats,
  extractTeamNumbers,
  extractMatchRange,
  calculateFilterStats,
  validateFilters,
  getLastExportedMatch
} from "@/lib/dataFiltering";
import type { ScoutingDataCollection } from "@/lib/scoutingTypes";

interface DataFilteringControlsProps {
  data: ScoutingDataCollection;
  filters: DataFilters;
  onFiltersChange: (filters: DataFilters) => void;
  onApplyFilters: () => void;
  useCompression?: boolean;
  filteredData?: ScoutingDataCollection | null;
}

export const DataFilteringControls: React.FC<DataFilteringControlsProps> = ({
  data,
  filters,
  onFiltersChange,
  onApplyFilters,
  useCompression = true,
  filteredData
}) => {
  const teams = extractTeamNumbers(data);
  const matchRange = extractMatchRange(data);
  // Use filtered data if available, otherwise use original data
  const currentData = filteredData || data;
  const currentMatchRange = extractMatchRange(currentData);
  const stats = calculateFilterStats(data, currentData, useCompression);
  const filterValidation = validateFilters(filters);

  const handleMatchRangeChange = (type: 'preset' | 'custom', value?: string) => {
    const newFilters = { ...filters };
    newFilters.matchRange.type = type;
    
    if (type === 'preset') {
      newFilters.matchRange.preset = value as 'last10' | 'last15' | 'last30' | 'all' | 'fromLastExport';
      // Clear custom values when switching to preset
      delete newFilters.matchRange.customStart;
      delete newFilters.matchRange.customEnd;
    }
    
    onFiltersChange(newFilters);
  };

  const handleCustomRangeChange = (field: 'start' | 'end', value: string) => {
    const newFilters = { ...filters };
    const numValue = parseInt(value) || undefined;
    
    if (field === 'start') {
      newFilters.matchRange.customStart = numValue;
    } else {
      newFilters.matchRange.customEnd = numValue;
    }
    
    onFiltersChange(newFilters);
  };

  const handleTeamSelectionChange = (teamNumber: string, selected: boolean) => {
    const newFilters = { ...filters };
    
    if (selected) {
      newFilters.teams.selectedTeams = [...newFilters.teams.selectedTeams, teamNumber];
    } else {
      newFilters.teams.selectedTeams = newFilters.teams.selectedTeams.filter(t => t !== teamNumber);
    }
    
    // Update includeAll flag
    newFilters.teams.includeAll = newFilters.teams.selectedTeams.length === 0;
    
    onFiltersChange(newFilters);
  };

  const handleSelectAllTeams = (selectAll: boolean) => {
    const newFilters = { ...filters };
    
    if (selectAll) {
      newFilters.teams.selectedTeams = [];
      newFilters.teams.includeAll = true;
    } else {
      newFilters.teams.selectedTeams = teams.slice(0, 5); // Select first 5 as example
      newFilters.teams.includeAll = false;
    }
    
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-2">
        <Label className="flex flex-col text-base font-medium items-start">Match Range Filter</Label>

        {/* Match Range Filtering */}
        <div className="space-y-2">
            {/* Current Data Stats */}
            <Label className="flex flex-col text-green-400 text-sm items-start gap-0">
                Current dataset: ~{stats.estimatedQRCodes} QR codes from {currentData.entries.length} entries
                {filteredData && (
                  <span className="text-muted-foreground"> Original: {data.entries.length} entries</span>
                )}
            </Label>
          <div className="space-y-2">
            <Label className="flex flex-col text-green-400 text-sm items-start gap-0">
              Data range: Match {currentMatchRange.min} - {currentMatchRange.max} ({currentData.entries.length} entries)
              {filteredData && (
                <span className="text-muted-foreground">Original: Match {matchRange.min} - {matchRange.max}</span>
              )}
            </Label>
            
            <Select 
              value={filters.matchRange.type === 'preset' ? filters.matchRange.preset : 'custom'} 
              onValueChange={(value) => {
                if (value === 'custom') {
                  handleMatchRangeChange('custom');
                } else {
                  handleMatchRangeChange('preset', value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select match range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All matches</SelectItem>
                <SelectItem value="last10">Last 10 matches</SelectItem>
                <SelectItem value="last15">Last 15 matches</SelectItem>
                <SelectItem value="last30">Last 30 matches</SelectItem>
                <SelectItem value="fromLastExport">From last exported match</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            {filters.matchRange.type === 'preset' && filters.matchRange.preset === 'fromLastExport' && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const lastExported = getLastExportedMatch();
                  return lastExported 
                    ? `Will include matches from ${lastExported + 1} onwards (last export: match ${lastExported})`
                    : 'No previous export found - will include all matches';
                })()}
              </div>
            )}
            
            {filters.matchRange.type === 'custom' && (
              <div className="flex gap-2 items-center">
                <Label className="text-sm">From:</Label>
                <Input
                  type="number"
                  min={matchRange.min}
                  max={matchRange.max}
                  value={filters.matchRange.customStart || ''}
                  onChange={(e) => handleCustomRangeChange('start', e.target.value)}
                  placeholder={matchRange.min.toString()}
                  className="w-20"
                />
                <Label className="text-sm">To:</Label>
                <Input
                  type="number"
                  min={matchRange.min}
                  max={matchRange.max}
                  value={filters.matchRange.customEnd || ''}
                  onChange={(e) => handleCustomRangeChange('end', e.target.value)}
                  placeholder={matchRange.max.toString()}
                  className="w-20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Team Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Team Filter</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="select-all-teams"
              checked={filters.teams.includeAll}
              onCheckedChange={handleSelectAllTeams}
            />
            <Label htmlFor="select-all-teams" className="text-sm">
              Include all teams ({teams.length} teams)
            </Label>
          </div>
          
          {!filters.teams.includeAll && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Select specific teams ({filters.teams.selectedTeams.length} selected):
              </Label>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {teams.map(team => (
                  <div key={team} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team}`}
                      checked={filters.teams.selectedTeams.includes(team)}
                      onCheckedChange={(checked) => 
                        handleTeamSelectionChange(team, checked as boolean)
                      }
                    />
                    <Label htmlFor={`team-${team}`} className="text-sm">
                      {team}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Validation */}
        {!filterValidation.valid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Invalid Filter Configuration</AlertTitle>
            <AlertDescription>{filterValidation.error}</AlertDescription>
          </Alert>
        )}

        {/* Apply Filters Button */}
        <Button 
          onClick={onApplyFilters}
          disabled={!filterValidation.valid}
          className="w-full mt-4"
        >
          {filteredData ? 'Update Filter' : 'Apply Filters'}
        </Button>
    </div>
  );
};

interface FilteredDataStatsProps {
  stats: FilteredDataStats;
  originalCount: number;
}

export const FilteredDataStatsDisplay: React.FC<FilteredDataStatsProps> = ({ 
  stats, 
  originalCount 
}) => {
  const getWarningIcon = () => {
    switch (stats.warningLevel) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'danger':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getWarningMessage = () => {
    switch (stats.warningLevel) {
      case 'safe':
        return 'Excellent for real-time scanning';
      case 'warning':
        return 'Manageable but consider additional filtering';
      case 'danger':
        return 'Too many codes for practical real-time scanning';
    }
  };

  const getWarningVariant = (): "default" | "destructive" => {
    switch (stats.warningLevel) {
      case 'safe':
        return 'default';
      case 'warning':
        return 'default'; // Use default instead of secondary for Alert component
      case 'danger':
        return 'destructive';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Filtered Data Preview
          </span>
          {getWarningIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Data Reduction Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.filteredEntries}</div>
            <div className="text-sm text-muted-foreground">
              Entries (from {originalCount})
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.estimatedQRCodes}</div>
            <div className="text-sm text-muted-foreground">
              QR Codes
            </div>
          </div>
        </div>

        {/* Scan Time Estimate */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            Estimated scan time: {stats.scanTimeEstimate}
          </span>
        </div>

        {/* Compression Info */}
        {stats.compressionReduction && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              🗜️ {stats.compressionReduction}
            </Badge>
          </div>
        )}

        {/* Warning Message */}
        <Alert variant={getWarningVariant()}>
          {getWarningIcon()}
          <AlertTitle>
            {stats.warningLevel === 'safe' && 'Ready for Transfer'}
            {stats.warningLevel === 'warning' && 'Caution Recommended'}
            {stats.warningLevel === 'danger' && 'Additional Filtering Recommended'}
          </AlertTitle>
          <AlertDescription>
            {getWarningMessage()}
            {stats.warningLevel === 'danger' && (
              <div className="mt-2 text-sm">
                Consider selecting specific teams or using "Last 15 matches" to reduce the QR code count.
              </div>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
