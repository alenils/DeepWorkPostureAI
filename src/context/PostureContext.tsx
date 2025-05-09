import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
// Ensure poseDetector is imported correctly (default export from the modified file)
import poseDetector from "@/lib/poseDetector"; // Check this path if build fails
import {
  PoseLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { isGoodPosture, POSE_LANDMARKS } from "@/utils/postureDetect"; // Ensure this path is correct

// Define structure for baseline metrics
interface BaselineMetrics {
  noseY: number;
  noseX: number; 
  // shoulderY: number; // Not needed for current ref logic + lean check
  earShoulderDistX: number; // For lean check
  // noseShoulderDiffY: number; // Not needed
}

// Update the PostureContextType interface
interface PostureContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  startPostureDetection: () => Promise<void>;
  stopPostureDetection: () => void;
  isDetecting: boolean;
  detectedLandmarks: NormalizedLandmark[] | undefined;
  baselineMetrics: BaselineMetrics | null | undefined;
  handleCalibration: () => void;
  cameraError: string | null;
  postureStatus: { isGood: boolean; message: string };
  isCalibrated: boolean;
  isCalibrating: boolean;
  isLoadingDetector: boolean;
  countdown: number | null;
  sensitivityPercentage: number;
  setSensitivityPercentage: React.Dispatch<React.SetStateAction<number>>;
}

const PostureContext = createContext<PostureContextType | undefined>(undefined);

