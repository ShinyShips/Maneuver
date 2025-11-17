import { useCallback, useEffect, useRef } from "react";
import fieldImage from "@/assets/field.png";

// Constants for team label positioning and sizing
const TEAM_LABEL_FONT_SIZE_RATIO = 0.02; // Font size as ratio of canvas width
const BLUE_ALLIANCE_X_POSITION = 0.03; // Left edge position for blue alliance
const RED_ALLIANCE_X_POSITION = 0.97; // Right edge position for red alliance
const TEAM_POSITION_TOP_Y = 0.275; // Y position for top team slot
const TEAM_POSITION_MIDDLE_Y = 0.505; // Y position for middle team slot
const TEAM_POSITION_BOTTOM_Y = 0.735; // Y position for bottom team slot

// Constants for canvas layout and spacing
const MOBILE_RESERVED_WIDTH_FOR_CONTROLS = 160; // Reserved width on mobile for vertical floating control bar (includes buttons + margins)

// Global reference for background image to share with drawing hook
let globalBackgroundImage: HTMLImageElement | null = null;

export const getGlobalBackgroundImage = () => globalBackgroundImage;
export const setGlobalBackgroundImage = (img: HTMLImageElement) => {
  globalBackgroundImage = img;
};

interface UseCanvasSetupProps {
  currentStageId: string;
  isFullscreen: boolean;
  hideControls: boolean;
  isMobile: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fullscreenRef: React.RefObject<HTMLDivElement | null>;
  selectedTeams?: string[];
  onCanvasReady?: () => void;
}

