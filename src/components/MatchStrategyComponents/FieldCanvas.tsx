import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { useCanvasSetup } from "@/hooks/useCanvasSetup";
import { FieldCanvasHeader } from "./FieldCanvasHeader";
import { MobileStageControls } from "./MobileStageControls";
import { DrawingControls } from "./DrawingControls";
import { FloatingControls } from "./FloatingControls";

interface FieldCanvasProps {
  stageId?: string;
  onStageChange?: (newStageId: string) => void;
  selectedTeams?: string[];
}

const FieldCanvas = ({ stageId = "default", onStageChange, selectedTeams = [] }: FieldCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const { isFullscreen, setIsFullscreen } = useFullscreen();
  const [currentStageId, setCurrentStageId] = useState(stageId);
  const [hideControls, setHideControls] = useState(false);
  const isMobile = useIsMobile();

  // Available stages for switching
  const stages = useMemo(() => [
    { id: 'autonomous', label: 'Autonomous' },
    { id: 'teleop', label: 'Teleop' },
    { id: 'endgame', label: 'Endgame' }
  ], []);

  const currentStageIndex = stages.findIndex(stage => stage.id === currentStageId);
  const currentStage = stages[currentStageIndex];

  // Update internal stage when prop changes (but only if not in fullscreen)
  useEffect(() => {
    if (!isFullscreen) {
      setCurrentStageId(stageId);
    }
  }, [stageId, isFullscreen]);

  // Save canvas function
  const saveCanvas = useCallback((showAlert = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');
    
    if (showAlert) {
      // Manual save - download file
      const link = document.createElement('a');
      link.download = `field-strategy-${currentStageId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataURL;
      link.click();
    }

    // Auto-save to localStorage
    localStorage.setItem(`fieldStrategy_${currentStageId}`, dataURL);
  }, [currentStageId]);

  // Canvas drawing hook
  const { canvasStyle, canvasEventHandlers, undo, canUndo, initializeHistory } = useCanvasDrawing({
    canvasRef,
    brushSize,
    brushColor,
    isErasing,
    onSave: () => saveCanvas(false)
  });

  // Canvas setup hook
  const { clearCanvas } = useCanvasSetup({
    currentStageId,
    isFullscreen,
    hideControls,
    isMobile,
    canvasRef,
    containerRef,
    fullscreenRef,
    selectedTeams,
    onCanvasReady: initializeHistory
  });

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsFullscreen(false);
      document.body.style.overflow = 'auto';
      // When exiting fullscreen, sync with parent component
      if (onStageChange && currentStageId !== stageId) {
        onStageChange(currentStageId);
      }
    }
  }, [isFullscreen, setIsFullscreen, onStageChange, currentStageId, stageId]);

  // Handle stage switching
  const switchStage = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = stages.findIndex(stage => stage.id === currentStageId);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : stages.length - 1;
    } else {
      newIndex = currentIndex < stages.length - 1 ? currentIndex + 1 : 0;
    }
    
    const newStageId = stages[newIndex].id;
    
    // Save current canvas before switching
    saveCanvas(false);
    
    // Update internal stage ID
    setCurrentStageId(newStageId);
    
    // If not in fullscreen, also update parent
    if (!isFullscreen && onStageChange) {
      onStageChange(newStageId);
    }
  }, [currentStageId, isFullscreen, onStageChange, stages, saveCanvas]);

  // Handle escape key to exit fullscreen and arrow keys for stage switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      if (e.key === 'Escape') {
        toggleFullscreen();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        switchStage('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        switchStage('next');
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, switchStage, toggleFullscreen]);

  if (isFullscreen) {
    return (
      <div 
        ref={fullscreenRef}
        className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col"
        style={{ 
          touchAction: 'none',
          height: '100vh',
          width: '100vw'
        }}
      >
        {/* Header */}
        <FieldCanvasHeader
          currentStage={currentStage}
          hideControls={hideControls}
          onStageSwitch={switchStage}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Mobile Stage Controls */}
        <MobileStageControls
          currentStage={currentStage}
          currentStageIndex={currentStageIndex}
          stages={stages}
          onStageSwitch={switchStage}
          isVisible={isMobile && !hideControls}
        />

        {/* Drawing Controls */}
        {(!hideControls || !isMobile) && (
          <DrawingControls
            isErasing={isErasing}
            brushSize={brushSize}
            brushColor={brushColor}
            currentStageId={currentStageId}
            isMobile={isMobile}
            isFullscreen={isFullscreen}
            canUndo={canUndo}
            onToggleErasing={setIsErasing}
            onBrushSizeChange={setBrushSize}
            onBrushColorChange={setBrushColor}
            onClearCanvas={clearCanvas}
            onSaveCanvas={() => saveCanvas(true)}
            onUndo={undo}
            onToggleFullscreen={toggleFullscreen}
            onToggleHideControls={() => setHideControls(!hideControls)}
          />
        )}

        {/* Canvas Container */}
        <div 
          className="flex-1 flex items-center justify-center p-2 md:p-4 bg-green-50 dark:bg-green-950/20 overflow-hidden relative"
          style={{ touchAction: 'none' }}
        >
          {/* Floating Controls */}
          <FloatingControls
            isVisible={hideControls && isMobile}
            isErasing={isErasing}
            canUndo={canUndo}
            onToggleControls={() => setHideControls(false)}
            onStageSwitch={switchStage}
            onToggleErasing={setIsErasing}
            onUndo={undo}
            onClearCanvas={clearCanvas}
          />
          
          <div 
            className="w-full h-full flex items-center justify-center"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <canvas
              ref={canvasRef}
              style={{
                ...canvasStyle,
                touchAction: 'none'
              }}
              className="border border-gray-300 rounded-lg cursor-crosshair shadow-lg"
              {...canvasEventHandlers}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-2 md:p-4 border-t bg-background text-center text-xs md:text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            {!isMobile && (
              <>
                <span>Press ESC to exit fullscreen</span>
                <span>Use ← → arrows to switch stages</span>
              </>
            )}
            {isMobile && (
              <span>Tap Exit Fullscreen to return • Use Previous/Next to switch stages</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full flex flex-col" 
      data-stage={stageId}
      style={{ touchAction: 'pan-x pan-y' }}
    >
      {/* Normal Drawing Controls */}
      <DrawingControls
        isErasing={isErasing}
        brushSize={brushSize}
        brushColor={brushColor}
        currentStageId={currentStageId}
        isMobile={isMobile}
        isFullscreen={isFullscreen}
        canUndo={canUndo}
        onToggleErasing={setIsErasing}
        onBrushSizeChange={setBrushSize}
        onBrushColorChange={setBrushColor}
        onClearCanvas={clearCanvas}
        onSaveCanvas={() => saveCanvas(true)}
        onUndo={undo}
        onToggleFullscreen={toggleFullscreen}
        onToggleHideControls={() => setHideControls(!hideControls)}
      />

      {/* Normal Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center border rounded-lg bg-green-50 dark:bg-green-950/20 min-h-0 p-4"
        style={{ touchAction: 'none' }}
      >
        <div 
          className="w-full h-full flex items-center justify-center"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <canvas
            ref={canvasRef}
            style={{
              ...canvasStyle,
              touchAction: 'none'
            }}
            className="border border-gray-300 rounded-lg cursor-crosshair max-w-full max-h-full"
            {...canvasEventHandlers}
          />
        </div>
      </div>
    </div>
  );
};

export default FieldCanvas;
