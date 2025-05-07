import React, { useRef, useEffect } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { usePosture } from "@/context/PostureContext";
import { POSE_LANDMARKS } from "@/utils/postureDetect";

// Connection lines commented out as per request
/*
const POSE_CONNECTIONS: [number, number][] = [
  // ... (connections were here)
];
*/

export interface PostureViewProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
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

    if (isCalibrated && baselinePose && baselinePose.length > 0 && baselinePose[POSE_LANDMARKS.NOSE]) {
      const baselineNoseLandmark = baselinePose[POSE_LANDMARKS.NOSE];
      if (baselineNoseLandmark && typeof baselineNoseLandmark.y === 'number') { 
        const barHeight = 10; 
        const barY = baselineNoseLandmark.y * canvas.height;
        ctx.fillStyle = isGoodPosture ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(0, barY - barHeight / 2, canvas.width, barHeight);
      }
    }

    if (landmarks && landmarks.length > 0) {
      ctx.save();
      // POSE_CONNECTIONS drawing block fully removed/commented out here
      landmarks.forEach((landmark) => {
        if (landmark && landmark.visibility && landmark.visibility > 0.5 && typeof landmark.x === 'number' && typeof landmark.y === 'number') {
          ctx.beginPath();
          ctx.arc((1 - landmark.x) * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
          ctx.fillStyle = isGoodPosture ? "lightgreen" : "pink";
          ctx.fill();
        }
      });
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

interface CanvasOverlayProps { // Moved interface definition here to be used by CanvasOverlay 
    videoElement: HTMLVideoElement | null;
    landmarks?: NormalizedLandmark[];
    baselinePose?: NormalizedLandmark[];
    isGoodPosture: boolean;
    isCalibrated: boolean;
}

export const PostureView: React.FC<PostureViewProps> = ({ isSessionActive, onPostureChange }) => {
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

  useEffect(() => {
    if (isSessionActive && onPostureChange) {
      onPostureChange(postureStatus.isGood);
    }
  }, [postureStatus.isGood, isSessionActive, onPostureChange]);

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
      
      <div className="relative w-full aspect-[4/3]" style={{ minHeight: '240px' /* Fallback min height */ }}> {/* Added aspect ratio and full width for video container */}
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
          // Removed fixed width/height, relying on CSS via className="w-full h-full ..."
          autoPlay
          playsInline 
          muted 
          style={{ transform: "scaleX(-1)" }} 
          className="w-full h-full object-cover rounded" // Ensure video fills container
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