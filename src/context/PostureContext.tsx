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
import { isGoodPosture } from "@/utils/postureDetect"; // Ensure this path is correct

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
    isGood: true,
    message: "Initializing...",
  });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isLoadingDetector, setIsLoadingDetector] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, timestampMs: number) => { // Corrected type for result
      console.log("PostureContext: handlePoseResults called. Result:", result, "Timestamp:", timestampMs);
      if (result.landmarks && result.landmarks.length > 0) {
        const currentLandmarks = result.landmarks[0]; // Assuming numPoses = 1
        console.log("PostureContext: Setting detectedLandmarks to:", currentLandmarks);
        setDetectedLandmarks(currentLandmarks);

        if (isCalibrated) {
          const status = isGoodPosture(currentLandmarks, baselinePose || null);
          setPostureStatus(status);
          if (!status.isGood) {
            // console.log("Bad posture detected:", status.message);
            // Optionally play sound here
          }
        } else if (baselinePose) { // if baseline is set but not fully "calibrated" (e.g. during initial calibration)
             const status = isGoodPosture(currentLandmarks, baselinePose || null);
             setPostureStatus(status); // Show feedback even during calibration adjustment
        } else {
          setPostureStatus({ isGood: true, message: "Calibrate to begin." });
        }
      } else {
        setDetectedLandmarks(undefined);
        console.log("No landmarks detected in this frame.");
        if (isCalibrated) {
            setPostureStatus({ isGood: false, message: "No person detected." });
        }
      }
    },
    [isCalibrated, baselinePose] // Added baselinePose dependency
  );
  
  const setupPoseDetector = useCallback(async () => {
    setIsLoadingDetector(true);
    setCameraError(null);
    try {
      // Pass the callback to the initialize method
      await poseDetector.initialize(undefined, handlePoseResults); // Default model, provide callback
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
  }, [handlePoseResults]); // Added handlePoseResults dependency


  const startPostureDetection = async () => {
    if (!videoRef.current) {
      setCameraError("Video element not available.");
      return;
    }
    setIsLoadingDetector(true); // Show loading while setting up camera and detector
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }, // Request specific dimensions
      });
      videoRef.current.srcObject = stream;
      await new Promise((resolve) => { // Wait for video to be ready to play
        if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
      });
      await videoRef.current.play();
      console.log("Camera stream started.");

      // Ensure detector is initialized
      if (!poseDetector['poseLandmarker']) { // Check if internal poseLandmarker is set
          console.log("Detector not yet initialized, initializing now...");
          await setupPoseDetector(); 
      }
      
      if (!poseDetector['poseLandmarker']) {
          throw new Error("Pose detector could not be initialized after attempt.");
      }


      console.log("Posture detection starting loop.");
      // Ensure detection state is active before starting loop
      setIsDetecting(true);
      setIsLoadingDetector(false);

      const detectLoop = () => {
        if (!isDetecting || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
          console.log("DETECT LOOP: Exiting. isDetecting:", isDetecting, "videoRef.current:", !!videoRef.current, "paused:", videoRef.current?.paused, "ended:", videoRef.current?.ended);
          if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
          return;
        }
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { // videoRef.current.videoWidth > 0
          const now = performance.now();
          console.log("DETECT LOOP: Attempting to call poseDetector.detect. Video ready state:", videoRef.current.readyState, "Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
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
    // Do not close the detector here if you want to restart detection later without re-initializing.
    // poseDetector.close(); // Only call this on component unmount or app shutdown
    setDetectedLandmarks(undefined);
    setPostureStatus({ isGood: true, message: "Detection stopped." });
  };

  const handleCalibration = () => {
    if (detectedLandmarks && detectedLandmarks.length > 0) {
      // Create a deep copy of the landmarks for the baseline
      const currentBaseline = detectedLandmarks.map(lm => ({ ...lm }));
      setBaselinePose(currentBaseline);
      setIsCalibrated(true);
      setPostureStatus({ isGood: true, message: "Calibrated!" });
      console.log("Posture calibrated with current landmarks:", currentBaseline);
    } else {
      setPostureStatus({ isGood: false, message: "Cannot calibrate - no landmarks detected yet. Ensure you are visible." });
      console.warn("Calibration attempt failed: No landmarks detected.");
    }
  };
  
  // Initialize detector on mount or when videoRef is available
  useEffect(() => {
    // Only initialize once, or if it failed previously
    if (!poseDetector['poseLandmarker'] && videoRef.current) {
        setupPoseDetector();
    }
  }, [setupPoseDetector]); // videoRef.current is not a stable dependency for useEffect directly

  // Add a new useEffect to track detectedLandmarks changes
  useEffect(() => {
    console.log("PostureContext: detectedLandmarks state updated:", detectedLandmarks);
  }, [detectedLandmarks]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopPostureDetection();
      poseDetector.close(); // Close detector when provider unmounts
      console.log("PostureProvider unmounted, detector closed.");
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