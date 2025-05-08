import React, { useRef, useEffect } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { usePosture } from "@/context/PostureContext";
import { POSE_LANDMARKS } from "@/utils/postureDetect";
import PostureControls from './PostureControls';

// Connection lines commented out as per request
/*
const POSE_CONNECTIONS: [number, number][] = [
  // ... (connections were here)
];
*/

// Define BaselineMetrics interface (or import from context if exported)
interface BaselineMetrics {
  noseY: number;
  noseX: number; 
  earShoulderDistX: number; 
}

export interface PostureViewProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
}

interface CanvasOverlayProps { 
    videoElement: HTMLVideoElement | null;
    landmarks?: NormalizedLandmark[];
    baselineMetrics: BaselineMetrics | null | undefined;
    isGoodPosture: boolean;
    isCalibrated: boolean;
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  videoElement,
  landmarks,
  baselineMetrics,
  isGoodPosture,
  isCalibrated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Use clientWidth/Height for displayed size if available and non-zero, otherwise fall back to videoWidth/Height
        const displayWidth = video.clientWidth > 0 ? video.clientWidth : video.videoWidth;
        const displayHeight = video.clientHeight > 0 ? video.clientHeight : video.videoHeight;
        
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        console.log(`CanvasOverlay: video naturalW=${video.videoWidth}, naturalH=${video.videoHeight}, clientW=${video.clientWidth}, clientH=${video.clientHeight}. Set canvas size to w=${canvas.width}, h=${canvas.height}`);
    } else {
        // Video dimensions not ready
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw horizontal bar (using baselineMetrics)
    if (isCalibrated && baselineMetrics && typeof baselineMetrics.noseY === 'number') {
      const baselineNoseCanvasY = baselineMetrics.noseY * canvas.height;
      const barHeight = 10; 
      const barColor = isGoodPosture ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
      ctx.fillStyle = barColor;
      ctx.fillRect(0, baselineNoseCanvasY - barHeight / 2, canvas.width, barHeight);
    } else {
      if (isCalibrated) {
        console.log("CANVAS: Bar not drawn. isCalibrated=true, but baselineMetrics missing or invalid.", baselineMetrics);
      }
    }

    // Draw KEY landmark dots (Nose, Eyes, Ears, Shoulders)
    if (landmarks && landmarks.length > 0) {
      ctx.save();
      const keyLandmarks = [
        POSE_LANDMARKS.NOSE,          // 0
        POSE_LANDMARKS.LEFT_EYE,        // 2
        POSE_LANDMARKS.RIGHT_EYE,       // 5
        POSE_LANDMARKS.LEFT_EAR,        // 7
        POSE_LANDMARKS.RIGHT_EAR,       // 8
        POSE_LANDMARKS.LEFT_SHOULDER,   // 11
        POSE_LANDMARKS.RIGHT_SHOULDER,  // 12
      ];

      landmarks.forEach((landmark, index) => {
        if (keyLandmarks.includes(index) && landmark && landmark.visibility && landmark.visibility > 0.5 && typeof landmark.x === 'number' && typeof landmark.y === 'number') {
          ctx.beginPath();
          ctx.arc(
             (1 - landmark.x) * canvas.width, // Mirrored X
             landmark.y * canvas.height, 
             5, // Increased dot size for visibility
             0, 2 * Math.PI
          ); 
          ctx.fillStyle = isGoodPosture ? "rgba(144, 238, 144, 0.8)" : "rgba(255, 182, 193, 0.8)"; // Slightly opaque lightgreen/pink
          ctx.fill();
        }
      });
      ctx.restore(); 
    }
    
    // Keep the console log for dimensions active
    console.log(`CanvasOverlay: video naturalW=${video?.videoWidth}, naturalH=${video?.videoHeight}, clientW=${video?.clientWidth}, clientH=${video?.clientHeight}. Set canvas size to w=${canvas.width}, h=${canvas.height}`);

  }, [videoElement, landmarks, baselineMetrics, isGoodPosture, isCalibrated]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: videoElement?.offsetLeft ?? 0,
        top: videoElement?.offsetTop ?? 0,
        zIndex: 10,
      }}
    />
  );
};

export const PostureView: React.FC<PostureViewProps> = ({ isSessionActive, onPostureChange }) => {
  const {
    videoRef,
    detectedLandmarks,
    baselineMetrics,
    postureStatus,
    isCalibrated,
    handleCalibration,
    startPostureDetection,
    stopPostureDetection,
    isDetecting,
    isLoadingDetector,
    cameraError,
    isCalibrating,
    countdown
  } = usePosture();

  useEffect(() => {
    if (isSessionActive && onPostureChange) {
      onPostureChange(postureStatus.isGood);
    }
  }, [postureStatus.isGood, isSessionActive, onPostureChange]);

  // Add UI Debug Log for Status
  console.log("UI RENDER: PostureView received postureStatus:", postureStatus); 

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-[640px] mx-auto">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleCalibration} 
            disabled={!detectedLandmarks || detectedLandmarks.length === 0 || isLoadingDetector || !!cameraError || isCalibrating} 
            className="bg-gray-700/80 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalibrating ? `Calibrating (${countdown ?? ''}...)` : "Calibrate"} 
          </button>
        </div>
      </div>
      
      <div className="relative w-full bg-black">
        {isLoadingDetector && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
            <div className="text-white text-lg">Loading posture detector...</div>
          </div>
        )}
        
        {cameraError && !isLoadingDetector && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
            <div className="text-white bg-red-900/80 p-4 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-2">Camera Error</h3>
              <p>{cameraError}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline 
          muted 
          style={{ 
            transform: "scaleX(-1)", 
            display: 'block', 
            width: '100%',
            height: 'auto',
            objectFit: 'contain' 
          }}
          className=""
        />
        
        {videoRef.current && detectedLandmarks && detectedLandmarks.length > 0 && !cameraError && (
          <CanvasOverlay
            videoElement={videoRef.current}
            landmarks={detectedLandmarks}
            baselineMetrics={baselineMetrics}
            isGoodPosture={postureStatus.isGood}
            isCalibrated={isCalibrated}
          />
        )}
        
        { !isLoadingDetector && !cameraError && detectedLandmarks && detectedLandmarks.length > 0 && (
          <div className="absolute top-2 right-2 p-1 px-2 rounded bg-black/60 text-white text-xs font-medium z-10">
            {isCalibrating && countdown !== null ? 
              <span>Calibrating... {countdown}</span> : 
              <span>
                {(() => {
                    const msg = postureStatus.message;
                    console.log("UI RENDER - Rendering status message:", msg);
                    return `${postureStatus.isGood ? '✅ Good' : '❌ Bad'} | ${msg}`;
                })()}
              </span>
            }
          </div>
        )}
      </div>
      <PostureControls />
    </div>
  );
};

export default PostureView; 