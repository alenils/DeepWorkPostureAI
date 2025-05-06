import { useState, useEffect, useRef } from 'react';
import { useStablePosture } from '../hooks/useStablePosture';
import { PoseLandmarksRenderer } from './PoseLandmarksRenderer';
import { PoseOverlay } from './PoseOverlay';

// Focus statements for camera caption
const FOCUS_STATEMENTS = [
  "THIS IS WHAT GRIT LOOKS LIKE",
  "STAY ON MISSION",
  "DOING IT",
  "THIS IS SPARTA",
  "FOCUS FACE",
  "GRINDING",
  "DEEP WORK HAPPENING",
  "FLOW STATE ACTIVATED",
  "EYES ON THE PRIZE",
  "DISTRACTION-FREE ZONE",
  "COMMITTING TO EXCELLENCE",
  "PROGRESS IN MOTION",
  "SHOWING UP FOR YOURSELF",
  "DISCIPLINE OVER MOTIVATION",
  "BUILDING NEURAL PATHWAYS"
];

export const CameraPlaceholder = ({ isSessionActive = false, onPostureChange = (isGood: boolean) => {} }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [currentCaption, setCurrentCaption] = useState('');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [sensitivityFactor, setSensitivityFactor] = useState<number>(() => {
    // Load sensitivity from localStorage, default to 1.0 (which means 10° neck threshold, 8° torso threshold)
    const storedValue = localStorage.getItem('postureSensitivity');
    return storedValue ? parseFloat(storedValue) : 1.0;
  });
  
  // Initialize pose detection with sensitivityFactor
  const posture = useStablePosture(true, sensitivityFactor);
  const latestEye = useRef<number | null>(null);
  
  // Update latestEye when posture.eyeY changes
  useEffect(() => {
    if (posture.eyeY !== null) {
      latestEye.current = posture.eyeY;
    }
  }, [posture.eyeY]);
  
  // Set a random caption when session starts
  useEffect(() => {
    if (isSessionActive && cameraEnabled) {
      const randomIndex = Math.floor(Math.random() * FOCUS_STATEMENTS.length);
      setCurrentCaption(FOCUS_STATEMENTS[randomIndex]);
    } else if (!isSessionActive) {
      setCurrentCaption('');
    }
  }, [isSessionActive, cameraEnabled]);
  
  // Initialize webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const setupCamera = async () => {
      if (!cameraEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
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
    
    setupCamera();
    
    // Cleanup
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
  
  // Handle sensitivity change
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setSensitivityFactor(value);
    localStorage.setItem('postureSensitivity', value.toString());
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full lg:w-[125%] lg:-mr-[25%]">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker {posture.isActive && (posture.good ? '✅' : '❌')}
        </h2>
        <div className="flex space-x-2">
          <select
            value={sensitivityFactor.toString()}
            onChange={handleSensitivityChange}
            className="px-2 py-1 rounded font-semibold text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
            title="Adjust sensitivity of posture detection"
          >
            <option value="0.5">5°/4° (High)</option>
            <option value="1.0">10°/8° (Normal)</option>
            <option value="1.5">15°/12° (Medium)</option>
            <option value="2.0">20°/16° (Low)</option>
          </select>
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
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
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
            {currentCaption && (
              <div className="absolute bottom-14 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-center">
                <p className="text-white text-xs italic opacity-90 font-medium text-center">
                  {currentCaption}
                </p>
              </div>
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