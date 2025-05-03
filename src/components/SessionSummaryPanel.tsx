import { formatDistanceToNow } from 'date-fns';

interface SessionSummaryProps {
  isVisible: boolean;
  onClose: () => void;
  sessionData: {
    timestamp: number;
    duration: number;
    goal: string;
    posture?: number;
    distractions: number;
  } | null;
}

export const SessionSummaryPanel = ({ isVisible, onClose, sessionData }: SessionSummaryProps) => {
  if (!isVisible || !sessionData) return null;

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="mr-2">💡</span> Session Summary
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>

        <div className="space-y-4 font-mono">
          <div className="flex items-center">
            <span className="mr-2">📝</span>
            <span className="text-gray-400">Focus Goal: </span>
            <span className="ml-2">{sessionData.goal}</span>
          </div>

          <div className="flex items-center">
            <span className="mr-2">⏱️</span>
            <span className="text-gray-400">Duration: </span>
            <span className="ml-2">{formatDuration(sessionData.duration)}</span>
          </div>

          <div className="flex items-center">
            <span className="mr-2">👤</span>
            <span className="text-gray-400">Posture: </span>
            <span className="ml-2">
              {sessionData.posture ? `${sessionData.posture}%` : 'Not tracked'}
            </span>
          </div>

          <div className="flex items-center">
            <span className="mr-2">❌</span>
            <span className="text-gray-400">Distractions: </span>
            <span className="ml-2">{sessionData.distractions}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 