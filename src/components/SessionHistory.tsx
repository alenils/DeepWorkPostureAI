import { formatDistanceToNow } from 'date-fns';

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

export const SessionHistory = () => {
  const sessions: SessionData[] = JSON.parse(localStorage.getItem('sessions') || '[]');

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No sessions recorded yet. Start your first focus session!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.reverse().map((session, index) => (
        <div 
          key={session.timestamp} 
          className="bg-gray-900 rounded-lg p-4 text-white font-mono"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400">
              {formatDistanceToNow(session.timestamp, { addSuffix: true })}
            </span>
            {session.posture && session.posture >= 80 && (
              <span className="text-green-400 animate-bounce">🔥</span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="mr-2">📝</span>
              <span className="text-gray-400">Goal: </span>
              <span className="ml-2">{session.goal}</span>
            </div>
            
            <div className="flex items-center">
              <span className="mr-2">⏱️</span>
              <span className="text-gray-400">Duration: </span>
              <span className="ml-2">{formatDuration(session.duration)}</span>
            </div>
            
            <div className="flex items-center">
              <span className="mr-2">👤</span>
              <span className="text-gray-400">Posture: </span>
              <span className="ml-2">
                {session.posture ? `${session.posture}%` : 'Not tracked'}
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="mr-2">❌</span>
              <span className="text-gray-400">Distractions: </span>
              <span className="ml-2">{session.distractions}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 