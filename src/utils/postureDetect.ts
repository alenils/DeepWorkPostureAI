import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Define POSE_LANDMARKS indices based on MediaPipe documentation for PoseLandmarker v2
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

export function calculateAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  // Ensure a, b, c are valid landmarks before accessing x, y
  if (!a || !b || !c) return 0;

  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

export function isGoodPosture(
  landmarks: NormalizedLandmark[],
  baselinePose: NormalizedLandmark[] | null | undefined,
  // Adjust default thresholds
  thresholds: { 
    threshold_Y_drop?: number; 
    tiltThreshold?: number; 
    forwardLeanThresholdX?: number;
    leanBackThresholdX?: number; 
  } = { 
    threshold_Y_drop: 0.025,    // Slightly less sensitive drop
    tiltThreshold: 0.025,       // Keep tilt sensitivity
    forwardLeanThresholdX: 0.035, // Slightly less sensitive forward lean
    leanBackThresholdX: 0.05     // *** MUCH less sensitive lean back ***
  }
): { isGood: boolean; message: string } {
  if (!landmarks || landmarks.length === 0) {
    return { isGood: false, message: "No landmarks detected." };
  }

  const nose = landmarks[POSE_LANDMARKS.NOSE];
  if (!nose) {
    return { isGood: false, message: "Nose landmark missing." };
  }

  if (!baselinePose) {
    return { isGood: true, message: "Calibrate to begin." }; 
  }

  const baselineNose = baselinePose[POSE_LANDMARKS.NOSE];
  if (!baselineNose) {
    console.warn("POSTURE CHECK: Baseline pose set, but baseline nose landmark is missing.");
    return { isGood: false, message: "Calibration error: Baseline nose missing." };
  }
  
  // Get necessary landmarks for other checks
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // --- Head Drop Check --- 
  const calibratedNoseY = baselineNose.y;
  const currentNoseY = nose.y;
  const effective_threshold_Y_drop = thresholds.threshold_Y_drop ?? 0.025; // Use default from signature

  // console.log(`POSTURE CHECK (Calibrated): BaselineNoseY: ${calibratedNoseY.toFixed(3)}, CurrentNoseY: ${currentNoseY.toFixed(3)}, DropThreshold: ${effective_threshold_Y_drop.toFixed(3)}, BadIfCurrentGreaterThan: ${(calibratedNoseY + effective_threshold_Y_drop).toFixed(3)}`);

  if (currentNoseY > calibratedNoseY + effective_threshold_Y_drop) {
    console.log("POSTURE CHECK: Result -> BAD (Head dropped)");
    return { isGood: false, message: "Head dropped!" };
  }
  
  // --- Sideways Head Movement / Tilt Check --- 
  const threshold_sideways_nose_movement = 0.03; // Keep this relatively tight for now
  if (Math.abs(nose.x - baselineNose.x) > threshold_sideways_nose_movement) {
    console.log("POSTURE CHECK: Result -> BAD (Head moved sideways)");
    return { isGood: false, message: "Head moved sideways!" };
  }
  if (leftEar && rightEar) {
    const effective_tiltThreshold = thresholds.tiltThreshold ?? 0.025; // Use default from signature
    if (Math.abs(leftEar.y - rightEar.y) > effective_tiltThreshold) {
        console.log("POSTURE CHECK: Result -> BAD (Head tilted)");
        return { isGood: false, message: "Head tilted!" };
    }
  }
  
  // --- Forward Lean / Lean Back Check --- 
  if (leftEar && rightEar && leftShoulder && rightShoulder) {
    const earCenterX = (leftEar.x + rightEar.x) / 2;
    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    
    const effective_forwardLeanThresholdX = thresholds.forwardLeanThresholdX ?? 0.035; // Use default
    if (earCenterX < shoulderCenterX - effective_forwardLeanThresholdX) {
        console.log("POSTURE CHECK: Result -> BAD (Leaning forward)");
        return { isGood: false, message: "Leaning forward!" };
    }

    const effective_leanBackThresholdX = thresholds.leanBackThresholdX ?? 0.05; // Use default
    if (earCenterX > shoulderCenterX + effective_leanBackThresholdX) {
       console.log("POSTURE CHECK: Result -> BAD (Leaning back)");
       return { isGood: false, message: "Leaning back!" };
    }
  }

  console.log("POSTURE CHECK: Result -> GOOD");
  return { isGood: true, message: "Posture OK!" };
}

// Get the Y coordinate of the eye line for display purposes
export function getEyeLine(landmarks: NormalizedLandmark[]): number {
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE];
  
  if (!leftEye || !rightEye) {
    // console.warn("Eye landmarks not available for eye line calculation.");
    return 0; // Return 0 or some default if eyes aren't detected
  }
  // Use the average Y position of the eyes
  return (leftEye.y + rightEye.y) / 2;
} 