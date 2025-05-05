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
  } | null;
}

export const SessionSummaryPanel = ({ isVisible, onClose, sessionData }: SessionSummaryProps) => {
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isVisible) {
      setQuote(getRandomQuote());
      setComment(sessionData?.comment || '');
    }
  }, [isVisible, sessionData]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleCommentSave = () => {
    if (sessionData) {
      sessionData.comment = comment;
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="mr-2 text-yellow-500">💡</span> Session Summary
          </h2>
          <button onClick={handleCommentSave} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors text-lg font-semibold">
            Save & Close
          </button>
        </div>

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

          <div className="flex items-center">
            <span className="mr-3 text-lg">❌</span>
            <span className="text-gray-500 dark:text-gray-400">Distractions: </span>
            <span className="ml-2 font-medium">{sessionData.distractions}</span>
          </div>

          {/* Comment Field */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label htmlFor="session-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How did it go?
            </label>
            <input
              id="session-comment"
              type="text"
              value={comment}
              onChange={handleCommentChange}
              maxLength={40}
              placeholder="Brief comment on this session..."
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
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