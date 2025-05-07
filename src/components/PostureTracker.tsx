import React, { useState, useEffect, useRef } from 'react';
import { useStablePosture } from '../hooks/useStablePosture';
import { PoseLandmarksRenderer } from './PoseLandmarksRenderer';
import { PoseOverlay } from './PoseOverlay';
import { usePosture } from "@/context/PostureContext";
import PostureView from "./PostureView";
import PostureControls from "./PostureControls";
import PostureStatusDisplay from "./PostureStatusDisplay";

interface PostureTrackerProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
  sensitivity?: number;
}

const PostureTrackerComponent = ({ 
  isSessionActive = false, 
  onPostureChange = (isGood: boolean) => {},
  sensitivity = 1.0
}: PostureTrackerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  
  // Initialize pose detection
  const posture = useStablePosture(true, sensitivity);
  const latestEye = useRef<number | null>(null);
  
  // Update latestEye when posture.eyeY changes
  useEffect(() => {
    if (posture.eyeY !== null) {
      latestEye.current = posture.eyeY;
    }
  }, [posture.eyeY]);
  
  // Initialize webcam once
  useEffect(() => {
    if (!cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          setError('');
          
          // Initialize video dimensions
          videoRef.current.addEventListener('loadedmetadata', () => {
            if (videoRef.current) {
              setVideoSize({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
              
              // Start posture detection once video is loaded
              posture.startDetection(videoRef.current);
            }
          });
        }
      } catch (err) {
        console.error('Failed to access webcam:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to access webcam');
        }
        setCameraActive(false);
      }
    };
    
    if (!streamRef.current) {
      setupCamera();
    }
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraEnabled, posture]);
  
  // Report posture changes to parent component (only when session is active)
  useEffect(() => {
    if (isSessionActive) {
      onPostureChange(posture.good);
    }
  }, [posture.good, isSessionActive, onPostureChange]);

  // Toggle camera
  const toggleCamera = () => {
    setCameraEnabled(prev => !prev);
  };
  
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-3 flex items-center">
        Posture Monitor 
        {posture.isActive && (posture.good ? '✅' : '❌')}
      </h2>
      <div className="relative mb-3">
        <PostureView /> 
        {posture.isActive && (
          <PoseLandmarksRenderer 
            landmarks={posture.landmarks} 
            width={videoSize.width} 
            height={videoSize.height}
            neckAngle={0}
            torsoAngle={0}
            isGoodPosture={posture.good}
          />
        )}
        {/* Add the eye-line guide overlay */}
        {posture.isActive && (
          <PoseOverlay
            width={videoSize.width}
            height={videoSize.height}
            good={posture.good}
            baselineEye={posture.baselineEye}
            currentEye={latestEye.current}
          />
        )}
        {posture.isActive && (
          <div className="absolute top-2 right-2 p-2 rounded bg-black/50 text-white text-xs">
            Posture: {posture.isActive ? (posture.good ? 'Good ✅' : 'Bad ❌') : 'Off'}<br />
            {posture.baselineEye !== null && latestEye.current !== null && 
              `Eye Pos: ${((latestEye.current - posture.baselineEye) * videoSize.height).toFixed(1)}px`}
          </div>
        )}
        
        {/* Always visible camera controls */}
        {posture.isActive && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-4 text-xs">
            <button
              onClick={posture.toggleActive}
              className={`px-3 py-1 rounded font-semibold ${
                posture.isActive 
                  ? 'bg-blue-500/80 hover:bg-blue-600 text-white' 
                  : 'bg-gray-500/80 hover:bg-gray-600 text-white'
              }`}
            >
              {posture.isActive ? 'Posture ON' : 'Posture OFF'}
            </button>
            <button
              onClick={posture.calibrate}
              className="bg-gray-700/80 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold"
            >
              Calibrate
            </button>
          </div>
        )}
      </div>
      <PostureStatusDisplay /> 
      <PostureControls />      
    </div>
  );
};

// Wrap the component in React.memo to prevent unnecessary re-renders
export const PostureTracker = React.memo(PostureTrackerComponent); 