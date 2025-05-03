import { formatDistanceToNow, formatDistance } from 'date-fns';

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

export const SessionHistory = () => {
  // Get unique sessions by timestamp and sort by newest first
  const allSessions: SessionData[] = JSON.parse(localStorage.getItem('sessions') || '[]');
  const uniqueSessions = Array.from(new Map(allSessions.map(s => [s.timestamp, s])).values())
    .sort((a, b) => b.timestamp - a.timestamp);

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeBetweenSessions = (currentIndex: number): string => {
    if (currentIndex === uniqueSessions.length - 1) {
      return 'First session';
    }

    const currentSession = uniqueSessions[currentIndex];
    const nextSession = uniqueSessions[currentIndex + 1];
    const timeDiff = currentSession.timestamp - nextSession.timestamp;
    
    if (timeDiff < 60000) { // less than 1 minute
      return 'Right after';
    }

    return formatDistance(currentSession.timestamp, nextSession.timestamp, { addSuffix: false }) + ' break';
  };

  if (uniqueSessions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No sessions recorded yet. Start your first focus session!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {uniqueSessions.map((session, index) => (
        <div 
          key={session.timestamp} 
          className="bg-gray-900 rounded-lg p-3 text-white font-mono text-sm flex items-center justify-between"
        >
          <div className="flex items-center space-x-6">
            <span className="text-gray-400 text-xs">
              {getTimeBetweenSessions(index)}
            </span>
            
            <div className="flex items-center space-x-4">
              <span title="Goal">
                📝 {session.goal}
              </span>
              
              <span title="Duration">
                ⏱️ {formatDuration(session.duration)}
              </span>
              
              <span title="Posture" className={session.posture && session.posture >= 80 ? 'text-green-400' : ''}>
                👤 {session.posture}%
              </span>
              
              <span title="Distractions">
                ❌ {session.distractions}
              </span>
            </div>
          </div>
          
          {session.posture && session.posture >= 80 && (
            <span className="text-green-400" title="Streak!">🔥</span>
          )}
        </div>
      ))}
    </div>
  );
}; 