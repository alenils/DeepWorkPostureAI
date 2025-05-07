import { POSE_LANDMARKS } from '../lib/poseConstants';
import { 
  Landmark, 
  Landmarks, 
  Vector3D, 
  calculateVector, 
  calculatePitchAngle, 
  calculateRollAngle 
} from './poseMath';

export interface PostureAngles {
  neckPitch: number;
  neckRoll: number;
  torsoAngle: number;
  shoulderPitch: number;
}

export interface PostureStatus {
  good: boolean;
  angles: PostureAngles;
  deltaPx?: number;
}

// Default thresholds
export const DEFAULT_NECK_THRESHOLD = 10; // degrees
export const DEFAULT_TORSO_THRESHOLD = 8; // degrees

/**
 * Gets the required landmarks for posture detection
 */
export function getPostureLandmarks(landmarks: Landmarks): {
  nose: Landmark;
  leftEar: Landmark;
  rightEar: Landmark;
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftHip: Landmark;
  rightHip: Landmark;
} {
  return {
    nose: landmarks[POSE_LANDMARKS.NOSE],
    leftEar: landmarks[POSE_LANDMARKS.LEFT_EAR],
    rightEar: landmarks[POSE_LANDMARKS.RIGHT_EAR],
    leftShoulder: landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    rightShoulder: landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    leftHip: landmarks[POSE_LANDMARKS.LEFT_HIP],
    rightHip: landmarks[POSE_LANDMARKS.RIGHT_HIP]
  };
}

/**
 * Calculates angles between different body parts to determine posture
 */
export function calculatePostureAngles(landmarks: Landmarks): PostureAngles {
  const { 
    nose, 
    leftEar, 
    rightEar, 
    leftShoulder, 
    rightShoulder, 
    leftHip, 
    rightHip 
  } = getPostureLandmarks(landmarks);

  // Calculate midpoints
  const midEar: Vector3D = {
    x: (leftEar.x + rightEar.x) / 2,
    y: (leftEar.y + rightEar.y) / 2,
    z: (leftEar.z + rightEar.z) / 2
  };

  const midShoulder: Vector3D = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };

  const midHip: Vector3D = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };

  // Calculate vectors
  const neckVector = calculateVector(midShoulder, midEar);
  const torsoVector = calculateVector(midHip, midShoulder);
  const shoulderVector = calculateVector(rightShoulder, leftShoulder);

  // Calculate angles
  const neckPitch = calculatePitchAngle(neckVector);
  const neckRoll = calculateRollAngle(neckVector);
  const shoulderPitch = calculatePitchAngle(shoulderVector);
  
  // Calculate torso angle - the angle between the torso and vertical
  const torsoAngle = calculatePitchAngle(torsoVector);

  return {
    neckPitch,
    neckRoll,
    torsoAngle,
    shoulderPitch
  };
}

/**
 * Determines if posture is good based on calculated angles and thresholds
 */
export function detectPosture(
  currentLandmarks: Landmarks,
  neckThreshold = DEFAULT_NECK_THRESHOLD,
  torsoThreshold = DEFAULT_TORSO_THRESHOLD
): PostureStatus {
  const angles = calculatePostureAngles(currentLandmarks);
  
  // Detect if posture is good based on thresholds
  const neckOk = Math.abs(angles.neckPitch) < neckThreshold;
  const torsoOk = Math.abs(angles.torsoAngle) < torsoThreshold;
  
  // Good posture requires both neck and torso to be in proper position
  const isGoodPosture = neckOk && torsoOk;
  
  return {
    good: isGoodPosture,
    angles
  };
}

/**
 * Detects posture relative to a baseline
 */
export function detectPostureWithBaseline(
  currentLandmarks: Landmarks,
  baselineLandmarks: Landmarks | null,
  thresholdMultiplier = 1.0
): PostureStatus {
  if (!baselineLandmarks) {
    // Without baseline, use default thresholds
    return detectPosture(
      currentLandmarks, 
      DEFAULT_NECK_THRESHOLD * thresholdMultiplier,
      DEFAULT_TORSO_THRESHOLD * thresholdMultiplier
    );
  }
  
  // Calculate angles for current pose
  const currentAngles = calculatePostureAngles(currentLandmarks);
  
  // Calculate angles for baseline pose
  const baselineAngles = calculatePostureAngles(baselineLandmarks);
  
  // Calculate deviation from baseline
  const neckPitchDiff = Math.abs(currentAngles.neckPitch - baselineAngles.neckPitch);
  const torsoAngleDiff = Math.abs(currentAngles.torsoAngle - baselineAngles.torsoAngle);
  
  // Get eye line positions
  const currentEyeLine = getEyeLine(currentLandmarks);
  const baselineEyeLine = getEyeLine(baselineLandmarks);
  const eyeLineDiff = currentEyeLine - baselineEyeLine;
  
  // Check if within thresholds
  const neckOk = neckPitchDiff < (DEFAULT_NECK_THRESHOLD * thresholdMultiplier);
  const torsoOk = torsoAngleDiff < (DEFAULT_TORSO_THRESHOLD * thresholdMultiplier);
  
  const isGoodPosture = neckOk && torsoOk;
  
  return {
    good: isGoodPosture,
    angles: currentAngles,
    deltaPx: eyeLineDiff
  };
}

/**
 * Gets the Y coordinate of the line between the eyes
 */
export function getEyeLine(landmarks: Landmarks): number {
  const { nose, leftEye, rightEye } = {
    nose: landmarks[POSE_LANDMARKS.NOSE],
    leftEye: landmarks[POSE_LANDMARKS.LEFT_EYE],
    rightEye: landmarks[POSE_LANDMARKS.RIGHT_EYE]
  };
  
  // Use the average Y position of the eyes
  return (leftEye.y + rightEye.y) / 2;
} 