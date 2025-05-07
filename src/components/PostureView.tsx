import { useRef, useEffect } from 'react';
import { usePosture } from '../context/PostureContext';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { getEyeLine } from '../utils/postureDetect';

interface PostureViewProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
}

export const PostureView = ({ 
  isSessionActive = false, 
  onPostureChange = () => {} 
}: PostureViewProps) => {
  const { stream, landmarks, good, angles, calibrate } = usePosture();
  const videoWrapper = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visVideo = useRef<HTMLVideoElement>(null);
  const baselineEyeRef = useRef<number | null>(null);

  // Report posture changes to parent component (only when session is active)
  useEffect(() => {
    if (isSessionActive) {
      onPostureChange(good);
    }
  }, [good, isSessionActive, onPostureChange]);

  // Connect video stream to visible video element
  useEffect(() => {
    if (stream && visVideo.current) {
      visVideo.current.srcObject = stream;
      visVideo.current.play();
    }
  }, [stream]);

  // enlarge by 30%
  useEffect(() => {
    if (!landmarks || !canvasRef.current) return;
    
    const w = 320 * 1.3, h = 240 * 1.3;
    canvasRef.current.width = w; 
    canvasRef.current.height = h;
    
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    
    // Draw skeleton
    drawConnectors(ctx, landmarks, POSE_CONNECTIONS, {color: '#0af', lineWidth: 1});
    drawLandmarks(ctx, landmarks, {color: '#fff', fillColor: '#0af', radius: 1});
    
    // Draw guideline if we have a baseline
    if (baselineEyeRef.current === null && landmarks) {
      baselineEyeRef.current = getEyeLine(landmarks);
    }
    
    if (baselineEyeRef.current !== null) {
      const currentEyeLine = getEyeLine(landmarks);
      const basePx = baselineEyeRef.current * h;
      const curPx = currentEyeLine * h;
      
      // Draw baseline guideline
      ctx.fillStyle = good ? '#00ff66aa' : '#ff4444aa'; // semi-transparent
      ctx.fillRect(0, basePx - 2, w, 4); // baseline
      
      // Draw current eye line thinner
      ctx.fillRect(0, curPx - 1, w, 2);
    }
  }, [landmarks, good]);

  // Handle calibration with resetting the baseline
  const handleCalibrate = () => {
    if (landmarks) {
      baselineEyeRef.current = getEyeLine(landmarks);
    }
    calibrate(); // Also call the original calibrate from context
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full lg:w-[125%] lg:-mr-[25%]">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleCalibrate} 
            className="bg-gray-700/80 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold"
          >
            Calibrate
          </button>
        </div>
      </div>
      
      <div className="relative" style={{height: '130%'}}>
        {/* visible video */}
        <video 
          ref={visVideo} 
          playsInline 
          muted 
          className="w-full h-full object-cover rounded" 
        />
        {/* canvas overlay */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none rounded" 
          style={{width: '100%', height: '100%'}} 
        />
        
        {landmarks && (
          <div className="absolute top-2 right-2 p-2 rounded bg-black/50 text-white text-xs">
            <span>{good ? '✅ Good' : '❌ Bad'} | Neck {angles.neck.toFixed(0)}°</span>
          </div>
        )}
      </div>
    </div>
  );
}; 