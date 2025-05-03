import { useState, useCallback } from 'react';

interface FocusSessionTimerProps {
  minutes: string;
  isInfinite: boolean;
  onMinutesChange: (value: string) => void;
  isSessionActive: boolean;
  isPaused: boolean;
  onSessionStart: () => void;
  onTimerEnd: () => void;
  onPause: () => void;
  onResume: () => void;
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

const PAUSE_MESSAGES = [
  "Just a quick pee break",
  "BRB - Important Tinder match",
  "Need to pet my cat real quick",
  "Coffee refill emergency",
  "Quick stretch, back in 5",
  "Urgent snack situation",
  "Water break, staying hydrated",
  "Just checking my plants",
  "Quick meditation moment",
  "Bio break, nature calls"
];

const STOP_MESSAGES = [
  "Need to quit, can't go on",
  "It's just not happening now",
  "I can't be perfect all the time",
  "Today's not my day",
  "Brain.exe has stopped working",
  "Focus machine broke",
  "Time to regroup and retry",
  "Taking the L on this one",
  "Mission abort, need reset",
  "Saving energy for later"
];

export const FocusSessionTimer = ({ 
  minutes,
  isInfinite,
  onMinutesChange,
  isSessionActive, 
  isPaused,
  onSessionStart,
  onTimerEnd, 
  onPause,
  onResume,
  isCompact = false,
}: FocusSessionTimerProps) => {
  const [startButtonText, setStartButtonText] = useState(MOTIVATIONAL_STARTS[0]);
  const [startClickCount, setStartClickCount] = useState(0);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);
  const [pauseMessage, setPauseMessage] = useState(PAUSE_MESSAGES[0]);
  const [stopMessage, setStopMessage] = useState(STOP_MESSAGES[0]);

  const handleStart = () => {
    if (isSessionActive) return;

    onSessionStart();
    
    setIsButtonAnimating(true);
    const nextIndex = (startClickCount + 1) % MOTIVATIONAL_STARTS.length;
    setStartClickCount(nextIndex);
    setStartButtonText(MOTIVATIONAL_STARTS[nextIndex]);
    setTimeout(() => setIsButtonAnimating(false), 1000);
  };

  const handlePauseClick = useCallback(() => {
    if (!isSessionActive) return;
    if (isPaused) {
      onResume();
    } else {
      onPause();
      const nextMessage = PAUSE_MESSAGES[Math.floor(Math.random() * PAUSE_MESSAGES.length)];
      setPauseMessage(nextMessage);
    }
  }, [isSessionActive, isPaused, onPause, onResume]);

  const handleStop = () => {
    if (!isSessionActive) return;
    const nextMessage = STOP_MESSAGES[Math.floor(Math.random() * STOP_MESSAGES.length)];
    setStopMessage(nextMessage);
    onTimerEnd();
  };

  return (
    <div className={`flex ${isCompact ? 'flex-row items-center space-x-4' : 'flex-col items-center space-y-4 p-4'}`}>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={isInfinite ? '∞' : minutes}
          onChange={(e) => onMinutesChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isSessionActive && (isInfinite || minutes)) {
              handleStart();
            }
          }}
          className={`
            px-3 py-2 border rounded
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            dark:focus:ring-blue-400
            ${isCompact ? 'w-16' : 'w-20'}
            ${isSessionActive ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
          `}
          placeholder="25"
          disabled={isSessionActive}
        />
        <span className="text-gray-600 dark:text-gray-400">min</span>
      </div>
      
      {/* Buttons Section */}
      <div className="flex space-x-2 mt-2 md:mt-0">
        {!isSessionActive && (
          <button
            onClick={handleStart}
            disabled={!isInfinite && !minutes}
            className={`
              px-6 py-2 rounded-lg font-semibold tracking-wide
              transition-all duration-300 ease-in-out
              ${isButtonAnimating
                ? 'bg-green-500 text-white transform scale-105 dark:bg-green-600'
                : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              }
              ${isCompact ? 'text-sm py-2' : ''}
              ${(!isInfinite && !minutes) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {startButtonText}
          </button>
        )}

        {isSessionActive && (
          <>
            <button
              onClick={handlePauseClick}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-300 ease-in-out
                ${isPaused
                  ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700'
                }
                ${isCompact ? 'text-sm py-2' : ''}
              `}
              title={pauseMessage}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={handleStop}
              className="
                px-4 py-2 rounded-lg font-medium text-sm
                bg-red-500 text-white hover:bg-red-600
                dark:bg-red-600 dark:hover:bg-red-700
                transition-all duration-300 ease-in-out
                ${isCompact ? 'text-sm py-2' : ''}
              "
              title={stopMessage}
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 