import { useState } from 'react';
import { useSound } from '../features/audio/useSound';

interface DistractionButtonProps {
  isVisible: boolean;
  onDistraction: () => void;
  distractionCount: number; // Receive count from App
  className?: string; // Optional className prop
}

// Helper to generate tally marks
const TallyMarks = ({ count }: { count: number }) => {
  const fullGroups = Math.floor(count / 5);
  const remainder = count % 5;
  let marks = '';

  // Full groups ( HHH ) - Using unicode box drawing chars for crossing
  for (let i = 0; i < fullGroups; i++) {
    marks += '||||̸ '; // Four vertical bars + combining long stroke overlay
  }

  // Remainder
  marks += '|'.repeat(remainder);

  return <span className="text-red-500 dark:text-red-400 font-mono tracking-tighter text-sm ml-2">{marks || '0'}</span>;
};

export const DistractionButton = ({ 
  isVisible, 
  onDistraction, 
  distractionCount,
  className = '' // Default to empty string
}: DistractionButtonProps) => {
  // Load and play distraction sound
  const playDistractionSound = useSound('distraction.mp3');

  const handleButtonClick = () => {
    playDistractionSound();
    onDistraction(); // Call directly
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleButtonClick}
      className={`
        flex items-center
        bg-red-600 hover:bg-red-700 text-white
        px-3 py-1 rounded font-semibold 
        transition-opacity dark:opacity-90 dark:hover:opacity-100
        ${className}
      `}
      title="Log a distraction"
    >
      <span>DISTRACTED</span>
      <TallyMarks count={distractionCount} />
    </button>
  );
}; 