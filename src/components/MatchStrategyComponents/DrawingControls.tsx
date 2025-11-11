import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EyeOff, Maximize2 } from "lucide-react";
import { PRESET_COLORS } from "@/constants/drawingColors";

interface DrawingControlsProps {
  isErasing: boolean;
  brushSize: number;
  brushColor: string;
  currentStageId: string;
  isMobile: boolean;
  isFullscreen: boolean;
  canUndo: boolean;
  onToggleErasing: (erasing: boolean) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
  onClearCanvas: () => void;
  onSaveCanvas: () => void;
  onUndo: () => void;
  onToggleFullscreen: () => void;
  onToggleHideControls: () => void;
}

export const DrawingControls = ({
  isErasing,
  brushSize,
  brushColor,
  currentStageId,
  isMobile,
  isFullscreen,
  canUndo,
  onToggleErasing,
  onBrushSizeChange,
  onBrushColorChange,
  onClearCanvas,
  onSaveCanvas,
  onUndo,
  onToggleFullscreen,
  onToggleHideControls
}: DrawingControlsProps) => {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const handleColorChange = (color: string) => {
    onBrushColorChange(color);
    setColorPickerOpen(false);
  };

  if (isFullscreen) {
    // Fullscreen drawing controls
    return (
      <div className="flex-shrink-0 p-2 md:p-4 border-b bg-background relative z-40">
        <div className="flex flex-wrap justify-center items-center gap-2">
          <Button
            variant={!isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(false)}
          >
            Draw
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(true)}
          >
            Erase
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last action"
          >
            Undo
          </Button>
          
          {/* Size selector */}
          <Select 
            value={brushSize.toString()} 
            onValueChange={(value) => onBrushSizeChange(Number(value))}
          >
            <SelectTrigger className="w-fit ">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">Small</SelectItem>
              <SelectItem value="5">Medium</SelectItem>
              <SelectItem value="10">Large</SelectItem>
              <SelectItem value="20">X-Large</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Color selector */}
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-8 h-8 p-0"
                style={{ backgroundColor: brushColor }}
                title="Select color"
                aria-label="Select drawing color"
              >
                <span className="sr-only">Select color</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    className={`w-8 h-8 rounded border-2 cursor-pointer transition-all hover:scale-110 ${
                      brushColor === color.value ? 'border-white ring-2 ring-offset-2 ring-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    aria-label={color.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button onClick={onClearCanvas} variant="outline" size="sm">
            Clear
          </Button>
          <Button onClick={onSaveCanvas} variant="outline" size="sm">
            Save
          </Button>
          
          {/* Hide Controls Button - Only on mobile screens */}
          {isMobile && (
            <Button
              onClick={onToggleHideControls}
              variant="outline"
              size="sm"
              title="Hide controls for more drawing space"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Normal drawing controls
  return (
    <div className="mb-4 flex-shrink-0">
      {/* Mobile: stacked rows, Tablet+: single row with all controls */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        {/* Main actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={!isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(false)}
          >
            Draw
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(true)}
          >
            Erase
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last action"
          >
            Undo
          </Button>
          <Button onClick={onClearCanvas} variant="outline" size="sm">
            Clear
          </Button>
        </div>
        
        {/* Size and color */}
        <div className="flex items-center gap-2">
          {/* Size selector */}
          <Select 
            value={brushSize.toString()} 
            onValueChange={(value) => onBrushSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">Small</SelectItem>
              <SelectItem value="5">Medium</SelectItem>
              <SelectItem value="10">Large</SelectItem>
              <SelectItem value="20">X-Large</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Color selector */}
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-8 h-8 p-0"
                style={{ backgroundColor: brushColor }}
                title="Select color"
                aria-label="Select drawing color"
              >
                <span className="sr-only">Select color</span>
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    className={`w-8 h-8 rounded border-2 cursor-pointer transition-all hover:scale-110 ${
                      brushColor === color.value ? 'border-white ring-2 ring-offset-2 ring-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    aria-label={color.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button onClick={onSaveCanvas} variant="outline" size="sm">
            Save {currentStageId}
          </Button>
          <Button onClick={onToggleFullscreen} variant="outline" size="sm">
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>
    </div>
  );
};
