import React, { useState, useEffect, useRef } from 'react';
import { useStablePosture } from '../hooks/useStablePosture';
import { PoseLandmarksRenderer } from './PoseLandmarksRenderer';
import { PoseOverlay } from './PoseOverlay';

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
  const [currentCaption, setCurrentCaption] = useState('');
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
  
  // Initialize webcam - but only do this once
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
              console.log("Video loaded, starting pose detection");
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full lg:w-[125%] lg:-mr-[25%]">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker {posture.isActive && (posture.good ? '✅' : '❌')}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={toggleCamera}
            className={`px-3 py-1 rounded font-semibold transition-opacity ${
              cameraEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white dark:opacity-90 dark:hover:opacity-100' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {cameraEnabled ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      </div>
      
      <div className="relative aspect-video bg-black h-auto lg:h-[125%]">
        {!cameraEnabled ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900">
            <p className="text-white text-center text-lg font-semibold">
              Camera Off
            </p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-white text-center text-sm">
              {error.includes('denied') 
                ? 'Camera access denied. Please allow camera access to use the posture tracker.' 
                : `Camera error: ${error}`}
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover rounded"
            />
            {posture.landmarks && cameraActive && (
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
            {cameraActive && (
              <PoseOverlay
                width={videoSize.width}
                height={videoSize.height}
                good={posture.good}
                baselineEye={posture.baselineEye}
                currentEye={latestEye.current}
              />
            )}
            {cameraActive && (
              <div className="absolute top-2 right-2 p-2 rounded bg-black/50 text-white text-xs">
                Posture: {posture.isActive ? (posture.good ? 'Good ✅' : 'Bad ❌') : 'Off'}<br />
                {posture.baselineEye !== null && latestEye.current !== null && 
                  `Eye Pos: ${((latestEye.current - posture.baselineEye) * videoSize.height).toFixed(1)}px`}
              </div>
            )}
            
            {/* Always visible camera controls */}
            {cameraActive && (
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
          </>
        )}
      </div>
    </div>
  );
};

// Wrap the component in React.memo to prevent unnecessary re-renders
export const PostureTracker = React.memo(PostureTrackerComponent); 