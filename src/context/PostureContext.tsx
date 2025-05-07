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

  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, timestampMs: number) => { 
      // console.log("PostureContext: handlePoseResults called. Result:", result, "Timestamp:", timestampMs); // Verbose
      if (result.landmarks && result.landmarks.length > 0) {
        const currentLandmarks = result.landmarks[0]; // Assuming numPoses = 1
        setDetectedLandmarks(currentLandmarks);

        if (isCalibrated && baselinePose) {
          const baselineNoseY = baselinePose[POSE_LANDMARKS.NOSE]?.y;
          console.log(`CONTEXT: Judging with calibration. isCalibrated: ${isCalibrated}, BaselineNoseY: ${baselineNoseY?.toFixed(3)}`);
          const status = isGoodPosture(currentLandmarks, baselinePose);
          setPostureStatus(status);
        } else {
          console.log(`CONTEXT: Not yet calibrated or baseline missing. isCalibrated: ${isCalibrated}, baselinePose defined: ${!!baselinePose}`);
          const preCalibrationStatus = isGoodPosture(currentLandmarks, null); 
          setPostureStatus({isGood: preCalibrationStatus.isGood, message: "Ready to calibrate."});
        }
      } else {
        setDetectedLandmarks(undefined);
        if (isCalibrated) {
            setPostureStatus({ isGood: false, message: "No person detected." });
        } else {
            setPostureStatus({ isGood: true, message: "No person detected. Waiting for tracking..." });
        }
      }
    },
    [isCalibrated, baselinePose, POSE_LANDMARKS] 
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
      await new Promise((resolve) => { 
        if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
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
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
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
    setPostureStatus({ isGood: true, message: "Detection stopped." });
  };

  const handleCalibration = () => {
    if (detectedLandmarks && detectedLandmarks.length > 0) {
      const currentBaseline = detectedLandmarks.map(lm => ({ ...lm }));
      setBaselinePose(currentBaseline);
      setIsCalibrated(true);
      const currentLandmarks = detectedLandmarks; // Use existing checked variable
      const status = isGoodPosture(currentLandmarks, currentBaseline); 
      setPostureStatus(status); 
      console.log("CONTEXT: Calibration successful. Initial status after calibration:", status);
    } else {
      setPostureStatus({ isGood: false, message: "Cannot calibrate - no landmarks detected yet. Ensure you are visible." });
      console.warn("Calibration attempt failed: No landmarks detected.");
    }
  };
  
  useEffect(() => {
    if (!poseDetector['poseLandmarker'] && videoRef.current && !isLoadingDetector) {
        setupPoseDetector();
    }
  }, [setupPoseDetector, isLoadingDetector]); 

  useEffect(() => {
    // console.log("PostureContext: detectedLandmarks state updated:", detectedLandmarks); // Verbose
  }, [detectedLandmarks]);

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