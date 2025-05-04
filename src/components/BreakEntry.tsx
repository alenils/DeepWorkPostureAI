import { useState, useEffect } from 'react';

interface BreakEntryProps {
  breakStartTime: number; // When the previous session ended
  breakEndTime?: number;  // Optional - if the break has ended (next session started)
  note: string;
  onNoteChange: (note: string) => void;
  isActive: boolean;     // Whether this is the current active break
}

export const BreakEntry = ({ 
  breakStartTime, 
  breakEndTime, 
  note, 
  onNoteChange, 
  isActive 
}: BreakEntryProps) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  // Update the break timer every second if it's active
  useEffect(() => {
    if (!isActive) {
      // If break is no longer active and has an end time, calculate final duration
      if (breakEndTime) {
        setElapsedTime(breakEndTime - breakStartTime);
      }
      return;
    }
    
    // Set initial elapsed time
    setElapsedTime(Date.now() - breakStartTime);
    
    // Start interval for active break
    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - breakStartTime);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isActive, breakStartTime, breakEndTime]);
  
  // Format duration as M:SS
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-xs flex items-center space-x-3">
      {/* Break duration */}
      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 italic">
        ⏱ {formatDuration(elapsedTime)} break
      </span>
      {/* Note input - takes remaining space */}
      <input
        type="text"
        placeholder="What did you do during the break?" 
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        className="w-full flex-grow bg-transparent text-gray-700 dark:text-gray-300 
          placeholder-gray-400 dark:placeholder-gray-500 text-xs italic
          focus:outline-none p-1 -m-1"
      />
    </div>
  );
}; 