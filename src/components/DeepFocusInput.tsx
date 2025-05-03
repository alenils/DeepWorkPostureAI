import { useState, useEffect } from 'react';

interface DeepFocusInputProps {
  isSessionActive: boolean;
  onGoalSet: (goal: string) => void;
  onStartSession: () => void;
  className?: string;
}

const PLACEHOLDER_TEXTS = [
  "What do you fear doing?",
  "The resistance is big with this one...",
  "Oh, I've been avoiding this for ages...",
  "Only my mom can force me to do this!",
  "This task has been haunting me",
  "My boss will kill me if I don't do this",
  "I'll feel so good when this is done",
  "This is scarier than my morning face",
  "My future self will thank me",
  "The longer I wait, the scarier it gets",
  "Even my cat judges me for not doing this",
  "This is my final form of procrastination",
  "The task that keeps me up at night",
  "My anxiety's favorite procrastination",
  "Time to face my nemesis",
  "The task that's been stalking my todo list",
  "My productivity kryptonite",
  "The final boss of procrastination",
  "This isn't even my final form of avoidance",
  "The task that survived 100 todo lists"
];

export const DeepFocusInput = ({ isSessionActive, onGoalSet, onStartSession, className = '' }: DeepFocusInputProps) => {
  const [goal, setGoal] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholder text every 5 seconds
  useEffect(() => {
    if (isSessionActive) return;

    const intervalId = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isSessionActive]);

  // Clear input when session starts
  useEffect(() => {
    if (isSessionActive) {
      onGoalSet(goal.trim() || 'YOLO-MODE');
      setGoal('');
    }
  }, [isSessionActive, goal, onGoalSet]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSessionActive && goal.trim()) {
      onStartSession();
    }
  };

  return (
    <div className={`${className} flex-grow`}>
      <label 
        htmlFor="focusGoal" 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        What's your focus goal?
      </label>
      <div className="relative">
        <input
          id="focusGoal"
          type="text"
          placeholder={PLACEHOLDER_TEXTS[placeholderIndex]}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSessionActive}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          maxLength={100}
        />
        {isSessionActive && (
          <div className="absolute right-3 top-2 text-sm text-gray-500">
            Session in progress...
          </div>
        )}
      </div>
    </div>
  );
}; 