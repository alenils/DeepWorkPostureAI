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
  baselinePose: NormalizedLandmark[] | null
): { isGood: boolean; message: string } {
  if (!landmarks || landmarks.length === 0) {
    return { isGood: false, message: "No landmarks detected." };
  }

  // If no baseline is set, return neutral status
  if (!baselinePose || baselinePose.length === 0) {
    return { isGood: true, message: "Calibrate to begin." };
  }

  // Get nose landmarks
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const baselineNose = baselinePose[POSE_LANDMARKS.NOSE];

  // Ensure nose landmarks exist
  if (!nose || !baselineNose) {
    return { isGood: false, message: "Missing key landmarks for posture analysis." };
  }

  // Threshold for head drop (5% of video height)
  const threshold_Y_drop = 0.05;

  // Check if current nose Y position has dropped below calibrated position
  if (nose.y > baselineNose.y + threshold_Y_drop) {
    return { isGood: false, message: "Head dropped!" };
  }

  // Optional: Additional checks for side-to-side movement
  const threshold_X_movement = 0.1;
  if (Math.abs(nose.x - baselineNose.x) > threshold_X_movement) {
    return { isGood: false, message: "Head moved sideways!" };
  }

  // If passed all checks, posture is good
  return { isGood: true, message: "Good posture!" };
}

// Get the Y coordinate of the eye line for display purposes
export function getEyeLine(landmarks: NormalizedLandmark[]): number {
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE];
  
  // Use the average Y position of the eyes
  return (leftEye.y + rightEye.y) / 2;
} 