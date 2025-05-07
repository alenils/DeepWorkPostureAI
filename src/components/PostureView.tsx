import React, { useRef, useEffect } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { usePosture } from "@/context/PostureContext";
import { POSE_LANDMARKS } from "@/utils/postureDetect";

// Define pose connections for skeleton visualization - Commented out as per request
/*
const POSE_CONNECTIONS: [number, number][] = [
  // Face connections
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  // Torso connections
  [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  // Legs
  [11, 23], [12, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  // Arms
  [11, 13], [13, 15], [15, 17], [17, 19], [19, 21],
  [12, 14], [14, 16], [16, 18], [18, 20], [20, 22]
];
*/

interface CanvasOverlayProps {
  videoElement: HTMLVideoElement | null;
  landmarks?: NormalizedLandmark[];
  baselinePose?: NormalizedLandmark[];
  isGoodPosture: boolean;
  isCalibrated: boolean;
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  videoElement,
  landmarks,
  baselinePose,
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
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
    } else {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw horizontal bar for posture baseline if calibrated
    if (isCalibrated && baselinePose && baselinePose.length > 0 && baselinePose[POSE_LANDMARKS.NOSE]) {
      const baselineNoseLandmark = baselinePose[POSE_LANDMARKS.NOSE];
      // Ensure baselineNoseLandmark exists and has y property (belt-and-suspenders check)
      if (baselineNoseLandmark && typeof baselineNoseLandmark.y === 'number') { 
        const barHeight = 10; 
        const barY = baselineNoseLandmark.y * canvas.height;
        
        ctx.fillStyle = isGoodPosture 
          ? "rgba(0, 255, 0, 0.5)" 
          : "rgba(255, 0, 0, 0.5)";
        
        ctx.fillRect(0, barY - barHeight / 2, canvas.width, barHeight);
      }
    }

    // Draw current landmarks if available
    if (landmarks && landmarks.length > 0) {
      ctx.save();
    
      // Landmark Connection Lines - Commented out as per request
      /*
      if (POSE_CONNECTIONS) { 
        ctx.strokeStyle = isGoodPosture ? "green" : "red";
        ctx.lineWidth = 2;
        POSE_CONNECTIONS.forEach((connection: [number, number]) => {
          const startLandmark = landmarks[connection[0]];
          const endLandmark = landmarks[connection[1]];
          if (startLandmark && endLandmark && startLandmark.visibility && startLandmark.visibility > 0.5 && endLandmark.visibility && endLandmark.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo((1 - startLandmark.x) * canvas.width, startLandmark.y * canvas.height);
            ctx.lineTo((1 - endLandmark.x) * canvas.width, endLandmark.y * canvas.height);
            ctx.stroke();
          }
        });
      }
      */

      // Draw current landmark dots
      landmarks.forEach((landmark) => {
        if (landmark && landmark.visibility && landmark.visibility > 0.5 && typeof landmark.x === 'number' && typeof landmark.y === 'number') {
          ctx.beginPath();
          ctx.arc(
            (1 - landmark.x) * canvas.width, // Mirrored X coordinate
            landmark.y * canvas.height,
            3, // Dot size
            0,
            2 * Math.PI
          );
          ctx.fillStyle = isGoodPosture ? "lightgreen" : "pink";
          ctx.fill();
        }
      });

      // Baseline Pose Dots - Commented out as the bar is the primary indicator
      /*
      if (isCalibrated && baselinePose && baselinePose.length > 0) {
        // ... (code for drawing blue baseline dots and connections was here)
      }
      */
      ctx.restore(); 
    }
  }, [videoElement, landmarks, baselinePose, isGoodPosture, isCalibrated]);

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

export const PostureView: React.FC = () => {
  const {
    videoRef,
    detectedLandmarks,
    baselinePose,
    postureStatus,
    isCalibrated,
    handleCalibration,
    startPostureDetection,
    stopPostureDetection,
    isDetecting,
    isLoadingDetector,
    cameraError
  } = usePosture();

  // eyeLineRef is not used anymore, can be removed if not planned for other features
  // const eyeLineRef = useRef<number | null>(null); 
  
  // useEffect(() => {
  //   if (detectedLandmarks && detectedLandmarks.length > 0 && !eyeLineRef.current) {
  //     const noseLandmark = detectedLandmarks[POSE_LANDMARKS.NOSE];
  //     if (noseLandmark) { 
  //       // eyeLineRef.current = getEyeLine(detectedLandmarks); // Original eye line
  //     }
  //   }
  // }, [detectedLandmarks]);

  useEffect(() => {
    if (!isDetecting && !isLoadingDetector && !cameraError) { 
      startPostureDetection();
    }
  }, [isDetecting, isLoadingDetector, startPostureDetection, cameraError]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleCalibration} 
            disabled={!detectedLandmarks || detectedLandmarks.length === 0 || isLoadingDetector || !!cameraError}
            className="bg-gray-700/80 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calibrate
          </button>
        </div>
      </div>
      
      <div className="relative" style={{ minHeight: '480px' }}>
        {isLoadingDetector && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
            <div className="text-white text-lg">Loading posture detector...</div>
          </div>
        )}
        
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
            <div className="text-white bg-red-900/80 p-4 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-2">Camera Error</h3>
              <p>{cameraError}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          playsInline
          muted
          style={{ transform: "scaleX(-1)" }} // Mirrored view
          className="w-full h-full object-cover rounded"
        />
        
        {videoRef.current && detectedLandmarks && detectedLandmarks.length > 0 && !cameraError && (
          <CanvasOverlay
            videoElement={videoRef.current}
            landmarks={detectedLandmarks}
            baselinePose={baselinePose}
            isGoodPosture={postureStatus.isGood}
            isCalibrated={isCalibrated}
          />
        )}
        
        {detectedLandmarks && detectedLandmarks.length > 0 && !cameraError && (
          <div className="absolute top-2 right-2 p-2 rounded bg-black/50 text-white text-xs">
            <span>{postureStatus.isGood ? '✅ Good' : '❌ Bad'} | {postureStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostureView; 