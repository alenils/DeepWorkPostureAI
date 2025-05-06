import { useEffect, useRef } from 'react';
import React from 'react';

interface PoseOverlayProps {
  width: number;
  height: number;
  good: boolean;
  baselineEye: number | null;
  currentEye: number | null;
}

const PoseOverlayComponent = ({ 
  width, 
  height, 
  good, 
  baselineEye, 
  currentEye 
}: PoseOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !width || !height) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions match the video
    if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the guideline overlay
    if (baselineEye !== null) {
      const basePx = baselineEye * height;
      
      // Draw baseline guideline
      ctx.fillStyle = good ? '#00ff66aa' : '#ff4444aa'; // semi-transparent
      ctx.fillRect(0, basePx - 2, width, 4); // baseline
      
      // Draw current eye line if available
      if (currentEye !== null) {
        const curPx = currentEye * height;
        // Draw current eye line thinner
        ctx.fillRect(0, curPx - 1, width, 2);
      }
    }
  }, [width, height, good, baselineEye, currentEye]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-20 pointer-events-none"
    />
  );
};

// Wrap the component in React.memo to prevent unnecessary re-renders
export const PoseOverlay = React.memo(PoseOverlayComponent); 