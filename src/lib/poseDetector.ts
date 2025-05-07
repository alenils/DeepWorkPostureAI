import {
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerOptions,
  PoseLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

class PoseDetector {
  private poseLandmarker?: PoseLandmarker;
  private resultCallback?: (result: PoseLandmarkerResult, timestampMs: number) => void;
  private lastVideoTime = -1;

  async initialize(
    modelAssetPath: string = "/models/pose_landmarker_lite.task",
    resultCallback: (result: PoseLandmarkerResult, timestampMs: number) => void
  ): Promise<void> {
    this.resultCallback = resultCallback;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "/wasm"
      );

      const options: PoseLandmarkerOptions = {
        baseOptions: {
          modelAssetPath: modelAssetPath,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      };

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, options);
      console.log("PoseLandmarker initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize PoseLandmarker:", error);
      throw error;
    }
  }

  detect(videoElement: HTMLVideoElement, timestampMs: number): void {
    if (!this.poseLandmarker || !this.resultCallback || !videoElement) {
      // console.warn("PoseLandmarker not initialized, callback not set, or video element missing.");
      return;
    }

    // Prevent processing the same frame multiple times
    if (videoElement.currentTime === this.lastVideoTime) {
        return;
    }
    this.lastVideoTime = videoElement.currentTime;

    console.log("PoseDetector.detect called. Timestamp:", timestampMs, "Callback defined:", !!this.resultCallback);

    // The actual detection happens via the callback provided during initialization
    this.poseLandmarker.detectForVideo(videoElement, timestampMs, (result) => {
        console.log("PoseLandmarker raw result in detector:", result);
        this.resultCallback!(result, timestampMs);
    });
  }

  close(): void {
    this.poseLandmarker?.close();
    console.log("PoseLandmarker closed.");
  }
}

const poseDetector = new PoseDetector();
export default poseDetector; 