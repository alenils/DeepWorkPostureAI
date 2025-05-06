import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [isActive, setIsActive] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('postureTrackingActive');
    return storedValue ? storedValue === 'true' : true;
  });
  
  const [baselineEye, setBaselineEye] = useState<number | null>(null);
  const baselineRef = useRef<Landmarks | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const latestRef = useRef<Landmarks | null>(null);
  const latestEye = useRef<number | null>(null);
  
  // Use refs instead of state for pose and camera to prevent recreation
  const poseRef = useRef<Pose>();
  const cameraRef = useRef<Camera>();
  const startedRef = useRef(false);
  
  // Store active state and sensitivity in refs to avoid dependency issues
  const isActiveRef = useRef(isActive);
  const sensitivityRef = useRef(sensitivity);
  const baselineEyeRef = useRef(baselineEye);
  
  // Update refs when state changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);
  
  useEffect(() => {
    baselineEyeRef.current = baselineEye;
  }, [baselineEye]);
  
  // Process pose detection results - stable reference that doesn't change
  const handlePoseResults = useCallback((results: Results) => {
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
      if (!isActiveRef.current) {
        setPoseData({ good: true, landmarks: results.poseLandmarks, eyeY });
        return;
      }
      
      // If no calibration has been done, just display landmarks
      if (!baselineRef.current || baselineEyeRef.current === null) {
        setPoseData({ good: true, landmarks: results.poseLandmarks, eyeY });
        return;
      }
  
      // Detect posture using the full algorithm
      const { good } = detectPostureWithBaseline(
        landmarks,
        baselineRef.current,
        sensitivityRef.current
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
  }, []); // Empty deps because we're using refs for all dependencies

  // Initialize camera and pose exactly once
  useEffect(() => {
    if (startedRef.current) return;
    if (!videoRef.current) return;

    const pose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({ 
      modelComplexity: 1, 
      smoothLandmarks: true,
      minDetectionConfidence: 0.5, 
      minTrackingConfidence: 0.5 
    });
    pose.onResults(handlePoseResults);
    poseRef.current = pose;

    const cam = new Camera(videoRef.current, {
      width: 640, 
      height: 480,
      onFrame: async () => pose.send({ image: videoRef.current! })
    });
    cam.start().then(() => console.log('[Posture] camera started'));
    cameraRef.current = cam;

    startedRef.current = true;

    // Cleanup on unmount
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
      startedRef.current = false;
    };
  }, []); // Empty deps - runs only once

  // Function to calibrate posture
  const calibrate = useCallback(() => {
    if (latestRef.current) {
      baselineRef.current = latestRef.current;
      const eyeLine = getEyeLine(latestRef.current);
      setBaselineEye(eyeLine);
      console.log("Baseline eye set:", eyeLine);
    } else {
      console.warn("Cannot calibrate - no landmarks detected yet");
      alert('Hold still a moment until landmarks appear, then try again.');
    }
  }, []);

  // Function to start pose detection on a video element - simplified
  const startDetection = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  // Function to toggle posture tracking active state
  const toggleActive = useCallback(() => {
    setIsActive(prev => {
      const newValue = !prev;
      localStorage.setItem('postureTrackingActive', newValue.toString());
      return newValue;
    });
  }, []);

  return {
    ...poseData,
    calibrate,
    startDetection,
    isActive,
    toggleActive,
    baselineEye
  };
} 