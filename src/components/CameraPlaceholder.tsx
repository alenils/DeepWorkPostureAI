import { useState, useEffect, useRef } from 'react';

// Focus statements for camera caption
const FOCUS_STATEMENTS = [
  "THIS IS WHAT FOCUS LOOKS LIKE",
  "YOU ARE THE ONE DOING THE WORK",
  "GRIT ON DISPLAY",
  "EYES ON THE MISSION",
  "DISTRACTION-FREE ZONE",
  "GREATNESS THROUGH CONSISTENCY",
  "DEEP WORK HAPPENING NOW",
  "FLOW STATE ACTIVATED",
  "STAY IN THE ZONE",
  "FOCUS BUILDS FUTURES",
  "MASTERY THROUGH CONCENTRATION",
  "COMMITMENT VISIBLE",
  "THIS IS YOUR MASTERPIECE",
  "PROGRESS MADE VISIBLE",
  "WATCH YOURSELF SUCCEED",
  "MOMENTUM IN ACTION",
  "SHOWING UP FOR YOURSELF",
  "DISCIPLINE VISIBLE",
  "POTENTIAL BECOMING REALITY",
  "FUTURE SELF THANKS YOU"
];

export const CameraPlaceholder = ({ isSessionActive = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [currentCaption, setCurrentCaption] = useState('');
  
  // Set a random caption when session starts
  useEffect(() => {
    if (isSessionActive && cameraEnabled) {
      const randomIndex = Math.floor(Math.random() * FOCUS_STATEMENTS.length);
      setCurrentCaption(FOCUS_STATEMENTS[randomIndex]);
    } else if (!isSessionActive) {
      setCurrentCaption('');
    }
  }, [isSessionActive, cameraEnabled]);
  
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
  }, [cameraEnabled]);

  const toggleCamera = () => {
    setCameraEnabled(prev => !prev);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full lg:w-[125%] lg:-mr-[25%]">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">🎥 Posture Tracker</h2>
        <button
          onClick={toggleCamera}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            cameraEnabled 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {cameraEnabled ? 'Turn Off' : 'Turn On'}
        </button>
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
            {currentCaption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-center">
                <p className="text-white text-xs italic opacity-90 font-medium text-center">
                  {currentCaption}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 