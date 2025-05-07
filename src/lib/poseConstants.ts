// Minimal constants we actually use
export const POSE_LANDMARKS = {
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12
};

export const POSE_CONNECTIONS: [number, number][] = [
  // Face connections
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  // Torso connections
  [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  // Legs
  [11, 23], [12, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  // Arms
  [11, 13], [13, 15], [15, 17], [17, 19], [19, 21],
  [12, 14], [14, 16], [16, 18], [18, 20], [20, 22]
]; 