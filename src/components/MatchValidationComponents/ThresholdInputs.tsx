import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ValidationThresholds } from '@/lib/matchValidationTypes';

interface ThresholdInputsProps {
  thresholds: ValidationThresholds;
  onChange: (thresholds: ValidationThresholds) => void;
  compact?: boolean;
}

export const ThresholdInputs: React.FC<ThresholdInputsProps> = ({ 
  thresholds, 
  onChange, 
  compact 
}) => {
  const updateThreshold = (key: keyof ValidationThresholds, value: string) => {
    // Convert to number, allowing negative values to be filtered by min attribute
    const numValue = value === '' || value === '-' ? 0 : Number(value);
    onChange({ ...thresholds, [key]: numValue });
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge variant="destructive" className="text-xs px-1">Critical</Badge>
              <span>%</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={thresholds.critical || ''}
              onChange={(e) => updateThreshold('critical', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-0 text-xs px-1">
                Warning
              </Badge>
              <span>%</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={thresholds.warning || ''}
              onChange={(e) => updateThreshold('warning', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1">Minor</Badge>
              <span>%</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={thresholds.minor || ''}
              onChange={(e) => updateThreshold('minor', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge variant="destructive" className="text-xs px-1">Critical</Badge>
              <span>pcs</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={thresholds.criticalAbsolute || ''}
              onChange={(e) => updateThreshold('criticalAbsolute', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-0 text-xs px-1">
                Warning
              </Badge>
              <span>pcs</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={thresholds.warningAbsolute || ''}
              onChange={(e) => updateThreshold('warningAbsolute', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1">Minor</Badge>
              <span>pcs</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={thresholds.minorAbsolute || ''}
              onChange={(e) => updateThreshold('minorAbsolute', e.target.value)}
              className="h-8 text-xs"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">Critical</Badge>
            <span className="text-xs">%</span>
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={thresholds.critical || ''}
            onChange={(e) => updateThreshold('critical', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-0 text-xs">
              Warning
            </Badge>
            <span className="text-xs">%</span>
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={thresholds.warning || ''}
            onChange={(e) => updateThreshold('warning', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Minor</Badge>
            <span className="text-xs">%</span>
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={thresholds.minor || ''}
            onChange={(e) => updateThreshold('minor', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">Critical</Badge>
            <span className="text-xs">pcs</span>
          </Label>
          <Input
            type="number"
            min="0"
            value={thresholds.criticalAbsolute || ''}
            onChange={(e) => updateThreshold('criticalAbsolute', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-0 text-xs">
              Warning
            </Badge>
            <span className="text-xs">pcs</span>
          </Label>
          <Input
            type="number"
            min="0"
            value={thresholds.warningAbsolute || ''}
            onChange={(e) => updateThreshold('warningAbsolute', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Minor</Badge>
            <span className="text-xs">pcs</span>
          </Label>
          <Input
            type="number"
            min="0"
            value={thresholds.minorAbsolute || ''}
            onChange={(e) => updateThreshold('minorAbsolute', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};
