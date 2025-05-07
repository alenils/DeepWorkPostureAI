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
  setBaselinePose: React.Dispatch<
    React.SetStateAction<NormalizedLandmark[] | undefined>
  >;
  handleCalibration: () => void;
  cameraError: string | null;
  postureStatus: { isGood: boolean; message: string };
  isCalibrated: boolean;
  setIsCalibrated: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingDetector: boolean;
  calibrationCount: number; // For forcing callback refresh
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
  const [calibrationCount, setCalibrationCount] = useState(0); // Calibration counter

  const handleCalibration = () => {
    if (detectedLandmarks && detectedLandmarks.length > 0) {
      console.log("CONTEXT: Starting calibration process...");
      setPostureStatus({ isGood: true, message: "Calibrating... Hold still!" }); // Immediate feedback
      setIsCalibrated(false); // Ensure we are in 'calibrating' mode

      setTimeout(() => {
        // Re-read landmarks *after* the delay.
        // Accessing detectedLandmarks directly from state here is generally fine in a timeout started after it's checked.
        const currentDetectedLandmarks = detectedLandmarksRef.current; // Use a ref for the most current landmarks

        if (currentDetectedLandmarks && currentDetectedLandmarks.length > 0) { 
          console.log("CONTEXT: Capturing baseline after delay with current landmarks:", currentDetectedLandmarks);
          const currentBaseline = currentDetectedLandmarks.map(lm => ({ ...lm }));
          setBaselinePose(currentBaseline);
          setIsCalibrated(true); // NOW set calibrated to true
          setCalibrationCount(prevCount => prevCount + 1); // Increment counter
          
          const status = isGoodPosture(currentDetectedLandmarks, currentBaseline); 
          setPostureStatus(status);
          console.log("CONTEXT: Calibration complete. isCalibrated=true. Status:", status);
        } else {
          console.warn("CONTEXT: No landmarks detected after calibration delay. Landmarks ref:", currentDetectedLandmarks);
          setPostureStatus({ isGood: false, message: "Calibration failed: landmarks lost." });
          setIsCalibrated(false); // Stay uncalibrated
        }
      }, 3000); // 3-second delay

    } else {
      console.warn("CONTEXT: Calibration attempt failed: No landmarks detected at start of calibration.");
      setPostureStatus({ isGood: false, message: "Cannot calibrate - no landmarks detected yet." });
    }
  };

  const detectedLandmarksRef = useRef(detectedLandmarks);
  useEffect(() => {
    detectedLandmarksRef.current = detectedLandmarks;
  }, [detectedLandmarks]);

  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, timestampMs: number) => {
      if (result.landmarks && result.landmarks.length > 0) {
        const currentLandmarks = result.landmarks[0];
        setDetectedLandmarks(currentLandmarks); 

        if (isCalibrated && baselinePose) {
          const status = isGoodPosture(currentLandmarks, baselinePose);
          setPostureStatus(status); 
        } else { 
          if (postureStatus.message !== "Calibrating... Hold still!") {
             const preCalibrationStatus = isGoodPosture(currentLandmarks, null);
             // Check detectedLandmarks from state directly for this message, as currentLandmarks is definitely present here.
             const message = currentLandmarks && currentLandmarks.length > 0 ? "Ready to calibrate." : "Initializing detector...";
             setPostureStatus({isGood: preCalibrationStatus.isGood, message: message});
          }
        }
      } else {
         setDetectedLandmarks(undefined);
         if (isCalibrated) { 
             setPostureStatus({ isGood: false, message: "No person detected." });
         } else if (postureStatus.message !== "Calibrating... Hold still!") {
             setPostureStatus({ isGood: true, message: "Initializing detector..." });
         }
      }
    },
    [isCalibrated, baselinePose, calibrationCount, postureStatus.message, POSE_LANDMARKS] 
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
      await new Promise<void>((resolve) => { 
        if (videoRef.current) videoRef.current.onloadedmetadata = () => resolve();
      });
      await videoRef.current.play();
      console.log("Camera stream started.");

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
    // setPostureStatus({ isGood: true, message: "Detection stopped." }); // Keep current status unless explicitly reset
  };
  
  useEffect(() => {
    if (!poseDetector['poseLandmarker'] && videoRef.current && !isLoadingDetector) {
        setupPoseDetector();
    }
  }, [setupPoseDetector, isLoadingDetector]); 

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
        setBaselinePose,
        handleCalibration,
        cameraError,
        postureStatus,
        isCalibrated,
        setIsCalibrated,
        isLoadingDetector,
        calibrationCount,
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