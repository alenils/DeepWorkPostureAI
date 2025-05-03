import { useState, useEffect } from 'react';

interface DeepFocusInputProps {
  isSessionActive: boolean;
  onGoalSet: (goal: string) => void;
}

export const DeepFocusInput = ({ isSessionActive, onGoalSet }: DeepFocusInputProps) => {
  const [goal, setGoal] = useState('');

  // Clear input when session starts
  useEffect(() => {
    if (isSessionActive) {
      // Pass the current goal (or "YOLO-MODE" if empty) to parent
      onGoalSet(goal.trim() || 'YOLO-MODE');
      setGoal('');
    }
  }, [isSessionActive, goal, onGoalSet]);

  return (
    <div className="mb-6">
      <label 
        htmlFor="focusGoal" 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        What's your focus goal?
      </label>
      <input
        id="focusGoal"
        type="text"
        placeholder="e.g., Complete project documentation"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        disabled={isSessionActive}
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        maxLength={100}
      />
      <p className="mt-1 text-sm text-gray-500">
        {isSessionActive ? 'Session in progress...' : 'Optional - defaults to YOLO-MODE'}
      </p>
    </div>
  );
}; 