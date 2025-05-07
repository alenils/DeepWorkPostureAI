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
  baselinePose: NormalizedLandmark[] | null | undefined, // Explicitly allow null/undefined
  thresholds: { threshold_Y_drop?: number } = { threshold_Y_drop: 0.03 } // Make Y_drop configurable, default to 0.03
): { isGood: boolean; message: string } {
  if (!landmarks || landmarks.length === 0) {
    return { isGood: false, message: "No landmarks detected." };
  }

  const nose = landmarks[POSE_LANDMARKS.NOSE];
  if (!nose) {
    return { isGood: false, message: "Nose landmark missing." };
  }

  // If not calibrated (baselinePose is null/undefined).
  // The message "Ready to calibrate" or "Calibrate to begin" should be set by PostureContext based on its own logic.
  if (!baselinePose) {
    // console.log("POSTURE CHECK: No baseline or not calibrated. Returning default good.");
    return { isGood: true, message: "Calibrate to begin." }; // This message is used if PostureContext calls this *before* its calibration logic sets a more specific message like "Ready to calibrate"
  }

  const baselineNose = baselinePose[POSE_LANDMARKS.NOSE];
  if (!baselineNose) {
    // This case implies baselinePose exists but is somehow malformed for NOSE.
    // This state should ideally be prevented by robust baseline setting.
    console.warn("POSTURE CHECK: Baseline pose set, but baseline nose landmark is missing.");
    return { isGood: false, message: "Calibration error: Baseline nose missing." };
  }

  const calibratedNoseY = baselineNose.y;
  const currentNoseY = nose.y;
  // Use the provided threshold_Y_drop, or default if not in thresholds object.
  const effective_threshold_Y_drop = thresholds.threshold_Y_drop ?? 0.03; // Default to 0.03 if not provided

  // Log the values being compared
  console.log(`POSTURE CHECK (Calibrated): BaselineNoseY: ${calibratedNoseY.toFixed(3)}, CurrentNoseY: ${currentNoseY.toFixed(3)}, DropThreshold: ${effective_threshold_Y_drop.toFixed(3)}, BadIfCurrentGreaterThan: ${(calibratedNoseY + effective_threshold_Y_drop).toFixed(3)}`);

  // Check for head drop: currentNoseY is LARGER if head is lower (Y=0 at top)
  if (currentNoseY > calibratedNoseY + effective_threshold_Y_drop) {
    console.log("POSTURE CHECK: Result -> BAD (Head dropped)");
    return { isGood: false, message: "Head dropped!" };
  }
  
  // Optional X-axis check (re-added from previous logic as it was missing in user's provided snippet for this step)
  const threshold_X_movement = 0.1; 
  if (Math.abs(nose.x - baselineNose.x) > threshold_X_movement) {
    console.log("POSTURE CHECK: Result -> BAD (Head moved sideways)");
    return { isGood: false, message: "Head moved sideways!" };
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