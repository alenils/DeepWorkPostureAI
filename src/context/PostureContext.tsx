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

// Update the PostureContextType interface
interface PostureContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  startPostureDetection: () => Promise<void>;
  stopPostureDetection: () => void;
  isDetecting: boolean;
  detectedLandmarks: NormalizedLandmark[] | undefined; // Updated type
  baselinePose: NormalizedLandmark[] | undefined; // Updated type
  handleCalibration: () => void;
  cameraError: string | null;
  postureStatus: { isGood: boolean; message: string };
  isCalibrated: boolean;
  isLoadingDetector: boolean;
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
  const [baselinePose, setBaselinePose] = useState<
    NormalizedLandmark[] | undefined
  >(undefined);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [postureStatus, setPostureStatus] = useState<{ isGood: boolean; message: string }>({
    isGood: true, // Default to green bar initially, or false for red
    message: "Initializing detector...", 
  });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isLoadingDetector, setIsLoadingDetector] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const detectingRef = useRef<boolean>(false); // Ref to track detection across closures

  // Refs for state values to be accessed in the poseDetector callback
  const isCalibratedRef = useRef(isCalibrated);
  const baselinePoseRef = useRef(baselinePose);
  const detectedLandmarksRef = useRef(detectedLandmarks);
  const postureStatusRef = useRef(postureStatus);

  // Effects to keep refs in sync with state
  useEffect(() => {
    isCalibratedRef.current = isCalibrated;
  }, [isCalibrated]);

  useEffect(() => {
    baselinePoseRef.current = baselinePose;
  }, [baselinePose]);

  useEffect(() => {
    detectedLandmarksRef.current = detectedLandmarks;
  }, [detectedLandmarks]);

  useEffect(() => {
    postureStatusRef.current = postureStatus;
  }, [postureStatus]);

  const handleCalibration = () => {
    const landmarksForCalibrationStart = detectedLandmarksRef.current;

    if (landmarksForCalibrationStart && landmarksForCalibrationStart.length > 0) {
      console.log("CONTEXT: Starting calibration process with current landmarks:", landmarksForCalibrationStart);
      setPostureStatus({ isGood: true, message: "Calibrating... Hold still!" }); 
      setIsCalibrated(false); // Ensure we are in 'calibrating' mode, not yet fully calibrated

      setTimeout(() => {
        const currentLandmarksAfterDelay = detectedLandmarksRef.current;
        if (currentLandmarksAfterDelay && currentLandmarksAfterDelay.length > 0) { 
          console.log("CONTEXT: Capturing baseline after delay using landmarks:", currentLandmarksAfterDelay);
          const currentBaseline = currentLandmarksAfterDelay.map(lm => ({ ...lm }));
          
          setBaselinePose(currentBaseline); // Set state, ref will update via its useEffect
          setIsCalibrated(true);          // Set state, ref will update via its useEffect
          
          const status = isGoodPosture(currentLandmarksAfterDelay, currentBaseline); 
          setPostureStatus(status); // Set state, ref will update via its useEffect
          console.log("CONTEXT: Calibration complete. isCalibrated state set to true. Status:", status);
        } else {
          console.warn("CONTEXT: No landmarks detected after calibration delay. Cannot complete calibration.");
          setPostureStatus({ isGood: false, message: "Calibration failed: landmarks lost during delay." });
          setIsCalibrated(false); // Remain uncalibrated
        }
      }, 3000); // 3-second delay

    } else {
      console.warn("CONTEXT: Calibration attempt failed: No landmarks detected at start of calibration.");
      setPostureStatus({ isGood: false, message: "Cannot calibrate - no landmarks detected yet." });
    }
  };

  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, timestampMs: number) => {
      const currentIsCalibrated = isCalibratedRef.current; 
      const currentBaselinePose = baselinePoseRef.current;
      const currentPostureStatusMessage = postureStatusRef.current.message;

      if (result.landmarks && result.landmarks.length > 0) {
        const newLandmarksFromDetector = result.landmarks[0];
        // Update state, which then updates detectedLandmarksRef.current via its useEffect
        setDetectedLandmarks(newLandmarksFromDetector); 

        if (currentIsCalibrated && currentBaselinePose) { 
          const baselineNoseY = currentBaselinePose[POSE_LANDMARKS.NOSE]?.y;
          console.log(`CONTEXT: Judging with calibration. isCalibratedRef: ${currentIsCalibrated}, BaselineNoseY: ${baselineNoseY?.toFixed(3)}`);
          const status = isGoodPosture(newLandmarksFromDetector, currentBaselinePose); 
          setPostureStatus(status); 
        } else { 
          if (currentPostureStatusMessage !== "Calibrating... Hold still!") {
            console.log(`CONTEXT: Not yet calibrated. isCalibratedRef: ${currentIsCalibrated}, baselinePoseRef defined: ${!!currentBaselinePose}`);
            const preCalibrationStatus = isGoodPosture(newLandmarksFromDetector, null);
            const message = newLandmarksFromDetector.length > 0 ? "Ready to calibrate." : "Initializing detector...";
            setPostureStatus({isGood: preCalibrationStatus.isGood, message: message});
          }
        }
      } else {
         setDetectedLandmarks(undefined);
         if (currentIsCalibrated) { 
             setPostureStatus({ isGood: false, message: "No person detected." });
         } else if (currentPostureStatusMessage !== "Calibrating... Hold still!") {
             setPostureStatus({ isGood: true, message: "Initializing detector..." });
         }
      }
    },
    [postureStatus.message, POSE_LANDMARKS] // Simplified dependencies
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

      console.log("Posture detection starting loop.");
      setIsDetecting(true);
      detectingRef.current = true; 
      setIsLoadingDetector(false);

      const detectLoop = () => {
        if (!detectingRef.current || !videoRef.current || !videoRef.current.srcObject || videoRef.current.paused || videoRef.current.ended) {
          if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
          return;
        }
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoRef.current.videoWidth > 0) {
          const now = performance.now();
          poseDetector.detect(videoRef.current, now);
        }
        animationFrameId.current = requestAnimationFrame(detectLoop);
      };
      detectLoop();

    } catch (err) {
      console.error("Error starting posture detection:", err);
      setCameraError(
        `Error accessing camera or starting detection: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setIsDetecting(false);
      setIsLoadingDetector(false);
    }
  };

  const stopPostureDetection = () => {
    console.log("Stopping posture detection.");
    detectingRef.current = false; 
    setIsDetecting(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      console.log("Camera stream stopped.");
    }
    setDetectedLandmarks(undefined);
  };
  
  useEffect(() => {
    if (videoRef.current && !poseDetector['poseLandmarker'] && !isLoadingDetector) {
        setupPoseDetector();
    }
  }, [isLoadingDetector, setupPoseDetector]); 

  useEffect(() => {
    return () => { 
      stopPostureDetection();
      if (poseDetector && typeof poseDetector.close === 'function') {
          poseDetector.close(); 
          console.log("PostureProvider unmounted, detector closed.");
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
        baselinePose,
        handleCalibration,
        cameraError,
        postureStatus,
        isCalibrated,
        isLoadingDetector,
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