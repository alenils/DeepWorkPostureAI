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
  } | null;
}

export const SessionSummaryPanel = ({ isVisible, onClose, sessionData }: SessionSummaryProps) => {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    if (isVisible) {
      setQuote(getRandomQuote());
    }
  }, [isVisible]);

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
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors text-lg font-semibold"
          >
            Done
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