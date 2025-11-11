import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Eraser, Undo, Trash2 } from "lucide-react";

// Preset colors - 5 blue-adjacent, 5 red-adjacent, and 5 neutral (3 rows of 5)
const PRESET_COLORS = [
  // Blue-adjacent colors
  { value: '#3b82f6', label: 'Blue' },           // Bright blue
  { value: '#60a5fa', label: 'Light Blue' },     // Lighter blue
  { value: '#1e40af', label: 'Dark Blue' },      // Darker blue
  { value: '#8b5cf6', label: 'Purple' },         // Purple
  { value: '#06b6d4', label: 'Cyan' },           // Cyan
  // Red-adjacent colors
  { value: '#ef4444', label: 'Red' },            // Bright red
  { value: '#f87171', label: 'Light Red' },      // Lighter red
  { value: '#dc2626', label: 'Dark Red' },       // Darker red
  { value: '#f59e0b', label: 'Orange' },         // Orange
  { value: '#eab308', label: 'Yellow' },         // Yellow
  // Neutral and other colors
  { value: '#10b981', label: 'Green' },          // Green
  { value: '#ec4899', label: 'Pink' },           // Pink
  { value: '#000000', label: 'Black' },          // Black
  { value: '#6b7280', label: 'Grey' },           // Grey
  { value: '#ffffff', label: 'White' },          // White
];

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
                {brushSize === 2 ? "S" : brushSize === 5 ? "M" : brushSize === 10 ? "L" : "XL"}
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
              />
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
                  />
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