export const useCanvasSetup = ({
  currentStageId,
  isFullscreen,
  hideControls,
  isMobile,
  canvasRef,
  containerRef,
  fullscreenRef,
  selectedTeams = [],
  onCanvasReady
}: UseCanvasSetupProps) => {
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const drawTeamNumbersOnCanvas = useCallback((ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Only draw team numbers if exactly 6 teams are selected (3 per alliance)
    if (!selectedTeams || selectedTeams.length !== 6) return;
    
    // Set text style using defined font size ratio
    const fontSize = Math.floor(canvasWidth * TEAM_LABEL_FONT_SIZE_RATIO);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Blue alliance (left side with blue hexagon) - positions 3, 4, 5
    const blueX = canvasWidth * BLUE_ALLIANCE_X_POSITION;
    const blueTeams = [
      { team: selectedTeams[3], y: canvasHeight * TEAM_POSITION_TOP_Y }, // Position 1 at top
      { team: selectedTeams[4], y: canvasHeight * TEAM_POSITION_MIDDLE_Y }, // Position 2 at middle
      { team: selectedTeams[5], y: canvasHeight * TEAM_POSITION_BOTTOM_Y }, // Position 3 at bottom
    ];
    
    blueTeams.forEach(({ team, y }) => {
      if (team && team.trim()) {
        ctx.save();
        ctx.translate(blueX, y);
        ctx.rotate(Math.PI / 2);
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(team, 0, 0);
        ctx.fillText(team, 0, 0);
        
        ctx.restore();
      }
    });
    
    // Red alliance (right side with red hexagon) - positions 0, 1, 2
    const redX = canvasWidth * RED_ALLIANCE_X_POSITION;
    const redTeams = [
      { team: selectedTeams[0], y: canvasHeight * TEAM_POSITION_BOTTOM_Y }, // Position 1 at bottom
      { team: selectedTeams[1], y: canvasHeight * TEAM_POSITION_MIDDLE_Y }, // Position 2 at middle
      { team: selectedTeams[2], y: canvasHeight * TEAM_POSITION_TOP_Y }, // Position 3 at top
    ];
    
    redTeams.forEach(({ team, y }) => {
      if (team && team.trim()) {
        ctx.save();
        ctx.translate(redX, y);
        ctx.rotate(-Math.PI / 2);
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(team, 0, 0);
        ctx.fillText(team, 0, 0);
        
        ctx.restore();
      }
    });
  }, [selectedTeams]);

  const setupCanvas = useCallback(() => {
    // Clear any pending setup calls
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    // Debounce setup calls to prevent rapid successive calls
    setupTimeoutRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      const container = isFullscreen ? fullscreenRef.current : containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load and draw the field background
      const img = new Image();
      img.onload = () => {
      // Store the background image globally for use in erasing
      setGlobalBackgroundImage(img);
      
      let containerWidth, containerHeight;
      
      if (isFullscreen) {
        // For fullscreen, calculate available space more carefully
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Account for header + controls (no padding on mobile)
        let reservedHeight = isMobile ? 100 : 180; // Mobile: compact header + controls, Desktop: larger with padding
        
        // Add space for stage switcher and controls if they're visible
        if (!hideControls || !isMobile) {
          reservedHeight += isMobile ? 0 : 100; // Only add extra on desktop
        }
        
        // Reserve space for floating controls on mobile - increased to prevent overlap on real devices
        const reservedWidth = isMobile ? MOBILE_RESERVED_WIDTH_FOR_CONTROLS : 32; // Mobile: extra space for floating controls, Desktop: standard padding
        
        containerWidth = viewportWidth - reservedWidth;
        containerHeight = viewportHeight - reservedHeight;
      } else {
        // Normal mode - use container dimensions
        const containerRect = container.getBoundingClientRect();
        const padding = 32;
        containerWidth = containerRect.width - padding;
        containerHeight = containerRect.height - padding;
      }

      // Calculate aspect ratio preserving dimensions
      const imgAspectRatio = img.width / img.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let canvasWidth, canvasHeight;

      if (imgAspectRatio > containerAspectRatio) {
        // Image is wider relative to container
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imgAspectRatio;
      } else {
        // Image is taller relative to container
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imgAspectRatio;
      }

      // Set canvas dimensions (internal resolution)
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Set canvas display size to exactly match internal dimensions (no scaling)
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      // Store background image reference for erasing
      backgroundImageRef.current = img;

      // Load saved drawing if exists, otherwise draw background
      const savedData = localStorage.getItem(`fieldStrategy_${currentStageId}`);
      if (savedData) {
        const savedImg = new Image();
        savedImg.onload = () => {
          // Draw the saved content (which already includes background)
          ctx.drawImage(savedImg, 0, 0, canvasWidth, canvasHeight);
          // Draw team numbers on top
          drawTeamNumbersOnCanvas(ctx, canvasWidth, canvasHeight);
          // Initialize undo history after canvas drawing is complete
          // Use requestAnimationFrame to ensure rendering is complete before initializing history
          if (onCanvasReady) {
            requestAnimationFrame(() => onCanvasReady());
          }
        };
        savedImg.src = savedData;
      } else {
        // Only draw background if no saved data exists
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        // Draw team numbers on top
        drawTeamNumbersOnCanvas(ctx, canvasWidth, canvasHeight);
        // Initialize undo history after canvas drawing is complete
        // Use requestAnimationFrame to ensure rendering is complete before initializing history
        if (onCanvasReady) {
          requestAnimationFrame(() => onCanvasReady());
        }
      }
    };
    img.src = fieldImage;
    }, 50); // 50ms debounce
  }, [currentStageId, isFullscreen, hideControls, isMobile, canvasRef, containerRef, fullscreenRef, onCanvasReady, drawTeamNumbersOnCanvas]);

  useEffect(() => {
    setupCanvas();

    // Resize handler - only for fullscreen mode
    const handleResize = () => {
      if (isFullscreen) {
        setupCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
      }
    };
  }, [setupCanvas, isFullscreen]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !backgroundImageRef.current) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw just the background image
    ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);

    // Redraw team numbers
    drawTeamNumbersOnCanvas(ctx, canvas.width, canvas.height);

    // Clear saved data
    localStorage.removeItem(`fieldStrategy_${currentStageId}`);
  }, [currentStageId, canvasRef, drawTeamNumbersOnCanvas]);

  return {
    backgroundImageRef,
    setupCanvas,
    clearCanvas
  };
};
