import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getRandomQuote } from '../utils/quoteUtils';

interface SessionSummaryProps {
  isVisible: boolean;
  onClose: () => void;
  sessionData: {
    timestamp: number;
    duration: number;
    goal: string;
    posture?: number;
    distractions: number;
    comment?: string;
    distractionLog?: string;
  } | null;
  streakCount?: number;
  onStreakEnded?: () => void;
}

export const SessionSummaryPanel = ({ 
  isVisible, 
  onClose, 
  sessionData, 
  streakCount = 0, 
  onStreakEnded 
}: SessionSummaryProps) => {
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');
  const [distractionCount, setDistractionCount] = useState(0);
  const [streakEnded, setStreakEnded] = useState(false);

  useEffect(() => {
    if (isVisible && sessionData) {
      setQuote(getRandomQuote());
      setComment(sessionData.comment || '');
      setDistractionCount(sessionData.distractions);
      
      // Check if this session ended the streak
      if (sessionData.distractions >= 3 && streakCount > 0) {
        setStreakEnded(true);
        if (onStreakEnded) {
          onStreakEnded();
        }
      } else {
        setStreakEnded(false);
      }
    }
  }, [isVisible, sessionData, streakCount, onStreakEnded]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleAddDistraction = () => {
    const newCount = distractionCount + 1;
    setDistractionCount(newCount);
    
    // Check if adding this distraction will end the streak
    if (newCount >= 3 && streakCount > 0 && !streakEnded) {
      setStreakEnded(true);
      if (onStreakEnded) {
        onStreakEnded();
      }
    }
    
    if (sessionData) {
      sessionData.distractions = newCount;
    }
  };

  const handleSave = () => {
    if (sessionData) {
      sessionData.comment = comment;
      sessionData.distractions = distractionCount;
    }
    onClose();
  };

  if (!isVisible || !sessionData) return null;

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 ease-in-out scale-95 animate-fade-in-scale">
        <div className="flex justify-start items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="mr-2 text-yellow-500">💡</span> Session Summary
          </h2>
        </div>

        {/* Streak Ended Message */}
        {streakEnded && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md font-bold text-sm">
            Oops, your streak ended! But remember: channel your inner Goggins and start the next session stronger.
          </div>
        )}

        {/* Inspirational Quote */}
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6 italic text-sm">
          "{quote}"
        </p>

        <div className="space-y-4">
          <div className="flex items-center">
            <span className="mr-3 text-lg">📝</span>
            <span className="text-gray-500 dark:text-gray-400">Focus Goal: </span>
            <span className="ml-2 font-medium">
              {sessionData.goal ? sessionData.goal : '[Goal not found]'}
            </span>
          </div>

          <div className="flex items-center">
            <span className="mr-3 text-lg">⏱️</span>
            <span className="text-gray-500 dark:text-gray-400">Duration: </span>
            <span className="ml-2 font-medium">{formatDuration(sessionData.duration)}</span>
          </div>

          <div className="flex items-center">
            <span className="mr-3 text-lg">👤</span>
            <span className="text-gray-500 dark:text-gray-400">Posture: </span>
            <span className="ml-2 font-medium">
              {sessionData.posture !== undefined ? `${sessionData.posture}%` : 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-3 text-lg">❌</span>
              <span className="text-gray-500 dark:text-gray-400">Distractions: </span>
              <span className="ml-2 font-medium">{distractionCount}</span>
            </div>
            
            {/* Distraction Button */}
            <button
              onClick={handleAddDistraction}
              className="px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 
                hover:bg-red-200 dark:hover:bg-red-800/40 font-medium transition flex items-center"
            >
              <span className="mr-2">❌</span>
              <span>Add Distraction</span>
            </button>
          </div>

          {/* Comment Field */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <label htmlFor="session-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How did it go?
              </label>
              <input
                id="session-comment"
                type="text"
                value={comment}
                onChange={handleCommentChange}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSave(); e.preventDefault(); } }}
                maxLength={40}
                placeholder="Brief comment on this session..."
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Add simple keyframe animation for fade-in effect */}
      <style>
        {`
          @keyframes fade-in-scale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in-scale {
            animation: fade-in-scale 0.3s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}; 