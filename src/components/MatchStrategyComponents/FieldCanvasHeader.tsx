import { Button } from "@/components/ui/button";
import { Minimize2, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

interface Stage {
  id: string;
  label: string;
}

interface FieldCanvasHeaderProps {
  currentStage: Stage;
  hideControls: boolean;
  isMobile: boolean;
  matchNumber?: string;
  onStageSwitch: (direction: 'prev' | 'next') => void;
  onToggleFullscreen: () => void;
  onToggleHideControls: () => void;
}

export const FieldCanvasHeader = ({
  currentStage,
  hideControls,
  isMobile,
  matchNumber,
  onStageSwitch,
  onToggleFullscreen,
  onToggleHideControls
}: FieldCanvasHeaderProps) => {
  return (
    <div className="flex-shrink-0 p-2 md:p-4 border-b bg-background relative z-50">
      <div className="grid grid-cols-3 items-center gap-2">
        {/* Left side - Title */}
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg md:text-xl font-bold truncate">
            {matchNumber ? `Match ${matchNumber}` : 'Field Strategy'}
          </h2>
        </div>
        
        {/* Center - Phase controls and current stage - always visible */}
        <div className="flex items-center justify-center gap-2">
          {/* Phase navigation buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStageSwitch('prev')}
            className="h-8 w-8 p-0"
            title="Previous phase"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
            {currentStage?.label}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStageSwitch('next')}
            className="h-8 w-8 p-0"
            title="Next phase"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Right side - Controls */}
        <div className="flex items-center justify-end gap-2">
          {/* Show/Hide controls button - only on mobile when controls are hidden */}
          {isMobile && hideControls && (
            <Button
              onClick={onToggleHideControls}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title={hideControls ? "Show controls" : "Hide controls"}
            >
              {hideControls ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Exit fullscreen button */}
          <Button onClick={onToggleFullscreen} variant="outline" size="sm">
            <Minimize2 className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
