import { Button } from "@/components/ui/button";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface FloatingControlsProps {
  isVisible: boolean;
  isErasing: boolean;
  canUndo: boolean;
  onToggleControls: () => void;
  onStageSwitch: (direction: 'prev' | 'next') => void;
  onToggleErasing: (erasing: boolean) => void;
  onUndo: () => void;
  onClearCanvas: () => void;
}

export const FloatingControls = ({
  isVisible,
  isErasing,
  canUndo,
  onToggleControls,
  onStageSwitch,
  onToggleErasing,
  onUndo,
  onClearCanvas
}: FloatingControlsProps) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-2 right-2 z-10">
      {/* Vertical layout on smaller screens, horizontal on lg+ */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4">
        {/* Show Controls Button */}
        <Button
          onClick={onToggleControls}
          variant="secondary"
          size="sm"
          className="shadow-lg"
          title="Show all controls"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {/* Phase Controls */}
        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStageSwitch('prev')}
            className="shadow-lg bg-background/90 hover:bg-background"
            title="Previous phase"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStageSwitch('next')}
            className="shadow-lg bg-background/90 hover:bg-background"
            title="Next phase"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Drawing Controls */}
        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
          <Button
            variant={!isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(false)}
            className="shadow-lg"
            title="Draw mode"
          >
            Draw
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(true)}
            className="shadow-lg"
            title="Erase mode"
          >
            Erase
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="shadow-lg"
            title="Undo last action"
          >
            Undo
          </Button>
          <Button 
            onClick={onClearCanvas} 
            variant="destructive" 
            size="sm"
            className="shadow-lg"
            title="Clear canvas"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
