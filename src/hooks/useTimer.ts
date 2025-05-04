import { useState, useEffect, useRef } from 'react';

type Timeout = ReturnType<typeof setTimeout>;

interface UseTimerProps {
  onTimerEnd: () => void;
  onTimerTick: (remainingMs: number) => void;
  onTimerStart: () => void; // Keep for signaling hook start
}

export const useTimer = ({ 
  onTimerEnd, 
  onTimerTick, 
  onTimerStart 
}: UseTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPausedInternal, setIsPausedInternal] = useState(false); 
  const [remainingMs, setRemainingMs] = useState<number>(0); // Initial value doesn't matter much now
  const [sessionDurationMs, setSessionDurationMs] = useState<number>(0); // Store duration internally
  const intervalRef = useRef<Timeout>();
  const pausedTimeRef = useRef<number>(0);
  const timerEndedRef = useRef<boolean>(false); 

  useEffect(() => {
    if (isRunning && !isPausedInternal) {
      timerEndedRef.current = false; 
      intervalRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          const wasInfinite = sessionDurationMs === Number.MAX_SAFE_INTEGER;
          if (!wasInfinite && prev <= 1000) {
            if (!timerEndedRef.current) {
              timerEndedRef.current = true;
              clearInterval(intervalRef.current);
              setIsRunning(false); // Set running false on natural end
              setTimeout(() => onTimerEnd(), 0); // Use setTimeout to ensure this runs after state updates
            }
            return 0; 
          }
          const newValue = prev - 1000;
          onTimerTick(newValue);
          return newValue;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPausedInternal, sessionDurationMs, onTimerEnd, onTimerTick]);

  const startTimer = (durationMs: number) => {
    if (isRunning || durationMs <= 0) return;
    
    setSessionDurationMs(durationMs); // Store the duration for this session
    setRemainingMs(durationMs); 
    setIsPausedInternal(false);
    timerEndedRef.current = false; 
    setIsRunning(true); 
    onTimerStart();
  };

  const pauseTimer = () => {
    if (!isRunning || isPausedInternal) return;
    pausedTimeRef.current = remainingMs;
    setIsPausedInternal(true);
  };

  const resumeTimer = () => {
    if (!isRunning || !isPausedInternal) return;
    setRemainingMs(pausedTimeRef.current);
    setIsPausedInternal(false);
  };

  const stopTimer = () => {
    if (!isRunning) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setIsPausedInternal(false);
    setRemainingMs(0);
    setSessionDurationMs(0); // Reset internal duration
    pausedTimeRef.current = 0;
    timerEndedRef.current = true; 
  };

  return {
    isRunning, 
    isPausedInternal, 
    remainingMs,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
}; 