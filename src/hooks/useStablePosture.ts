import { useEffect, useRef, useState } from 'react';
import { Pose, Results, POSE_LANDMARKS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { Landmarks } from '../utils/poseMath';
import { getEyeLine, detectPostureWithBaseline } from '../utils/postureDetect';

export interface StablePoseData {
  good: boolean;
  landmarks?: any;
  eyeY: number | null;
}

export interface StablePostureHook extends StablePoseData {
  calibrate: () => void;
  startDetection: (video: HTMLVideoElement) => void;
  isActive: boolean;
  toggleActive: () => void;
  baselineEye: number | null;
}

export function useStablePosture(enabled = true, sensitivity = 1.0): StablePostureHook {
  const [poseData, setPoseData] = useState<StablePoseData>({
    good: true,
    eyeY: null
  });
  const [poseInstance, setPoseInstance] = useState<Pose | null>(null);
  const [cameraInstance, setCameraInstance] = useState<Camera | null>(null);
  const [isActive, setIsActive] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('postureTrackingActive');
    return storedValue ? storedValue === 'true' : true;
  });
  
  const [baselineEye, setBaselineEye] = useState<number | null>(null);
  const baselineRef = useRef<Landmarks | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const latestRef = useRef<Landmarks | null>(null);
  const latestEye = useRef<number | null>(null);
  
  // Initialize pose detection
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(handlePoseResults);
    setPoseInstance(pose);

    return () => {
      pose.close();
      if (cameraInstance) {
        cameraInstance.stop();
      }
    };
  }, []);

  // Process pose detection results
  const handlePoseResults = (results: Results) => {
    // Convert MediaPipe landmarks to our format
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility
      }));
      
      // Store the latest landmarks for calibration
      latestRef.current = landmarks;

      // Get eye line Y position
      const eyeY = getEyeLine(landmarks);
      latestEye.current = eyeY;

      // If posture tracking is not active, show landmarks but don't analyze posture
      if (!isActive) {
        setPoseData({ good: true, landmarks: results.poseLandmarks, eyeY });
        return;
      }
      
      // If no calibration has been done, just display landmarks
      if (!baselineRef.current || baselineEye === null) {
        setPoseData({ good: true, landmarks: results.poseLandmarks, eyeY });
        return;
      }
  
      // Detect posture using the full algorithm
      const { good } = detectPostureWithBaseline(
        landmarks,
        baselineRef.current,
        sensitivity
      );
      
      setPoseData({
        good,
        landmarks: results.poseLandmarks,
        eyeY
      });
    } else {
      // No landmarks detected, maintain existing state
      setPoseData(prev => ({...prev, landmarks: null}));
    }
  };

  // Function to calibrate posture
  const calibrate = () => {
    if (latestRef.current) {
      baselineRef.current = latestRef.current;
      setBaselineEye(getEyeLine(latestRef.current));
      console.log("Baseline eye set:", baselineEye);
    } else {
      console.warn("Cannot calibrate - no landmarks detected yet");
      alert('Hold still a moment until landmarks appear, then try again.');
    }
  };

  // Function to start pose detection on a video element
  const startDetection = (video: HTMLVideoElement) => {
    if (!poseInstance) return;
    
    videoRef.current = video;
    console.log("Starting pose detection on video element");
    
    // Use MediaPipe Camera utility for more efficient frame processing
    const camera = new Camera(video, {
      onFrame: async () => {
        if (videoRef.current && poseInstance) {
          await poseInstance.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });
    
    camera.start()
      .then(() => {
        console.log("Camera started successfully");
        setCameraInstance(camera);
      })
      .catch(err => console.error("Error starting camera:", err));
  };

  // Function to toggle posture tracking active state
  const toggleActive = () => {
    setIsActive(prev => {
      const newValue = !prev;
      localStorage.setItem('postureTrackingActive', newValue.toString());
      return newValue;
    });
  };

  return {
    ...poseData,
    calibrate,
    startDetection,
    isActive,
    toggleActive,
    baselineEye
  };
} 