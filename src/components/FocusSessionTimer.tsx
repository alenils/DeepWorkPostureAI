import { useState, useCallback, useEffect } from 'react';

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
  const [streakCount, setStreakCount] = useState(0);
  const [streakRingProgress, setStreakRingProgress] = useState(0);

  useEffect(() => {
    const storedStreakCount = localStorage.getItem('totalStreakSessions');
    if (storedStreakCount) {
      const count = parseInt(storedStreakCount, 10);
      setStreakCount(count);
      setStreakRingProgress(Math.min(count * 10, 360));
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'totalStreakSessions' && e.newValue) {
        const count = parseInt(e.newValue, 10);
        setStreakCount(count);
        const newProgress = Math.min(count * 10, 360);
        setStreakRingProgress(prevProgress => {
          const step = (newProgress - prevProgress) / 30;
          let current = prevProgress;
          const animate = () => {
            if (Math.abs(newProgress - current) < Math.abs(step)) {
              setStreakRingProgress(newProgress);
              return;
            }
            current += step;
            setStreakRingProgress(current);
            requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          return prevProgress;
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const intervalId = setInterval(() => {
      const storedCount = localStorage.getItem('totalStreakSessions');
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        if (count !== streakCount) {
          setStreakCount(count);
          setStreakRingProgress(Math.min(count * 10, 360));
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [streakCount]);

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

  const calculateArcPath = (progress: number, radius: number = 40) => {
    const angle = (progress * Math.PI) / 180;
    
    const startX = 50;
    const startY = 50 - radius;
    
    const endX = 50 + radius * Math.sin(angle);
    const endY = 50 - radius * Math.cos(angle);
    
    const largeArcFlag = progress > 180 ? 1 : 0;
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  return (
    <div className={`flex ${isCompact ? 'flex-row items-center space-x-4' : 'flex-col items-center space-y-4 p-4'} relative`}>
      <div className={`flex items-center gap-2 ${isCompact ? '' : ''} z-10`}>
        <input
          tabIndex={2}
          id="minutesInput"
          type="text"
          value={isInfinite ? '∞' : minutes}
          onChange={(e) => onMinutesChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isSessionActive && (isInfinite || minutes)) {
              handleStart();
            }
          }}
          className={`
            goalInput
            w-[60px] text-center
            px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            dark:focus:ring-blue-400
            text-[0.85rem]
            ${isSessionActive ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
          `}
          placeholder="25"
          disabled={isSessionActive}
          title={`Streak sessions: ${streakCount}`}
        />
        <span className="text-gray-600 dark:text-gray-400">min</span>
      </div>
      
      <div className="flex space-x-2 mt-2 md:mt-0">
        {!isSessionActive && (
          <button
            tabIndex={4}
            onClick={handleStart}
            disabled={!isInfinite && !minutes}
            className="w-28 h-10 rounded-full bg-[color:var(--accent-red)] text-white font-semibold hover:bg-red-700 transition-colors"
            title={`Streak sessions: ${streakCount}`}
          >
            JUST DO IT
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
                  : 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700'
                }
                ${isCompact ? 'text-sm py-2' : ''}
              `}
              title={pauseMessage}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={handleStop}
              className={`
                px-3 py-1 rounded font-semibold 
                bg-red-600 hover:bg-red-700 text-white
                transition-opacity dark:opacity-90 dark:hover:opacity-100
                ${isCompact ? 'text-sm' : ''}
              `}
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