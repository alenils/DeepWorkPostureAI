import { useState, useEffect } from 'react';

interface DeepFocusInputProps {
  isSessionActive: boolean;
  onGoalSet: (goal: string) => void;
  onDifficultySet?: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onStartSession: (goal: string) => void;
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

export const DeepFocusInput = ({ isSessionActive, onGoalSet, onStartSession, className = '', onDifficultySet }: DeepFocusInputProps) => {
  const [goal, setGoal] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [previousActiveState, setPreviousActiveState] = useState(isSessionActive);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Store difficulty in localStorage
  useEffect(() => {
    localStorage.setItem('lastDifficulty', difficulty);
  }, [difficulty]);

  // Load difficulty from localStorage on init
  useEffect(() => {
    const savedDifficulty = localStorage.getItem('lastDifficulty') as 'easy' | 'medium' | 'hard' | null;
    if (savedDifficulty) {
      setDifficulty(savedDifficulty);
    }
  }, []);

  // Rotate placeholder text every 5 seconds
  useEffect(() => {
    if (isSessionActive || isFocused) return;

    const intervalId = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isSessionActive, isFocused]);

  // Reset input when session starts
  useEffect(() => {
    if (isSessionActive) {
      setGoal('');
    }
  }, [isSessionActive]);

  // Reset goal input when session ends
  useEffect(() => {
    // If session was active and now it's not, it has ended
    if (previousActiveState && !isSessionActive) {
      setGoal('');
    }
    setPreviousActiveState(isSessionActive);
  }, [isSessionActive, previousActiveState]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSessionActive) {
      e.preventDefault();
      const finalGoal = goal.trim();
      if (finalGoal !== '' && difficulty) {
        onStartSession(finalGoal || 'YOLO-MODE');
        onGoalSet(finalGoal || 'YOLO-MODE');
      }
    }
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoal(e.target.value);
    if (!isSessionActive) {
      onGoalSet(e.target.value);
    }
  };

  const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    if (onDifficultySet) {
      onDifficultySet(newDifficulty);
    }
  };

  const currentPlaceholder = isFocused && !goal 
    ? "What's your focus goal?" 
    : PLACEHOLDER_TEXTS[placeholderIndex];

  return (
    <div className={`${className}`}>
      <div className="relative mb-2">
        <input
          tabIndex={1}
          id="focusGoal"
          type="text"
          placeholder={currentPlaceholder}
          value={goal}
          onChange={handleGoalChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isSessionActive}
          className="goalInput w-full flex-grow min-w-0 max-w-[500px] px-4 py-2 border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-500 
            dark:bg-gray-700 dark:border-gray-600 dark:text-white 
            dark:placeholder-gray-400 dark:focus:ring-blue-400
            disabled:bg-gray-100 dark:disabled:bg-gray-800 
            disabled:text-gray-500 dark:disabled:text-gray-400
            text-[0.85rem]"
          maxLength={100}
        />
      </div>
      
      {/* Difficulty selector */}
      {!isSessionActive && (
        <div className="flex gap-2 text-xs">
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('easy')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'easy' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            🟢 Brain-Dead Task
          </button>
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('medium')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'medium' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            🟡 High School Math
          </button>
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('hard')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'hard' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            🔴 Deep Thinking
          </button>
        </div>
      )}
    </div>
  );
}; 