import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { FocusSessionTimer } from './components/FocusSessionTimer'
import { DeepFocusInput } from './components/DeepFocusInput'
import { SessionSummaryPanel } from './components/SessionSummaryPanel'
import { SessionHistory } from './components/SessionHistory'
import { DistractionButton } from './components/DistractionButton'
import { DarkModeToggle } from './components/DarkModeToggle'
import { TimerProgressBar } from './components/TimerProgressBar'
import { useTimer } from './hooks/useTimer'
import { msToClock, formatTotalDuration } from './utils/time'
import { Notepad } from './components/Notepad'
import { ActionsList } from './components/ActionsList'
import { CameraPlaceholder } from './components/CameraPlaceholder'
import { Toast } from './components/Toast'
import { useSound } from './hooks/useSound'
import { MusicPlayer } from './components/MusicPlayer'

// Unified history item types
interface SessionData {
  type: "session";
  id: string;
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
  comment?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  distractionLog?: string;
}

interface BreakData {
  type: "break";
  id: string;
  start: number;
  end: number | null;
  durationMs: number;
  note: string;
}

type HistoryItem = SessionData | BreakData;

// Generate a simple UUID for item IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

function App() {
  // Sound effects
  const playStartSound = useSound('start.mp3');
  const playPauseSound = useSound('pause.mp3');
  const playDoneSound = useSound('done.mp3');
  const playCancelSound = useSound('cancel.mp3');
  
  // Lifted Timer Config State
  const [minutes, setMinutes] = useState<string>('25');
  const [isInfinite, setIsInfinite] = useState(false);

  // Core Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionDurationMs, setSessionDurationMs] = useState<number>(0);
  
  // History State - unified array of sessions and breaks
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '' });

  // Summary State
  const [showSummary, setShowSummary] = useState(false);
  const [lastSession, setLastSession] = useState<SessionData | null>(null);

  // Streak state
  const [totalStreakSessions, setTotalStreakSessions] = useState(0);

  // Load initial data
  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('history') || '[]');
    setHistory(storedHistory);
    
    // Load streak count from localStorage
    const storedStreakCount = localStorage.getItem('totalStreakSessions');
    if (storedStreakCount) {
      setTotalStreakSessions(parseInt(storedStreakCount, 10));
    }
  }, []);

  // Save history data
  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);
  
  // Save streak count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('totalStreakSessions', totalStreakSessions.toString());
  }, [totalStreakSessions]);
  
  // Toast display handler
  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }, []);

  // Calculate total break time from all completed breaks
  const totalBreakTimeMs = useMemo(() => 
    history
      .filter((item): item is BreakData => item.type === "break" && item.end !== null)
      .reduce((sum, breakItem) => sum + breakItem.durationMs, 0),
  [history]);
  
  // Calculate total focus time from all sessions
  const totalFocusTimeMs = useMemo(() => 
    history
      .filter((item): item is SessionData => item.type === "session")
      .reduce((sum, session) => sum + session.duration, 0),
  [history]);

  // --- Timer Hook Setup --- 
  // Define callbacks FIRST
  const handleHookTimerTick = useCallback((ms: number) => {
    setRemainingTime(ms);
  }, []);

  const handleHookTimerStart = useCallback(() => {
      console.log('[App] useTimer internal process started');
  }, []);

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
    
    // Play session done sound
    playDoneSound();
    
    console.log(`Ending session. Goal state: '${currentGoal}', Distractions: ${distractionCount}`);
    
    // 1. Signal the hook to stop its internal processes
    hookStopTimer(); 

    // 2. Update App state to reflect session end immediately
    setIsSessionActive(false); 
    setIsPaused(false);
    setRemainingTime(0); // Reset remaining time display explicitly
    setCurrentGoal(''); // Reset the goal when a session ends

    // 3. Check if this is a streak session (distractions <= 2) and increment streak count
    if (distractionCount <= 2) {
      setTotalStreakSessions(prev => prev + 1);
    }

    // 4. Prepare finished session data
    const sessionData: SessionData = {
      type: "session",
      id: generateId(),
      timestamp: sessionStartTime,
      duration: Date.now() - sessionStartTime,
      goal: currentGoal,
      distractions: distractionCount,
      posture: Math.round(Math.random() * 30 + 70),
      difficulty: currentDifficulty,
      distractionLog: ''
    };
    
    // 5. Create new break data that starts now
    const breakData: BreakData = {
      type: "break",
      id: generateId(),
      start: Date.now(),
      end: null,
      durationMs: 0,
      note: ""
    };
    
    // 6. Update history with both the session and the break
    const updatedHistory = [breakData, sessionData, ...history];
    setHistory(updatedHistory);
    
    // 7. Show summary
    setLastSession(sessionData);
    setShowSummary(true);
    
    // 8. Reset per-session counters
    setDistractionCount(0); 

  }, [isSessionActive, currentGoal, distractionCount, sessionStartTime, history, hookStopTimer, playDoneSound, currentDifficulty]);

  // --- Central Session Start Logic ---
  const handleSessionStart = () => {
     if (isSessionActive) return;
     const durationMinutes = isInfinite ? -1 : parseInt(minutes) || 0;
     if (!isInfinite && durationMinutes <= 0) {
       alert("Please enter a duration greater than 0.");
       return;
     }
     
     // Play session start sound
     playStartSound();
     
     const finalGoal = currentGoal.trim() || 'YOLO-MODE';
     const durationMs = isInfinite ? Number.MAX_SAFE_INTEGER : durationMinutes * 60 * 1000;
     console.log(`[App] Starting Session: Goal='${finalGoal}', Duration=${durationMinutes}min (${durationMs}ms)`);
     
     // Close any open break
     const updatedHistory = [...history];
     const openBreak = updatedHistory.find(item => 
       item.type === "break" && item.end === null
     ) as BreakData | undefined;
     
     if (openBreak) {
       const endTime = Date.now();
       openBreak.end = endTime;
       openBreak.durationMs = endTime - openBreak.start;
     }
     
     setHistory(updatedHistory);
     
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
    setCurrentGoal(goal);
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
      playPauseSound();
      hookPauseTimer(); 
      setIsPaused(true);
    }
  };
  
  const handleResume = () => {
    if (isSessionActive && isPaused) {
      playStartSound();
      hookResumeTimer();
      setIsPaused(false);
    }
  };

  const handleDistraction = () => {
    if (isSessionActive && !isPaused) {
      setDistractionCount(prev => prev + 1)
    }
  }

  // Handler for updating break notes
  const handleBreakNoteChange = (breakId: string, note: string) => {
    setHistory(prev => 
      prev.map(item => 
        item.type === "break" && item.id === breakId 
          ? { ...item, note } 
          : item
      )
    );
  };
  
  // Handler for break note saving with Enter key
  const handleBreakNoteSave = (breakId: string, note: string) => {
    handleBreakNoteChange(breakId, note);
    showToast("Saved! Keep grinding.");
  };

  // Handler for clearing all history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all session history and break notes?')) {
      playCancelSound();
      localStorage.removeItem('history');
      localStorage.removeItem('totalStreakSessions');
      setHistory([]);
      setTotalStreakSessions(0);
    }
  };

  // Difficulty handler
  const handleDifficultySet = (difficulty: 'easy' | 'medium' | 'hard') => {
    setCurrentDifficulty(difficulty);
  };

  // Handle summary panel close with saved comment
  const handleSummaryClose = () => {
    if (lastSession) {
      // Update the session in history with the comment and distractions count
      setHistory(prev => 
        prev.map(item => 
          item.type === "session" && item.id === lastSession.id
            ? { 
                ...item, 
                comment: lastSession.comment,
                distractions: lastSession.distractions
              }
            : item
        )
      );
      
      // Show appropriate toast message
      showToast("Session saved!");
    } else {
      showToast("Saved!");
    }
    
    // Close the summary panel
    setShowSummary(false);
  };

  // Calculate glow intensity based on streak count
  const getGlowClass = useCallback(() => {
    if (totalStreakSessions < 1) return '';
    return 'shadow-[0_0_0_2px_var(--tw-shadow-color),_0_0_10px_var(--tw-shadow-color)]';
  }, [totalStreakSessions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <DarkModeToggle />
      <div className="max-w-6xl mx-auto p-6">
        <header className="p-8 pb-2">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">DEEP WORK: ULTIMATE DASHBOARD</h1>
          </div>
        </header>
        
        {/* Main layout grid - updated column widths */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[345px_minmax(575px,1fr)_300px]">
          {/* Left Column: Actions (top) and Notepad (bottom) */}
          <aside className="flex flex-col gap-6">
            <ActionsList />
            <Notepad />
          </aside>
          
          {/* Middle Column: Timer & Session History */}
          <div className="space-y-6 min-w-0">
            {/* Focus Input and Timer Section */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 relative
              ${totalStreakSessions > 0 ? 
                (isSessionActive 
                  ? `shadow-[color:var(--accent-cyan)] dark:shadow-[color:var(--accent-cyan)] ${getGlowClass()}` 
                  : `shadow-[color:var(--accent-green)] dark:shadow-[color:var(--accent-green)] ${getGlowClass()}`) 
                : 'shadow-lg'}`}
            >
              {/* Streak badge */}
              {totalStreakSessions > 0 && (
                <div className="absolute -top-2 -right-2 bg-[color:var(--accent-green)] text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                  🔥 x{totalStreakSessions}
                </div>
              )}
              
              <div className="flex flex-col md:flex-row items-start md:items-baseline space-y-4 md:space-y-0 md:space-x-4 mb-6">
                {/* Goal Input */} 
                <div className="flex-grow w-full md:w-auto">
                  <DeepFocusInput 
                    isSessionActive={isSessionActive}
                    onGoalSet={handleGoalSet}
                    onDifficultySet={handleDifficultySet}
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

              {/* Session Progress Section */}
              {isSessionActive && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg space-y-3">
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

                  <div className="flex justify-around items-center space-x-6">
                    <div className="text-center">
                      <span className="text-blue-600 dark:text-blue-300 text-sm">Time Remaining</span>
                      <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {msToClock(remainingTime)}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-blue-600 dark:text-blue-300 text-sm">Distractions</span>
                      <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {distractionCount}
                      </div>
                    </div>
                  </div>

                  <TimerProgressBar 
                    currentTimeMs={remainingTime} 
                    totalDurationMs={sessionDurationMs} 
                  />
                </div>
              )}
            </div>

            {/* Session History Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 relative">
              {/* Timers Section */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Total Focus:</span>
                  <span className="ml-1 font-semibold text-gray-800 dark:text-gray-200">
                    {formatTotalDuration(totalFocusTimeMs)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Total Break:</span>
                  <span className="ml-1 font-semibold text-gray-800 dark:text-gray-200">
                    {formatTotalDuration(totalBreakTimeMs)}
                  </span>
                </div>
              </div>
              
              <SessionHistory 
                history={history}
                onBreakNoteChange={handleBreakNoteChange}
                onBreakNoteSave={handleBreakNoteSave}
              /> 

              {history.length > 0 && ( 
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
          </div>
          
          {/* Right Column: Camera and music player */}
          <div className="flex flex-col gap-6">
            {/* Camera placeholder */}
            <div>
              <CameraPlaceholder isSessionActive={isSessionActive} />
            </div>
           
            {/* Updated MusicPlayer with isSessionActive prop */}
            <MusicPlayer isSessionActive={isSessionActive} />
          </div>
        </div>

        {/* Session Summary Panel */}
        <SessionSummaryPanel 
          isVisible={showSummary}
          onClose={handleSummaryClose}
          sessionData={lastSession}
        />
        
        {/* Toast Notifications */}
        {toast.show && <Toast message={toast.message} />}
      </div>
    </div>
  )
}

export default App 