export const PostureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLandmarks, setDetectedLandmarks] = useState<
    NormalizedLandmark[] | undefined
  >(undefined);
  const [baselineMetrics, setBaselineMetrics] = useState<BaselineMetrics | null | undefined>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [postureStatus, setPostureStatus] = useState<{ isGood: boolean; message: string }>({
    isGood: true, // Default to green bar initially, or false for red
    message: "Initializing detector...", 
  });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false); // State for calibration process
  const [isLoadingDetector, setIsLoadingDetector] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null); // State for countdown display
  const [sensitivityPercentage, setSensitivityPercentage] = useState(10); // New: Default to 10%
  const intervalIdRef = useRef<number | null>(null);
  const detectingRef = useRef<boolean>(false);
  const calibrationTimerRef = useRef<number | null>(null); // Ref for calibration countdown timer

  // Refs for state values
  const isCalibratedRef = useRef(isCalibrated);
  const baselineMetricsRef = useRef(baselineMetrics);
  const detectedLandmarksRef = useRef(detectedLandmarks);
  const postureStatusRef = useRef(postureStatus);
  const sensitivityPercentageRef = useRef(sensitivityPercentage); // New Ref

  // Effects to keep refs in sync with state
  useEffect(() => {
    isCalibratedRef.current = isCalibrated;
  }, [isCalibrated]);

  useEffect(() => {
    baselineMetricsRef.current = baselineMetrics;
  }, [baselineMetrics]);

  useEffect(() => {
    detectedLandmarksRef.current = detectedLandmarks;
  }, [detectedLandmarks]);

  useEffect(() => {
    postureStatusRef.current = postureStatus;
  }, [postureStatus]);

  useEffect(() => { // New effect to sync sensitivityPercentageRef
    sensitivityPercentageRef.current = sensitivityPercentage;
  }, [sensitivityPercentage]);

  const handleCalibration = () => {
    if (calibrationTimerRef.current) { // Prevent starting if already calibrating
      console.log("CONTEXT: Calibration already in progress.");
      return; 
    }
    if (isDetecting && !isLoadingDetector && !cameraError) { // Ensure detection is active and ready
      const landmarksForCalibrationStart = detectedLandmarksRef.current;

      if (landmarksForCalibrationStart && landmarksForCalibrationStart.length > 0) {
        console.log("CONTEXT: Starting calibration countdown...");
        setIsCalibrating(true); // Set calibrating flag
        setIsCalibrated(false); // Not fully calibrated yet
        setCountdown(3);
        setPostureStatus({ isGood: true, message: "Calibrating... 3" });

        let currentCountdown = 3;
        calibrationTimerRef.current = window.setInterval(() => { // Use window.setInterval
          currentCountdown -= 1;
          setCountdown(currentCountdown);

          if (currentCountdown > 0) {
            setPostureStatus({ isGood: true, message: `Calibrating... ${currentCountdown}` });
          } else {
            // Countdown finished
            if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
            calibrationTimerRef.current = null;
            setPostureStatus({ isGood: true, message: `Capturing...` }); 
            setCountdown(null);

            console.log("CONTEXT: Capturing baseline metrics after countdown...");
            const landmarksAtCalibrationTime = detectedLandmarksRef.current;
            const nose = landmarksAtCalibrationTime?.[POSE_LANDMARKS.NOSE];
            const leftEar = landmarksAtCalibrationTime?.[POSE_LANDMARKS.LEFT_EAR];
            const leftShoulder = landmarksAtCalibrationTime?.[POSE_LANDMARKS.LEFT_SHOULDER];

            // Calculate baseline metrics
            if (landmarksAtCalibrationTime && nose?.x && nose?.y && leftEar?.x && leftShoulder?.x) { 
              const metrics: BaselineMetrics = {
                noseY: nose.y,
                noseX: nose.x,
                earShoulderDistX: Math.abs(leftEar.x - leftShoulder.x)
              };
              setBaselineMetrics(metrics); // Store calculated metrics
              setIsCalibrated(true); // Calibration complete
              setIsCalibrating(false);
              // Check posture immediately with the new metrics and sensitivity
              const status = isGoodPosture(landmarksAtCalibrationTime, metrics, sensitivityPercentageRef.current); 
              setPostureStatus(status);
              console.log("CONTEXT: Calibration complete. isCalibrated=true. Metrics:", metrics, "Status:", status, "Sensitivity:", sensitivityPercentageRef.current);
            } else {
              console.warn("CONTEXT: Could not calculate baseline metrics - missing required landmarks after delay.");
              setPostureStatus({ isGood: false, message: "Calibration failed: landmarks lost." });
              setIsCalibrated(false);
              setIsCalibrating(false);
              setBaselineMetrics(null); // Ensure metrics are null
            }
          }
        }, 1000); // 1-second interval

      } else {
        console.warn("CONTEXT: Calibration attempt failed: Required landmarks missing.");
        setPostureStatus({ isGood: false, message: "Cannot calibrate - landmarks missing." });
        setIsCalibrating(false); // Ensure calibrating is false if failed to start
      }
    } else {
        console.warn("CONTEXT: Cannot calibrate - detection not active or ready.");
        setPostureStatus({ isGood: false, message: "Cannot calibrate - detector not ready." });
    }
  };

  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, timestampMs: number) => {
      const currentIsCalibrated = isCalibratedRef.current;
      const currentBaselineMetrics = baselineMetricsRef.current;
      const currentSensitivityPercentage = sensitivityPercentageRef.current; // Get current sensitivity
      const currentPostureStatusMessage = postureStatusRef.current.message;

      if (result.landmarks && result.landmarks.length > 0) {
        const newLandmarksFromDetector = result.landmarks[0];
        setDetectedLandmarks(newLandmarksFromDetector);

        if (currentIsCalibrated && currentBaselineMetrics) {
          const status = isGoodPosture(newLandmarksFromDetector, currentBaselineMetrics, currentSensitivityPercentage); // Pass sensitivity
          setPostureStatus(status);
        } else if (!isCalibrating) { // Only update if not in the middle of calibrating
          const preCalibrationStatus = isGoodPosture(newLandmarksFromDetector, null, currentSensitivityPercentage); // Pass sensitivity
          const message = newLandmarksFromDetector.length > 0 ? "Ready to calibrate." : "Initializing detector...";
          setPostureStatus({ isGood: preCalibrationStatus.isGood, message: message });
        }
        // If isCalibrating is true, do nothing here, let handleCalibration manage the message

      } else {
        setDetectedLandmarks(undefined);
        if (currentIsCalibrated) {
          setPostureStatus({ isGood: false, message: "No person detected." });
        } else if (!isCalibrating) { // Only update if not calibrating
          setPostureStatus({ isGood: true, message: "Initializing detector..." });
        }
      }
    },
    [isCalibrating] // Depend on isCalibrating to change behavior based on calibration state
                    // POSE_LANDMARKS is constant, refs handle state access
  );
  
  const setupPoseDetector = useCallback(async () => {
    setIsLoadingDetector(true);
    setCameraError(null);
    try {
      await poseDetector.initialize(undefined, handlePoseResults); 
      console.log("Pose detector initialized in context.");
    } catch (error) {
      console.error("Error initializing pose detector in context:", error);
      setCameraError(
        `Failed to initialize pose detector: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoadingDetector(false);
    }
  }, [handlePoseResults]);

  const startPostureDetection = async () => {
    if (!videoRef.current) {
      setCameraError("Video element not available.");
      return;
    }
    setIsLoadingDetector(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }, 
      });
      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve, reject) => { 
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
          videoRef.current.onerror = () => reject(new Error("Video load error"));
        } else {
          reject(new Error("Video element not available for metadata load"));
        }
      });
      if (videoRef.current) {
        await videoRef.current.play();
        console.log("Camera stream started.");
      } else {
        throw new Error("Video element became unavailable after metadata load.");
      }
      
      if (!poseDetector['poseLandmarker']) { 
          console.log("Detector not yet initialized, initializing now...");
          await setupPoseDetector(); 
      }
      
      if (!poseDetector['poseLandmarker']) {
          throw new Error("Pose detector could not be initialized after attempt.");
      }

      console.log("CONTEXT: Posture detection starting interval (500ms).");
      setIsDetecting(true);
      detectingRef.current = true;
      setIsLoadingDetector(false);

      if (intervalIdRef.current) clearInterval(intervalIdRef.current);

      intervalIdRef.current = window.setInterval(() => {
        if (detectingRef.current && videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoRef.current.videoWidth > 0) {
          const now = performance.now();
          poseDetector.detect(videoRef.current, now);
        } else if (!detectingRef.current) {
             if (intervalIdRef.current) clearInterval(intervalIdRef.current);
             intervalIdRef.current = null;
        }
      }, 500);

    } catch (err) {
      console.error("Error starting posture detection:", err);
      setCameraError(
        `Error accessing camera or starting detection: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setIsDetecting(false);
      detectingRef.current = false;
      setIsLoadingDetector(false);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
  };

  const stopPostureDetection = () => {
    console.log("CONTEXT: Stopping posture detection.");
    detectingRef.current = false;
    setIsDetecting(false);

    if (intervalIdRef.current) { 
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      console.log("CONTEXT: Detection interval cleared.");
    }
    if (calibrationTimerRef.current) { 
      clearInterval(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
      console.log("CONTEXT: Calibration timer cleared during stop.");
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
          console.log("Stopping track:", track.kind, track.label);
          track.stop(); 
      });
      videoRef.current.srcObject = null;
      console.log("CONTEXT: Camera stream stopped and srcObject cleared.");
    } else {
      console.log("CONTEXT: No active stream found to stop.");
    }

    setDetectedLandmarks(undefined);
    setIsCalibrated(false); 
    setBaselineMetrics(null);
    setIsCalibrating(false); 
    setCountdown(null);
    setPostureStatus({ isGood: true, message: "Detection stopped." });
  };
  
  useEffect(() => {
    if (videoRef.current && !poseDetector['poseLandmarker'] && !isLoadingDetector) {
        setupPoseDetector();
    }
  }, [isLoadingDetector, setupPoseDetector]); 

  useEffect(() => {
    return () => { 
      console.log("CONTEXT: PostureProvider unmounting cleanup.");
      if (calibrationTimerRef.current) { // Clear calibration timer
        clearInterval(calibrationTimerRef.current);
      }
      if (intervalIdRef.current) { // Clear detection interval
        clearInterval(intervalIdRef.current);
      }
      // Explicitly stop tracks before closing detector
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        console.log("Camera stream stopped during unmount cleanup.")
      } 
      if (poseDetector && typeof poseDetector.close === 'function') {
          poseDetector.close(); 
          console.log("CONTEXT: Pose detector closed during unmount cleanup.");
      }
    };
  }, []);

  return (
    <PostureContext.Provider
      value={{
        videoRef,
        startPostureDetection,
        stopPostureDetection,
        isDetecting,
        detectedLandmarks,
        baselineMetrics,
        handleCalibration,
        cameraError,
        postureStatus,
        isCalibrated,
        isCalibrating,
        isLoadingDetector,
        countdown,
        sensitivityPercentage,
        setSensitivityPercentage,
      }}
    >
      {children}
    </PostureContext.Provider>
  );
};

export const usePosture = (): PostureContextType => {
  const context = useContext(PostureContext);
  if (context === undefined) {
    throw new Error("usePosture must be used within a PostureProvider");
  }
  return context;
}; 