import React from 'react';

interface TimerProgressBarProps {
  currentTimeMs: number;
  totalDurationMs: number;
}

export const TimerProgressBar: React.FC<TimerProgressBarProps> = ({ 
  currentTimeMs, 
  totalDurationMs 
}) => {
  // Prevent division by zero and handle infinite timer
  if (totalDurationMs <= 0 || totalDurationMs === Number.MAX_SAFE_INTEGER) {
    return null; // Don't show bar for invalid or infinite duration
  }

  const elapsedMs = totalDurationMs - currentTimeMs;
  const progress = Math.max(0, Math.min(1, elapsedMs / totalDurationMs)); // Clamp between 0 and 1

  // Calculate vertical position - higher value means lower on screen
  // Start near the bottom (e.g., 8px up) and move towards top (0px)
  const verticalPosition = (1 - progress) * 8; // Adjust 8 for desired movement range

  return (
    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative mt-2">
      <div 
        className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500 ease-linear"
        style={{
          width: `${progress * 100}%`,
          transform: `translateY(${verticalPosition}px)`,
        }}
      />
      {/* Optional: Add subtle background gradient or texture */}
    </div>
  );
}; 