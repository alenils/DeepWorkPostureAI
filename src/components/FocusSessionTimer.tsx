import { useState } from 'react';
import { useTimer } from '../hooks/useTimer';

interface FocusSessionTimerProps {
  onTimerStart: () => void;
  onTimerEnd: () => void;
  onTimerTick: (remainingMs: number) => void;
  isCompact?: boolean;
}

const MOTIVATIONAL_STARTS = [
  "FOCUS MODE ON",
  "LET'S CRUSH IT",
  "GO TIME",
  "BEAST MODE",
  "LEVEL UP",
  "DEEP DIVE",
  "FLOW STATE",
  "ZONE IN",
  "GAME ON",
  "POWER UP",
  "LOCK IN",
  "ALL IN",
  "FULL SEND",
  "ZERO FEAR",
  "GET AFTER IT",
  "DOMINATE",
  "UNLEASH",
  "NO LIMITS",
  "BREAKTHROUGH",
  "RISE UP"
];

export const FocusSessionTimer = ({ onTimerStart, onTimerEnd, onTimerTick, isCompact = false }: FocusSessionTimerProps) => {
  const [startButtonText, setStartButtonText] = useState(MOTIVATIONAL_STARTS[0]);
  const [startClickCount, setStartClickCount] = useState(0);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);

  const {
    minutes,
    isInfinite,
    isRunning,
    remainingMs,
    handleMinutesChange,
    startTimer,
    formatTime,
  } = useTimer({ onTimerStart, onTimerEnd, onTimerTick });

  const handleStart = () => {
    startTimer();
    setIsButtonAnimating(true);
    
    // Update start button text for next time
    const nextIndex = (startClickCount + 1) % MOTIVATIONAL_STARTS.length;
    setStartClickCount(nextIndex);
    setStartButtonText(MOTIVATIONAL_STARTS[nextIndex]);

    // Reset button animation after 1 second
    setTimeout(() => setIsButtonAnimating(false), 1000);
  };

  return (
    <div className={`flex ${isCompact ? 'flex-row items-center space-x-4' : 'flex-col items-center space-y-4'} p-4`}>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={isInfinite ? '∞' : minutes}
          onChange={(e) => handleMinutesChange(e.target.value)}
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isCompact ? 'w-16' : 'w-20'
          }`}
          placeholder="25"
          disabled={isRunning}
        />
        <span className="text-gray-600">min</span>
      </div>
      
      {!isCompact && (
        <div className="text-4xl font-bold">
          {formatTime(remainingMs)}
        </div>
      )}
      
      <button
        onClick={handleStart}
        disabled={isRunning || (!isInfinite && !minutes)}
        className={`
          px-6 py-2 rounded-lg font-semibold tracking-wide
          transition-all duration-300 ease-in-out
          ${isRunning
            ? 'bg-gray-300 cursor-not-allowed'
            : isButtonAnimating
              ? 'bg-green-500 text-white transform scale-105'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }
          ${isCompact ? 'text-sm' : ''}
        `}
      >
        {isRunning ? 'In Progress' : startButtonText}
      </button>
    </div>
  );
}; 