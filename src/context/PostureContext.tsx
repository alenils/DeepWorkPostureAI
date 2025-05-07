import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { detectPostureWithBaseline } from '../utils/postureDetect';
import { Landmarks } from '../utils/poseMath';
import { loadDetector, detectPose } from '../utils/poseDetector';
import { PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { Camera } from '@mediapipe/camera_utils';
import { loadPose, PoseResult } from '@/lib/poseDetector';

// Define NormalizedLandmark type to match MediaPipe's format
interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

type PoseCtx = {
  good: boolean; 
  neck: number; 
  torso: number;
  angles: {neck: number, torso: number};
  landmarks: Landmarks | null;
  stream: MediaStream | null;
  calibrate: () => void;
};

const Context = createContext<PoseCtx | null>(null);
export const usePosture = () => useContext(Context)!;

export const PostureProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [good, setGood] = useState(true);
  const [angles, setAngles] = useState({neck: 0, torso: 0});
  const [landmarks, setLM] = useState<Landmarks | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const baselineRef = useRef<Landmarks | null>(null);
  const latestRef = useRef<Landmarks | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  // Process pose detection results
  const processPoseResults = (result: PoseLandmarkerResult) => {
    if (result.landmarks && result.landmarks.length > 0) {
      // Convert to our landmark format
      const lm = result.landmarks[0].map((p: NormalizedLandmark) => ({
        x: p.x,
        y: p.y,
        z: p.z,
        visibility: p.visibility || 0
      }));
      
      latestRef.current = lm;
      setLM(lm);
      console.log("FIRST LANDMARKS", lm.length);
      
      if (baselineRef.current) {
        const {good, angles} = detectPostureWithBaseline(lm, baselineRef.current, 1);
        setGood(good); 
        setAngles({neck: angles.neckPitch, torso: angles.torsoAngle});
      }
    }
  };

  // Run pose detection in animation frame
  const detectPoseFrame = async () => {
    if (videoRef.current && detectorRef.current) {
      try {
        const result = await detectPose(videoRef.current);
        processPoseResults(result);
      } catch (error) {
        console.error("Error detecting pose:", error);
      }
      
      rafRef.current = requestAnimationFrame(detectPoseFrame);
    }
  };

  // mount once
  useEffect(() => {
    const setupCamera = async () => {
      try {
        // Create hidden video element
        const video = document.createElement('video');
        video.playsInline = true; 
        video.muted = true; 
        video.autoplay = true;
        video.style.display = 'none';       // hidden element
        document.body.appendChild(video);
        videoRef.current = video;
        
        // Setup camera
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });
        
        video.srcObject = mediaStream;
        await video.play();
        setStream(mediaStream);
        
        // Load pose detector
        console.log("Loading pose detector...");
        const pose = await loadPose();
        detectorRef.current = pose;
        console.log("Pose detector loaded");
        
        // Start detection loop
        rafRef.current = requestAnimationFrame(detectPoseFrame);

        const cam = new Camera(video, {
          width: 640,
          height: 480,
          onFrame: async () => {
            const res: PoseResult = pose.detectForVideo(video, Date.now());
            if (res.landmarks.length) {
              const lm = res.landmarks[0];     // array of 33  {x,y,z}
              latestRef.current = lm;
              setLM(lm as any);                // Landmarks type alias
            }
          }
        });
        cam.start().then(() => console.log('[Posture] camera started'));
      } catch (error) {
        console.error("Error setting up camera:", error);
      }
    };
    
    setupCamera();
    
    return () => { 
      // Clean up
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      if (videoRef.current) {
        const tracks = videoRef.current.srcObject as MediaStream;
        if (tracks) {
          tracks.getTracks().forEach(track => track.stop());
        }
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);

  const calibrate = () => { 
    if (latestRef.current) baselineRef.current = latestRef.current; 
  };

  return (
    <Context.Provider value={{
      good,
      neck: angles.neck,
      torso: angles.torso,
      angles,
      landmarks,
      stream,
      calibrate
    }}>
      {children}
    </Context.Provider>
  );
}; 