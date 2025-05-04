import { useState, useEffect, useRef } from 'react';

export const CameraPlaceholder = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 pb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">🎥 Posture Tracker</h2>
      </div>
      
      <div className="relative aspect-video bg-black">
        {error ? (
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
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm font-medium">Posture Tracking Coming Soon...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 