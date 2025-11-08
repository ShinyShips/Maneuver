import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { ThresholdInputs } from './ThresholdInputs';
import { CategoryThresholdsTab } from './CategoryThresholdsTab';
import { CATEGORIES } from './validationCategories';
import type { ValidationConfig, ValidationThresholds, DataCategory } from '@/lib/matchValidationTypes';
import { DEFAULT_VALIDATION_CONFIG } from '@/lib/matchValidationTypes';

interface ValidationSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: ValidationConfig;
  onSave: (config: ValidationConfig) => void;
}

export const ValidationSettingsSheet: React.FC<ValidationSettingsSheetProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [config, setConfig] = useState<ValidationConfig>(currentConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<DataCategory>>(new Set());

  // Update local state when currentConfig changes
  useEffect(() => {
    setConfig(currentConfig);
    setHasChanges(false);
  }, [currentConfig, isOpen]);

  const updateDefaultThresholds = (thresholds: ValidationThresholds) => {
    setConfig(prev => ({ ...prev, thresholds }));
    setHasChanges(true);
  };

  const updateCategoryThresholds = (category: DataCategory, thresholds: ValidationThresholds | undefined) => {
    setConfig(prev => ({
      ...prev,
      categoryThresholds: {
        ...prev.categoryThresholds,
        [category]: thresholds
      }
    }));
    setHasChanges(true);
  };

  const toggleCategory = (category: DataCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryThresholds = (category: DataCategory): ValidationThresholds => {
    return config.categoryThresholds?.[category] || config.thresholds;
  };

  const hasCategoryOverride = (category: DataCategory): boolean => {
    return !!config.categoryThresholds?.[category];
  };

  const handleSave = () => {
    onSave(config);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_VALIDATION_CONFIG);
    setHasChanges(true);
  };

  const handleCancel = () => {
    setConfig(currentConfig);
    setHasChanges(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto p-4 flex flex-col"
      >
        <SheetHeader className="pt-4 px-0 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Validation Settings
          </SheetTitle>
          <SheetDescription>
            Customize thresholds globally or per-category. Category overrides take precedence over defaults.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="default" className="mt-6 flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="default">Default Thresholds</TabsTrigger>
            <TabsTrigger value="categories">Per-Category</TabsTrigger>
          </TabsList>

          <TabsContent value="default" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Global Defaults</CardTitle>
                <p className="text-sm text-muted-foreground">
                  These thresholds apply to all categories unless overridden
                </p>
              </CardHeader>
              <CardContent>
                <ThresholdInputs
                  thresholds={config.thresholds}
                  onChange={updateDefaultThresholds}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p><strong>Absolute thresholds checked first:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>If difference ≥ critical absolute → Critical</li>
                  <li>If difference ≥ warning absolute → Warning</li>
                  <li>If difference &lt; warning absolute → Check percentage</li>
                </ul>
                <p className="mt-2"><strong>Prevents false positives:</strong></p>
                <p className="ml-2">Small counts like "0 vs 1" won't be critical despite 100% difference</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-3 mt-4">
            <CategoryThresholdsTab
              categories={CATEGORIES}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
              getCategoryThresholds={getCategoryThresholds}
              hasCategoryOverride={hasCategoryOverride}
              onUpdateCategoryThresholds={updateCategoryThresholds}
            />
          </TabsContent>
        </Tabs>

        <SheetFooter className="gap-2 pb-4 pt-6 px-0">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
