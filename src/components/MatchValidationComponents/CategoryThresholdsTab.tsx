import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ThresholdInputs } from './ThresholdInputs';
import type { CategoryInfo } from './validationCategories';
import type { ValidationThresholds, DataCategory } from '@/lib/matchValidationTypes';

interface CategoryThresholdsTabProps {
  categories: CategoryInfo[];
  expandedCategories: Set<DataCategory>;
  onToggleCategory: (category: DataCategory) => void;
  getCategoryThresholds: (category: DataCategory) => ValidationThresholds;
  hasCategoryOverride: (category: DataCategory) => boolean;
  onUpdateCategoryThresholds: (category: DataCategory, thresholds: ValidationThresholds | undefined) => void;
}

export const CategoryThresholdsTab: React.FC<CategoryThresholdsTabProps> = ({
  categories,
  expandedCategories,
  onToggleCategory,
  getCategoryThresholds,
  hasCategoryOverride,
  onUpdateCategoryThresholds,
}) => {
  return (
    <div className="space-y-3 mt-4">
      <div className="text-sm text-muted-foreground mb-3">
        Click a category to customize its thresholds. Leave empty to use defaults.
      </div>

      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.key);
        const hasOverride = hasCategoryOverride(cat.key);
        const thresholds = getCategoryThresholds(cat.key);

        return (
          <Card key={cat.key}>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
              onClick={() => onToggleCategory(cat.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{cat.label}</CardTitle>
                    {hasOverride && (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                <div className="space-y-3">
                  <ThresholdInputs
                    thresholds={thresholds}
                    onChange={(newThresholds) => {
                      onUpdateCategoryThresholds(cat.key, newThresholds);
                    }}
                    compact
                  />

                  <div className="flex gap-2 pt-2">
                    {hasOverride ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => onUpdateCategoryThresholds(cat.key, undefined)}
                      >
                        Use Defaults
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Currently using default thresholds
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
