import { useEffect, useRef, useState } from 'react';
import { Pose, Results, POSE_LANDMARKS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { Landmarks } from '../utils/poseMath';
import { PostureAngles, detectPostureWithBaseline } from '../utils/postureDetect';

export interface PoseData {
  good: boolean;
  neck: number;
  torso: number;
  landmarks?: any;
}

export interface PostureHook extends PoseData {
  calibratePosture: () => void;
  startDetection: (video: HTMLVideoElement) => void;
  isActive: boolean;
  toggleActive: () => void;
}

export function usePosture(enabled = true, sensitivityThreshold = 1.0): PostureHook {
  const [poseData, setPoseData] = useState<PoseData>({
    good: true,
    neck: 0,
    torso: 0
  });
  const [poseInstance, setPoseInstance] = useState<Pose | null>(null);
  const [cameraInstance, setCameraInstance] = useState<Camera | null>(null);
  const [isActive, setIsActive] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('postureTrackingActive');
    return storedValue ? storedValue === 'true' : true;
  });
  
  const baselineRef = useRef<Landmarks | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const latestLandmarksRef = useRef<Landmarks | null>(null);
  
  // Initialize pose detection - always initialize regardless of enabled state
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
    if (results.poseLandmarks) {
      console.log("pose result frame");
    }
    
    // Convert MediaPipe landmarks to our format
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility
      }));
      
      // Store the latest landmarks for calibration
      latestLandmarksRef.current = landmarks;

      // If posture tracking is not active, show landmarks but don't analyze posture
      if (!isActive) {
        setPoseData({ good: true, neck: 0, torso: 0, landmarks: results.poseLandmarks });
        return;
      }
      
      // If no calibration has been done, use the first frame as baseline
      if (!baselineRef.current) {
        baselineRef.current = landmarks;
        console.log("Baseline calibrated automatically, length:", landmarks.length);
        setPoseData({ good: true, neck: 0, torso: 0, landmarks: results.poseLandmarks });
        return;
      }
  
      // Detect posture using the full algorithm
      const postureStatus = detectPostureWithBaseline(
        landmarks,
        baselineRef.current,
        sensitivityThreshold
      );
      
      setPoseData({
        good: postureStatus.good,
        neck: postureStatus.angles.neckPitch,
        torso: postureStatus.angles.torsoAngle,
        landmarks: results.poseLandmarks
      });
    } else {
      // No landmarks detected, maintain existing state
      setPoseData(prev => ({...prev, landmarks: null}));
    }
  };

  // Function to calibrate posture - now uses latestLandmarks
  const calibratePosture = () => {
    if (latestLandmarksRef.current) {
      baselineRef.current = latestLandmarksRef.current;
      console.log("Baseline set:", baselineRef.current.length);
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
    calibratePosture,
    startDetection,
    isActive,
    toggleActive
  };
} 