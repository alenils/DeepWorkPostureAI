import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

// Type for break notes (can be shared or imported)
type BreakNote = {
  [followingSessionTimestamp: number]: string;
};

// Update props
interface SessionHistoryProps {
  sessions: SessionData[];
  breakNotes: BreakNote; // Receive notes state
  onNoteChange: (followingTimestamp: number, note: string) => void; // Receive handler
  // onClearHistory prop removed as App manages all state now
}

const MIN_BREAK_DURATION_MS = 60 * 1000; // Only show breaks longer than 1 minute

// Accept new props, remove local state
export const SessionHistory = ({ sessions, breakNotes, onNoteChange }: SessionHistoryProps) => { 
  
  // Sort sessions passed via props
  const sortedSessions = useMemo(() => 
    [...sessions].sort((a, b) => b.timestamp - a.timestamp), 
  [sessions]); // Depend on the sessions prop

  // Calculate total focus time from props
  const totalFocusTimeMs = useMemo(() => 
    sessions.reduce((sum, session) => sum + session.duration, 0),
  [sessions]); // Depend on the sessions prop

  // Format duration in M:SS
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format total time (e.g., 1h 30m)
  const formatTotalDuration = (ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours === 0) result += `${minutes}m`;
    return result.trim() || '0m';
  };

  // Format break duration in minutes
  const formatBreakDuration = (ms: number): string => {
    const minutes = Math.round(ms / 60000);
    return `${minutes} min break`;
  };

  if (sortedSessions.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No sessions recorded yet. Start your first focus session!
      </div>
    );
  }

  return (
    <>
      {/* Title and Total Time - Ensure only ONE h2 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Session History</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Focus: 
          <span className="font-semibold text-gray-800 dark:text-gray-200 ml-1">
            {formatTotalDuration(totalFocusTimeMs)}
          </span>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-1">
        {sortedSessions.reduce((acc, session, index) => {
          const previousSession = sortedSessions[index - 1]; // Session that happened *after* current chronologically
          const nextSession = sortedSessions[index + 1]; // Session that happened *before* current chronologically
          
          // Log current session index and timestamp for debugging
          // console.log(`[History] Index: ${index}, Session Timestamp: ${session.timestamp}, Goal: ${session.goal}`);

          // --- Add Break Row BEFORE Current Session (if applicable) ---
          // Break occurs between the end of the *next* session (chronologically earlier) 
          // and the start of the *current* session (chronologically later)
          if (nextSession) { // Check if there IS a session chronologically earlier
            const breakEndTime = session.timestamp; // Current session start time
            const breakStartTime = nextSession.timestamp + nextSession.duration; // End time of the *previous* session
            const breakDuration = breakEndTime - breakStartTime;
            
            // Uncomment logs for debugging
            console.log(`[Break Check] Index: ${index}, Current Session: ${session.timestamp}, Prev Session Ended: ${breakStartTime}`);
            console.log(`  -> Break Duration: ${breakDuration}ms (Min required: ${MIN_BREAK_DURATION_MS}ms)`);

            if (breakDuration >= MIN_BREAK_DURATION_MS) {
              const breakKey = `break-${session.timestamp}`;
              const noteKey = session.timestamp; // Key note by the session *after* the break (current session)
              
              console.log(`    ==> ADDING Break Row`); // Log if condition met
              acc.push(
                // Use flex row for the break
                <div key={breakKey} className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-xs flex items-center space-x-3">
                  {/* Break duration */}
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                    ~{formatBreakDuration(breakDuration)}
                  </span>
                  {/* Note input - takes remaining space */}
                  <input
                    type="text"
                    placeholder="What did you do during the break?" 
                    value={breakNotes[noteKey] || ''}
                    onChange={(e) => onNoteChange(noteKey, e.target.value)}
                    className="w-full flex-grow bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none p-1 -m-1"
                  />
                </div>
              );
            } else {
              console.log(`    ==> SKIPPING Break Row (Duration too short)`); // Log if skipped
            }
          }
          
          // --- Add Current Session Row ---
          const isStreak = session.posture !== undefined && session.posture >= 80 && session.distractions <= 5;
          const sessionKey = `session-${session.timestamp}`;
          
          // Log the goal for the specific session being rendered
          console.log(`[History Row] Rendering Index: ${index}, Goal: ${session.goal}, Timestamp: ${session.timestamp}`);
          
          acc.push(
            <div 
              key={sessionKey} 
              className={`rounded-lg p-3 text-sm flex items-center justify-between ${isStreak ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-800'}`}
            >
              <div className="flex items-center space-x-4 overflow-hidden">
                {/* Goal without icon */}
                <span title="Goal" className="truncate text-gray-800 dark:text-gray-200 font-medium">
                  {session.goal}
                </span>
                <span title="Duration" className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                  ⏱️ {formatDuration(session.duration)}
                </span>
                <span title="Posture" className={`flex-shrink-0 ${session.posture !== undefined && session.posture >= 80 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  👤 {session.posture !== undefined ? `${session.posture}%` : 'N/A'}
                </span>
                <span title="Distractions" className={`flex-shrink-0 ${session.distractions > 5 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                  ❌ {session.distractions}
                </span>
              </div>
              
              {isStreak && (
                <span className="text-xl flex-shrink-0" title="Streak!">🔥</span>
              )}
            </div>
          );

          // Add "First Session" indicator below the very first session
          if (index === sortedSessions.length - 1) {
            acc.push(
              <div key="first-session-indicator" className="text-center text-gray-400 dark:text-gray-500 text-xs pt-1">
                First session recorded {formatDistanceToNow(session.timestamp, { addSuffix: true })}
              </div>
            );
          }
          
          return acc;
        }, [] as JSX.Element[])}
      </div>
    </>
  );
}; 