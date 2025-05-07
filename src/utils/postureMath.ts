// Vector math utilities for posture detection
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type Landmarks = Landmark[];

/**
 * Calculates the angle between two vectors in 3D space
 */
export function calculateAngle(a: Vector3D, b: Vector3D): number {
  const dotProduct = a.x * b.x + a.y * b.y + a.z * b.z;
  const magnitudeA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const magnitudeB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
  
  // Prevent division by zero and handle precision errors
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  // Make sure the value is in valid range for Math.acos
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (magnitudeA * magnitudeB)));
  
  // Calculate the angle in radians, then convert to degrees
  return Math.acos(cosTheta) * (180 / Math.PI);
}

/**
 * Calculates the vector from point a to point b
 */
export function calculateVector(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z
  };
}

/**
 * Calculates the pitch angle (forward/backward tilt) of a vector relative to the vertical
 * Positive values mean forward tilt, negative values mean backward tilt
 */
export function calculatePitchAngle(vector: Vector3D): number {
  // Reference vertical vector (pointing down in image coordinates)
  const verticalVector = { x: 0, y: 1, z: 0 };
  
  // Project the vector onto the y-z plane
  const projectedVector = { x: 0, y: vector.y, z: vector.z };
  
  // Calculate the angle
  let angle = calculateAngle(verticalVector, projectedVector);
  
  // Determine the sign of the angle based on the z component
  if (vector.z < 0) {
    angle = -angle;
  }
  
  return angle;
}

/**
 * Calculates the roll angle (left/right tilt) of a vector
 */
export function calculateRollAngle(vector: Vector3D): number {
  // Reference vertical vector
  const verticalVector = { x: 0, y: 1, z: 0 };
  
  // Project the vector onto the x-y plane
  const projectedVector = { x: vector.x, y: vector.y, z: 0 };
  
  // Calculate the angle
  let angle = calculateAngle(verticalVector, projectedVector);
  
  // Determine the sign of the angle based on the x component
  if (vector.x > 0) {
    angle = -angle;
  }
  
  return angle;
}

/**
 * Normalizes a vector to have a magnitude of 1
 */
export function normalizeVector(vector: Vector3D): Vector3D {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  
  if (magnitude === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude
  };
} 