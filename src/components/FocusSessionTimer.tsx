import { useState, useEffect } from 'react';

type Timeout = ReturnType<typeof setTimeout>;

interface FocusSessionTimerProps {
  onTimerStart: () => void;
  onTimerEnd: () => void;
  onTimerTick: (remainingMs: number) => void;
}

export const FocusSessionTimer = ({ onTimerStart, onTimerEnd, onTimerTick }: FocusSessionTimerProps) => {
  const [minutes, setMinutes] = useState<string>('25'); // Default 25 minutes
  const [isInfinite, setIsInfinite] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(25 * 60 * 1000);

  useEffect(() => {
    let intervalId: Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setRemainingMs((prev) => {
          if (!isInfinite && prev <= 1000) {
            clearInterval(intervalId);
            setIsRunning(false);
            onTimerEnd();
            return 0;
          }
          const newValue = prev - 1000;
          onTimerTick(newValue);
          return newValue;
        });
      }, 1000);

      onTimerStart();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, isInfinite, onTimerStart, onTimerEnd, onTimerTick]);

  const handleMinutesChange = (value: string) => {
    if (value === '∞') {
      setIsInfinite(true);
      setMinutes('');
      return;
    }

    setIsInfinite(false);
    // Allow empty string for typing
    if (value === '') {
      setMinutes('');
      return;
    }

    // Only allow positive integers
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      setMinutes(num.toString());
    }
  };

  const handleStart = () => {
    if (!isInfinite && !minutes) return;
    
    if (!isInfinite) {
      setRemainingMs(parseInt(minutes) * 60 * 1000);
    } else {
      setRemainingMs(Number.MAX_SAFE_INTEGER);
    }
    
    setIsRunning(true);
  };

  const formatTime = (ms: number): string => {
    if (isInfinite) return '∞';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={isInfinite ? '∞' : minutes}
          onChange={(e) => handleMinutesChange(e.target.value)}
          className="w-20 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="25"
          disabled={isRunning}
        />
        <span className="text-gray-600">minutes</span>
      </div>
      
      <div className="text-4xl font-bold">
        {formatTime(remainingMs)}
      </div>
      
      <button
        onClick={handleStart}
        disabled={isRunning || (!isInfinite && !minutes)}
        className={`px-6 py-2 rounded-lg font-semibold ${
          isRunning
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isRunning ? 'In Progress' : 'Start Timer'}
      </button>
    </div>
  );
}; 