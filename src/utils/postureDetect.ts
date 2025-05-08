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
  if (!a || !b || !c) return 0;
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

// Import or define BaselineMetrics interface here
interface BaselineMetrics {
  noseY: number;
  noseX: number; 
  earShoulderDistX: number; 
}

// Update function signature to accept BaselineMetrics
export function isGoodPosture(
  landmarks: NormalizedLandmark[],
  baselineMetrics: BaselineMetrics | null | undefined // Changed type here
): { isGood: boolean; message: string } {

  // --- Reference App Thresholds (Reverted) ---
  const Y_NOSE_THRESHOLD = 0.06; 
  const X_NOSE_THRESHOLD = 0.06;
  const Y_EAR_TILT_THRESHOLD = 0.03; 
  // EAR_SHOULDER_DIST_THRESHOLD is removed as lean check is commented out
  // ---

  // Check for required landmarks (Nose, Ears, Shoulders for lean check)
  const requiredIndices = [0, 7, 8, 11, 12];
  const maxRequiredIndex = Math.max(...requiredIndices);
  if (!landmarks || landmarks.length <= maxRequiredIndex) {
    return { isGood: false, message: "Key landmarks missing." }; 
  }

  // Get current landmarks
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  // const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]; // Not strictly needed for current checks

  // Check if all needed landmarks are valid
  if (!nose?.x || !nose?.y || !leftEar?.x || !leftEar?.y || !rightEar?.y || !leftShoulder?.x /*|| !leftShoulder?.y || !rightShoulder?.y*/) {
     console.warn("POSTURE CHECK: Missing required coordinate data.");
     return { isGood: false, message: "Landmark data error!" }; 
  }

  // If not calibrated (baselineMetrics is null/undefined), return neutral state
  if (!baselineMetrics) {
    return { isGood: true, message: "Calibrate to begin." }; 
  }

  // --- Perform Checks using Baseline Metrics --- 

  // 1. Check Vertical Nose Difference vs Baseline Nose Y
  const yDiff = Math.abs(nose.y - baselineMetrics.noseY);
  if (yDiff > Y_NOSE_THRESHOLD) {
    console.log(`POSTURE CHECK: Result -> BAD (Nose Y Diff: ${yDiff.toFixed(3)} > ${Y_NOSE_THRESHOLD})`);
    return { isGood: false, message: "Vertical head position changed!" }; 
  }

  // 2. Check Horizontal Nose Difference vs Baseline Nose X 
  const xDiff = Math.abs(nose.x - baselineMetrics.noseX);
  if (xDiff > X_NOSE_THRESHOLD) {
    console.log(`POSTURE CHECK: Result -> BAD (Nose X Diff: ${xDiff.toFixed(3)} > ${X_NOSE_THRESHOLD})`);
    return { isGood: false, message: "Horizontal head position changed!" };
  }

  // 3. Check Ear Tilt (Current Frame Only)
  const earDiffY = Math.abs(leftEar.y - rightEar.y);
  if (earDiffY > Y_EAR_TILT_THRESHOLD) {
    console.log(`POSTURE CHECK: Result -> BAD (Ear Y Diff: ${earDiffY.toFixed(3)} > ${Y_EAR_TILT_THRESHOLD})`);
    return { isGood: false, message: "Head tilted!" }; 
  }
      
  /* // Temporarily COMMENT OUT Lean Check
  const EAR_SHOULDER_DIST_THRESHOLD = 0.05; // Value from previous step, now ignored
  const currentEarShoulderDistX = Math.abs(leftEar.x - leftShoulder.x); 
  if (typeof baselineMetrics.earShoulderDistX === 'number') { 
      if (Math.abs(currentEarShoulderDistX - baselineMetrics.earShoulderDistX) > EAR_SHOULDER_DIST_THRESHOLD) {
           console.log(`POSTURE CHECK: BAD - Lean Fwd/Back (earShoulderDistX change ${Math.abs(currentEarShoulderDistX - baselineMetrics.earShoulderDistX).toFixed(3)} > ${EAR_SHOULDER_DIST_THRESHOLD})`);
          const leanDirection = currentEarShoulderDistX < baselineMetrics.earShoulderDistX ? "forward" : "back";
          return { isGood: false, message: `Leaning ${leanDirection}!` };
      }
  } else {
       console.warn("POSTURE CHECK: Missing baseline earShoulderDistX for lean check.");
  }
  */

  // If Nose X/Y and Ear Tilt checks pass
  console.log("POSTURE CHECK: Result -> GOOD (Reference Logic - No Lean Check)");
  return { isGood: true, message: "Posture OK!" };
}

// Get the Y coordinate of the eye line for display purposes (Can likely be removed if not used elsewhere)
export function getEyeLine(landmarks: NormalizedLandmark[]): number {
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE];
  
  if (!leftEye || !rightEye) {
    return 0; 
  }
  return (leftEye.y + rightEye.y) / 2;
} 