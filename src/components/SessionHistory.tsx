import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BreakEntry } from './BreakEntry';
import { msToClock, formatTotalDuration } from '../utils/time';

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

// Update props to use unified history
interface SessionHistoryProps {
  history: HistoryItem[];
  onBreakNoteChange: (breakId: string, note: string) => void;
  onBreakNoteSave: (breakId: string, note: string) => void;
}

export const SessionHistory = ({ 
  history,
  onBreakNoteChange,
  onBreakNoteSave
}: SessionHistoryProps) => { 
  
  // Calculate total focus time from all sessions in history
  const totalFocusTimeMs = useMemo(() => 
    history
      .filter((item): item is SessionData => item.type === "session")
      .reduce((sum, session) => sum + session.duration, 0),
  [history]);

  // Filter just session items to check if we have any
  const sessionItems = useMemo(() => 
    history.filter((item): item is SessionData => item.type === "session"), 
  [history]);

  // Find the oldest session for the "first session" indicator
  const oldestSession = useMemo(() => {
    const sessions = sessionItems.sort((a, b) => a.timestamp - b.timestamp);
    return sessions.length > 0 ? sessions[0] : null;
  }, [sessionItems]);

  if (sessionItems.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No sessions recorded yet. Start your first focus session!
      </div>
    );
  }

  return (
    <>
      {/* Title only - Total Focus removed to avoid duplication */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Session History</h2>
      </div>

      {/* Render all history items in order - newest first */}
      <div className="space-y-1">
        {history.map((item) => {
          if (item.type === "break") {
            // Render break item
            return (
              <BreakEntry
                key={`break-${item.id}`}
                breakStartTime={item.start}
                breakEndTime={item.end}
                note={item.note}
                onNoteChange={(note) => onBreakNoteChange(item.id, note)}
                onNoteSave={(note) => onBreakNoteSave(item.id, note)}
                isActive={item.end === null}
              />
            );
          } else {
            // Render session item
            const session = item;
            // Update streak logic to only check for distractions <= 2
            const isStreak = session.distractions <= 2;
            
            // Difficulty badge (🟢/🟡/🔴)
            const difficultyBadge = {
              easy: '🟢',
              medium: '🟡',
              hard: '🔴'
            }[session.difficulty || 'medium'];
            
            return (
              <div 
                key={`session-${session.id}`} 
                className={`rounded-lg p-3 text-sm flex items-center justify-between ${
                  isStreak 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-gray-200 dark:bg-gray-700/80'
                }`}
              >
                <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                  {/* Goal and difficulty badge */}
                  <span title={
                    session.difficulty === 'easy' ? 'Brain-Dead Task' :
                    session.difficulty === 'medium' ? 'High School Math' :
                    'Deep Thinking'
                  } className="flex-shrink-0">
                    {difficultyBadge}
                  </span>
                  <span title="Goal" className="truncate text-gray-800 dark:text-gray-200 font-medium flex-1 flex items-center">
                    {session.goal}
                    {session.comment && (
                      <span className="ml-2 text-xs italic text-gray-500 dark:text-gray-400 truncate max-w-[160px] inline-block">
                        {session.comment}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span title="Duration" className="text-gray-600 dark:text-gray-400">
                    ⏱️ {msToClock(session.duration)}
                  </span>
                  <span title="Posture" className={`${session.posture !== undefined && session.posture >= 80 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    👤 {session.posture !== undefined ? `${session.posture}%` : 'N/A'}
                  </span>
                  <span 
                    title={session.distractionLog ? `Distractions: ${session.distractionLog}` : "Distractions"} 
                    className={`${session.distractions > 2 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'} flex items-center`}
                  >
                    ❌ {session.distractions}
                    {session.distractionLog && (
                      <span className="ml-1 text-xs inline-block text-gray-500 dark:text-gray-400">
                        📝
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          }
        })}

        {/* First session indicator */}
        {oldestSession && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-xs pt-1">
            First session recorded {formatDistanceToNow(
              oldestSession.timestamp, 
              { addSuffix: true }
            )}
          </div>
        )}
      </div>
    </>
  );
}; 