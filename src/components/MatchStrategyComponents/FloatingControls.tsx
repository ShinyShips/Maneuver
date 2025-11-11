import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Eraser, Undo, Trash2 } from "lucide-react";
import { PRESET_COLORS } from "@/constants/drawingColors";

interface FloatingControlsProps {
  isVisible: boolean;
  isErasing: boolean;
  brushSize: number;
  brushColor: string;
  canUndo: boolean;
  onToggleErasing: (erasing: boolean) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
  onUndo: () => void;
  onClearCanvas: () => void;
}

// Brush size to label mapping for cleaner display
const BRUSH_SIZE_LABELS: Record<number, string> = {
  2: 'S',
  5: 'M',
  10: 'L',
  20: 'XL'
};

export const FloatingControls = ({
  isVisible,
  isErasing,
  brushSize,
  brushColor,
  canUndo,
  onToggleErasing,
  onBrushSizeChange,
  onBrushColorChange,
  onUndo,
  onClearCanvas
}: FloatingControlsProps) => {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const handleColorChange = (color: string) => {
    onBrushColorChange(color);
    setColorPickerOpen(false);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-2 right-2 z-10">
      {/* Vertical layout on smaller screens, horizontal on lg+ */}
      <div className="flex flex-col gap-1">
        {/* Drawing Controls */}
        <div className="flex flex-col gap-1">
          <Button
            variant={!isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(false)}
            className="shadow-lg h-10 w-16 p-0"
            title="Draw mode"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleErasing(true)}
            className="shadow-lg h-10 w-16 p-0"
            title="Erase mode"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="shadow-lg h-10 w-16 p-0"
            title="Undo last action"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          {/* Size selector */}
          <Select 
            value={brushSize.toString()} 
            onValueChange={(value) => onBrushSizeChange(Number(value))}
          >
            <SelectTrigger className="w-16 h-10 shadow-lg">
              <SelectValue placeholder="Size">
                {BRUSH_SIZE_LABELS[brushSize] || 'M'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">S</SelectItem>
              <SelectItem value="5">M</SelectItem>
              <SelectItem value="10">L</SelectItem>
              <SelectItem value="20">XL</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Color selector */}
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-16 p-0 shadow-lg"
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
                    className={`w-8 h-8 rounded border-2 cursor-pointer transition-all hover:scale-110 relative ${
                      brushColor === color.value ? 'border-black ring-2 ring-offset-2 ring-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    aria-label={color.label}
                  >
                    {brushColor === color.value && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-black drop-shadow"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={onClearCanvas} 
            variant="destructive" 
            size="sm"
            className="shadow-lg h-10 w-16 p-0"
            title="Clear canvas"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
