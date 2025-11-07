import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import type { ValidationStatus } from '@/lib/matchValidationTypes';

export interface MatchFilters {
  status: ValidationStatus | 'all';
  matchType: 'all' | 'qm' | 'sf' | 'f';
  searchQuery: string;
  sortBy: 'match' | 'status' | 'discrepancies' | 'confidence';
  sortOrder: 'asc' | 'desc';
}

interface MatchListFiltersProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  matchCount: number;
  filteredCount: number;
}

export const MatchListFilters: React.FC<MatchListFiltersProps> = ({
  filters,
  onFiltersChange,
  matchCount,
  filteredCount,
}) => {
  const updateFilter = <K extends keyof MatchFilters>(
    key: K,
    value: MatchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters & Sorting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search - Full width */}
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Label>
            <Input
              id="search"
              placeholder="Match number or team..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="w-full"
            />
          </div>

          {/* All Selectors in 2x2 Grid on Mobile, Single Row on Large Screens */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:max-w-5xl">
            {/* Match Type */}
            <div className="space-y-2">
              <Label htmlFor="matchType" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Match Type
              </Label>
              <Select
                value={filters.matchType}
                onValueChange={(value) => updateFilter('matchType', value as MatchFilters['matchType'])}
              >
                <SelectTrigger id="matchType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="qm">Qualifications</SelectItem>
                  <SelectItem value="sf">Eliminations</SelectItem>
                  <SelectItem value="f">Finals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter('status', value as MatchFilters['status'])}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passed">✓ Passed</SelectItem>
                  <SelectItem value="flagged">⚠ Flagged</SelectItem>
                  <SelectItem value="failed">✗ Failed</SelectItem>
                  <SelectItem value="pending">⏱ Pending</SelectItem>
                  <SelectItem value="no-tba-data">📭 No TBA Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sortBy" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort By
              </Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value as MatchFilters['sortBy'])}
              >
                <SelectTrigger id="sortBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Match Number</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="discrepancies">Discrepancies</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Order</Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => updateFilter('sortOrder', value as 'asc' | 'desc')}
              >
                <SelectTrigger id="sortOrder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground pt-2 border-t">
            {filteredCount === matchCount ? (
              <span>Showing all {matchCount} matches</span>
            ) : (
              <span>
                Showing {filteredCount} of {matchCount} matches
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
