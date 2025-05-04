import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BreakEntry } from './BreakEntry';

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

// Type for break notes
type BreakNote = {
  [followingSessionTimestamp: number]: string;
};

// Type for break data
interface BreakData {
  startTime: number;
  endTime?: number;
  note: string;
}

// Map of breaks by timestamp
type BreakMap = {
  [followingSessionTimestamp: number]: BreakData;
};

// Update props
interface SessionHistoryProps {
  sessions: SessionData[];
  breakNotes: BreakNote;
  breaks: BreakMap;
  activeBreakStartTime: number | null;
  onNoteChange: (followingTimestamp: number, note: string) => void;
}

// Accept new props, including break data
export const SessionHistory = ({ 
  sessions, 
  breakNotes, 
  breaks,
  activeBreakStartTime,
  onNoteChange 
}: SessionHistoryProps) => { 
  
  // Sort sessions passed via props
  const sortedSessions = useMemo(() => 
    [...sessions].sort((a, b) => b.timestamp - a.timestamp), 
  [sessions]);

  // Calculate total focus time from props
  const totalFocusTimeMs = useMemo(() => 
    sessions.reduce((sum, session) => sum + session.duration, 0),
  [sessions]);

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
        {/* Active break entry - shown only if there's an active break */}
        {activeBreakStartTime !== null && sortedSessions.length > 0 && (
          <BreakEntry
            key="active-break"
            breakStartTime={activeBreakStartTime}
            note={breakNotes[0] || ''}
            onNoteChange={(note) => onNoteChange(0, note)}
            isActive={true}
          />
        )}

        {sortedSessions.reduce((acc, session, index) => {
          const sessionTimestamp = session.timestamp;
          
          // Add break entry before current session if it exists in our breaks data
          if (breaks[sessionTimestamp]) {
            const breakData = breaks[sessionTimestamp];
            acc.push(
              <BreakEntry
                key={`break-${sessionTimestamp}`}
                breakStartTime={breakData.startTime}
                breakEndTime={breakData.endTime}
                note={breakNotes[sessionTimestamp] || ''}
                onNoteChange={(note) => onNoteChange(sessionTimestamp, note)}
                isActive={false}
              />
            );
          } 
          
          // Add Current Session Row
          const isStreak = session.posture !== undefined && session.posture >= 80 && session.distractions <= 5;
          const sessionKey = `session-${session.timestamp}`;
          
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