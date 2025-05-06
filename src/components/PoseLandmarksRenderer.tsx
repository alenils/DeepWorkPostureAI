import { useEffect, useRef } from 'react';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '@mediapipe/pose';

interface PoseLandmarksRendererProps {
  landmarks?: any;
  width: number;
  height: number;
  neckAngle?: number;
  torsoAngle?: number;
  isGoodPosture?: boolean;
}

export const PoseLandmarksRenderer = ({ 
  landmarks, 
  width, 
  height,
  neckAngle = 0,
  torsoAngle = 0,
  isGoodPosture = true
}: PoseLandmarksRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !landmarks || !width || !height) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions match the video
    if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the pose landmarks on the canvas
    drawConnectors(ctx, landmarks, POSE_CONNECTIONS, {
      color: isGoodPosture ? '#00FF00' : '#FF0000',
      lineWidth: 2
    });

    // Highlight key landmarks
    if (landmarks[POSE_LANDMARKS.NOSE]) {
      drawLandmarks(ctx, [landmarks[POSE_LANDMARKS.NOSE]], {
        color: '#FFFF00',
        lineWidth: 2,
        radius: 5
      });
    }

    // Highlight ears
    drawLandmarks(ctx, [
      landmarks[POSE_LANDMARKS.LEFT_EAR],
      landmarks[POSE_LANDMARKS.RIGHT_EAR]
    ], {
      color: '#00FFFF',
      lineWidth: 2,
      radius: 4
    });

    // Highlight shoulders
    drawLandmarks(ctx, [
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
    ], {
      color: '#FFA500',
      lineWidth: 2,
      radius: 4
    });

    // Draw posture angle information
    ctx.font = '14px Arial';
    ctx.fillStyle = isGoodPosture ? '#00FF00' : '#FF0000';
    ctx.fillText(`Neck: ${neckAngle.toFixed(1)}°`, 10, 20);
    ctx.fillText(`Torso: ${torsoAngle.toFixed(1)}°`, 10, 40);

    // Draw other landmarks
    drawLandmarks(ctx, landmarks, {
      color: '#FFFFFF',
      lineWidth: 1,
      radius: 2
    });
  }, [landmarks, width, height, neckAngle, torsoAngle, isGoodPosture]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-10 pointer-events-none"
    />
  );
}; 