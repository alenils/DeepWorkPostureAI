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
  baselinePose: NormalizedLandmark[] | null,
  thresholds: {
    shoulderAngleMin: number;
    shoulderAngleMax: number;
    earShoulderOffsetMax: number; // Max horizontal distance between ear and shoulder
    noseShoulderAngleMin: number; // Min angle for nose relative to shoulders (looking down too much)
  } = {
    shoulderAngleMin: 160, // Example: Shoulders should be relatively straight
    shoulderAngleMax: 190, // Example
    earShoulderOffsetMax: 0.1, // Example: Vertical alignment of ear over shoulder (relative to body height)
    noseShoulderAngleMin: 70, // Example: Avoid looking down excessively
  }
): { isGood: boolean; message: string } {
  if (!landmarks || landmarks.length === 0) {
    return { isGood: false, message: "No landmarks detected." };
  }

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]; // For reference

  if (!leftShoulder || !rightShoulder || !leftEar || !rightEar || !nose || !leftHip) {
    return { isGood: false, message: "Missing key landmarks for posture analysis." };
  }

  // 1. Shoulder line straightness (optional, more complex)
  // For simplicity, we'll focus on relative positions.

  // 2. Ear over shoulder (simplified check: horizontal alignment)
  // Average shoulder X position
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  // Average ear X position
  const earCenterX = (leftEar.x + rightEar.x) / 2;

  // Check if ear is roughly above shoulder center horizontally
  // This is a simplification. A better check involves comparing ear.y with shoulder.y
  // and also relative to a baseline.
  // For now, let's check horizontal offset:
  const earShoulderHorizontalOffset = Math.abs(earCenterX - shoulderCenterX);

  // A simple check for head tilt: ear y positions relative to each other
  const earTiltDifference = Math.abs(leftEar.y - rightEar.y);

  // Check if looking down too much (Nose relative to shoulders)
  // Angle between (midpoint of shoulders, nose, horizontal line from nose)
  // Or simpler: is nose.y significantly lower than shoulder.y?
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  const noseBelowShoulders = nose.y > shoulderCenterY + 0.05; // 0.05 is an arbitrary threshold

  // Baseline comparison (if available)
  if (baselinePose && baselinePose.length > 0) {
    const baselineLeftEar = baselinePose[POSE_LANDMARKS.LEFT_EAR];
    const baselineLeftShoulder = baselinePose[POSE_LANDMARKS.LEFT_SHOULDER];

    if (baselineLeftEar && baselineLeftShoulder) {
        // Example: Check if current ear.y is much lower than baseline ear.y relative to shoulder
        const currentEarShoulderOffsetY = leftEar.y - leftShoulder.y;
        const baselineEarShoulderOffsetY = baselineLeftEar.y - baselineLeftShoulder.y;
        if (currentEarShoulderOffsetY > baselineEarShoulderOffsetY + 0.05) { // 0.05 threshold
             return { isGood: false, message: "Head dropped below baseline." };
        }
    }
  }


  // Condition checks - these are examples and need tuning
  if (earShoulderHorizontalOffset > thresholds.earShoulderOffsetMax * (Math.abs(leftShoulder.y - leftHip.y) || 1)) { // Normalize by body height estimate
    return { isGood: false, message: "Head leaning forward/backward (ear not over shoulder)." };
  }
  if (earTiltDifference > 0.07) { // Arbitrary threshold for head tilt
    return { isGood: false, message: "Head tilted significantly." };
  }
  if (noseBelowShoulders) {
    return { isGood: false, message: "Looking down too much." };
  }

  // Add more specific angle checks if needed, e.g. torso straightness
  // const leftShoulderHipKneeAngle = calculateAngle(leftShoulder, leftHip, landmarks[POSE_LANDMARKS.LEFT_KNEE]);
  // if (leftShoulderHipKneeAngle < 160 || leftShoulderHipKneeAngle > 190) {
  //   return { isGood: false, message: "Slouching detected (torso angle)." };
  // }

  return { isGood: true, message: "Good posture!" };
}

// Get the Y coordinate of the eye line for display purposes
export function getEyeLine(landmarks: NormalizedLandmark[]): number {
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE];
  
  // Use the average Y position of the eyes
  return (leftEye.y + rightEye.y) / 2;
} 