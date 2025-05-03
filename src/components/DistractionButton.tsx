import { useState } from 'react';

interface DistractionButtonProps {
  isVisible: boolean;
  onDistraction: () => void;
  distractionCount: number; // Receive count from App
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
  distractionCount 
}: DistractionButtonProps) => {

  const handleButtonClick = () => {
    onDistraction(); // Call directly
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleButtonClick}
      className="
        flex items-center
        px-3 py-1.5 rounded-lg 
        bg-red-100 dark:bg-red-900 
        border border-red-300 dark:border-red-700
        text-red-700 dark:text-red-200
        text-sm font-medium
        shadow-sm hover:shadow-md 
        transition-all duration-150 ease-in-out
        transform hover:scale-105 active:scale-95
      "
      title="Log a moment of weakness"
    >
      <span>I HAD A WEAK MOMENT</span>
      <TallyMarks count={distractionCount} />
    </button>
  );
}; 