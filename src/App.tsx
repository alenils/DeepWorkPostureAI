import { useState, useEffect, useMemo, useCallback } from 'react'
import { FocusSessionTimer } from './components/FocusSessionTimer'
import { DeepFocusInput } from './components/DeepFocusInput'
import { SessionSummaryPanel } from './components/SessionSummaryPanel'
import { SessionHistory } from './components/SessionHistory'
import { DistractionButton } from './components/DistractionButton'
import { DarkModeToggle } from './components/DarkModeToggle'
import { TimerProgressBar } from './components/TimerProgressBar'
import { useTimer } from './hooks/useTimer'

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

// Type for break notes state
type BreakNote = {
  [followingSessionTimestamp: number]: string;
};

// New type for break data
interface BreakData {
  startTime: number;
  endTime?: number;
  note: string;
}

// Map of breaks by the timestamp of the session that FOLLOWS the break
type BreakMap = {
  [followingSessionTimestamp: number]: BreakData;
};

function App() {
  // Lifted Timer Config State
  const [minutes, setMinutes] = useState<string>('25');
  const [isInfinite, setIsInfinite] = useState(false);

  // Core Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionDurationMs, setSessionDurationMs] = useState<number>(0);
  
  // History State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [breakNotes, setBreakNotes] = useState<BreakNote>({});
  const [breaks, setBreaks] = useState<BreakMap>({});
  const [activeBreakStartTime, setActiveBreakStartTime] = useState<number | null>(null);

  // Summary State
  const [showSummary, setShowSummary] = useState(false);
  const [lastSession, setLastSession] = useState<SessionData | null>(null);

  // Load initial data
  useEffect(() => {
    const storedSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    setSessions(storedSessions);
    const storedNotes = JSON.parse(localStorage.getItem('breakNotes') || '{}');
    setBreakNotes(storedNotes);
    const storedBreaks = JSON.parse(localStorage.getItem('breaks') || '{}');
    setBreaks(storedBreaks);
  }, []);

  // Save break data
  useEffect(() => {
    localStorage.setItem('breaks', JSON.stringify(breaks));
  }, [breaks]);

  // Save break notes
  useEffect(() => {
    localStorage.setItem('breakNotes', JSON.stringify(breakNotes));
  }, [breakNotes]);

  // --- Timer Hook Setup --- 
  // Define callbacks FIRST
  const handleHookTimerTick = useCallback((ms: number) => {
    setRemainingTime(ms);
  }, []);

  const handleHookTimerStart = useCallback(() => {
      console.log('[App] useTimer internal process started');
  }, []);

  // Define handleTimerEnd using useCallback (will need hook functions, define hook next)
  // Placeholder: Define hook functions first, then come back to this.
  
  // Use the timer hook
  const { 
    startTimer: hookStartTimer, 
    pauseTimer: hookPauseTimer, 
    resumeTimer: hookResumeTimer, 
    stopTimer: hookStopTimer 
  } = useTimer({
    // Pass handleTimerEnd callback defined below
    onTimerEnd: () => handleTimerEnd(), // Use arrow function to delay call
    onTimerTick: handleHookTimerTick,
    onTimerStart: handleHookTimerStart, 
  });

  // Now define handleTimerEnd using useCallback, referencing the hook function
  const handleTimerEnd = useCallback(() => {
    // Check if it's already stopped
    if (!isSessionActive) return;
    
    console.log(`Ending session. Goal state: '${currentGoal}', Distractions: ${distractionCount}`);
    
    // 1. Signal the hook to stop its internal processes
    hookStopTimer(); 

    // 2. Update App state to reflect session end immediately
    setIsSessionActive(false); 
    setIsPaused(false);
    setRemainingTime(0); // Reset remaining time display explicitly
    setCurrentGoal(''); // Reset the goal when a session ends

    // 3. Prepare and save session data
    const sessionData: SessionData = {
      timestamp: sessionStartTime,
      duration: Date.now() - sessionStartTime, // Ensure duration is calculated correctly
      goal: currentGoal,
      distractions: distractionCount,
      posture: Math.round(Math.random() * 30 + 70)
    };
    console.log('Session Data Created:', sessionData);
    
    // 4. Update history state and localStorage
    const updatedSessions = [...sessions, sessionData];
    setSessions(updatedSessions);
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
    
    // 5. Start tracking active break
    const breakStartTime = Date.now();
    setActiveBreakStartTime(breakStartTime);
    
    // 6. Show summary
    setLastSession(sessionData);
    setShowSummary(true);
    
    // 7. Reset per-session counters
    setDistractionCount(0); 

  }, [isSessionActive, currentGoal, distractionCount, sessionStartTime, sessions, hookStopTimer]);

  // --- Central Session Start Logic ---
  const handleSessionStart = () => {
     if (isSessionActive) return;
     const durationMinutes = isInfinite ? -1 : parseInt(minutes) || 0;
     if (!isInfinite && durationMinutes <= 0) {
       alert("Please enter a duration greater than 0.");
       return;
     }
     const finalGoal = currentGoal.trim() || 'YOLO-MODE';
     const durationMs = isInfinite ? Number.MAX_SAFE_INTEGER : durationMinutes * 60 * 1000;
     console.log(`[App] Starting Session: Goal='${finalGoal}', Duration=${durationMinutes}min (${durationMs}ms)`);
     
     // If we have an active break, end it and record it
     if (activeBreakStartTime !== null) {
       const currentTimestamp = Date.now();
       const breakEndTime = currentTimestamp;
       const updatedBreaks = { ...breaks };
       
       // Store the break data with the current session's timestamp as the key
       updatedBreaks[currentTimestamp] = {
         startTime: activeBreakStartTime,
         endTime: breakEndTime,
         note: breakNotes[0] || '' // Use temporary key 0 for active break note
       };
       
       // Move the note from temporary key 0 to the actual timestamp key
       const updatedNotes = { ...breakNotes };
       if (updatedNotes[0]) {
         updatedNotes[currentTimestamp] = updatedNotes[0];
         delete updatedNotes[0]; // Remove the temporary note
       }
       
       setBreaks(updatedBreaks);
       setBreakNotes(updatedNotes);
       setActiveBreakStartTime(null);
     }
     
     setSessionDurationMs(durationMs);
     setCurrentGoal(finalGoal);
     setSessionStartTime(Date.now());
     setRemainingTime(durationMs);
     setDistractionCount(0);
     setIsPaused(false);
     setIsSessionActive(true); 

     // Explicitly start the timer hook
     hookStartTimer(durationMs); 
  };

  // --- Other Handlers ---
  const handleGoalSet = (goal: string) => {
    if (!isSessionActive) {
      setCurrentGoal(goal);
    }
  };

  const handleMinutesChange = (value: string) => {
    if (isSessionActive) return;
    if (value === '∞') {
      setIsInfinite(true);
      setMinutes('');
    } else {
      setIsInfinite(false);
      const num = parseInt(value);
      if (value === '' || (!isNaN(num) && num >= 0)) {
          setMinutes(value);
      }
    }
  };

  const handlePause = () => {
    if (isSessionActive && !isPaused) {
      hookPauseTimer(); 
      setIsPaused(true);
    }
  };
  const handleResume = () => {
    if (isSessionActive && isPaused) {
      hookResumeTimer();
      setIsPaused(false);
    }
  };

  const handleDistraction = () => {
    if (isSessionActive && !isPaused) {
      setDistractionCount(prev => prev + 1)
    }
  }

  // Handler for updating break notes (passed down)
  const handleNoteChange = (followingTimestamp: number, note: string) => {
    // Update note in breakNotes state
    setBreakNotes(prev => ({
      ...prev,
      [followingTimestamp]: note,
    }));
    
    // If we have this break in the breaks map, update its note too
    setBreaks(prev => {
      if (prev[followingTimestamp]) {
        return {
          ...prev,
          [followingTimestamp]: {
            ...prev[followingTimestamp],
            note
          }
        };
      }
      return prev;
    });
  };

  // Handler for clearing all history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all session history and break notes?')) {
      localStorage.removeItem('sessions');
      localStorage.removeItem('breakNotes');
      localStorage.removeItem('breaks');
      setSessions([]);
      setBreakNotes({});
      setBreaks({});
      setActiveBreakStartTime(null);
    }
  };

  // Use a consistent duration formatting function
  const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0; // Prevent negative display
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <DarkModeToggle />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">DeepWorkPostureAI</h1>
          
          {/* Focus Input and Timer Section */}
          {/* Using Flexbox with baseline alignment */}
          <div className="flex flex-col md:flex-row items-start md:items-baseline space-y-4 md:space-y-0 md:space-x-4 mb-6">
            {/* Goal Input */} 
            <div className="flex-grow w-full md:w-auto">
              <DeepFocusInput 
                isSessionActive={isSessionActive}
                onGoalSet={handleGoalSet}
                onStartSession={handleSessionStart}
              />
            </div>
            {/* Timer Controls */}
            <div className="flex-shrink-0"> 
              <FocusSessionTimer
                minutes={minutes}
                isInfinite={isInfinite}
                isSessionActive={isSessionActive}
                isPaused={isPaused}
                onMinutesChange={handleMinutesChange}
                onSessionStart={handleSessionStart}
                onTimerEnd={handleTimerEnd}
                onPause={handlePause}
                onResume={handleResume}
                isCompact={true}
              />
            </div>
          </div>

          {/* Session Progress Section - Uses currentGoal state */}
          {isSessionActive && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg space-y-3">
              {/* Top row: Goal and Distraction Button */}
              <div className="flex items-center justify-between space-x-4">
                <div className="text-center">
                  <span className="text-blue-800 dark:text-blue-200 font-medium block">Current Goal</span>
                  <span className="text-lg text-blue-900 dark:text-blue-100">{currentGoal}</span>
                </div>
                <div className="flex-shrink-0">
                  <DistractionButton 
                    isVisible={isSessionActive && !isPaused}
                    onDistraction={handleDistraction}
                    distractionCount={distractionCount}
                  />
                </div>
              </div>

              {/* Middle row: Time and Distractions Count */}
              <div className="flex justify-around items-center space-x-6">
                <div className="text-center">
                  <span className="text-blue-600 dark:text-blue-300 text-sm">Time Remaining</span>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {formatDuration(remainingTime)}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-blue-600 dark:text-blue-300 text-sm">Distractions</span>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {distractionCount}
                  </div>
                </div>
              </div>

              {/* Bottom row: Progress Bar */}
              <TimerProgressBar 
                currentTimeMs={remainingTime} 
                totalDurationMs={sessionDurationMs} 
              />
            </div>
          )}
        </div>

        {/* Session History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 relative">
          <SessionHistory 
            sessions={sessions} 
            breakNotes={breakNotes}
            breaks={breaks}
            activeBreakStartTime={activeBreakStartTime}
            onNoteChange={handleNoteChange}
          /> 

          {sessions.length > 0 && ( 
             <div className="flex justify-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
               <button
                 onClick={handleClearHistory}
                 className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium py-1 px-3 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                 title="Clear all history and notes"
               >
                 Clear All History
               </button>
             </div>
          )}
        </div>

        <SessionSummaryPanel 
          isVisible={showSummary}
          onClose={() => setShowSummary(false)}
          sessionData={lastSession}
        />
      </div>
    </div>
  )
}

export default App 