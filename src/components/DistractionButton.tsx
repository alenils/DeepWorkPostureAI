interface DistractionButtonProps {
  isVisible: boolean;
  onDistraction: () => void;
}

export const DistractionButton = ({ isVisible, onDistraction }: DistractionButtonProps) => {
  if (!isVisible) return null;

  return (
    <button
      onClick={onDistraction}
      className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transform transition-transform hover:scale-105 active:scale-95 flex items-center space-x-2"
    >
      <span className="text-xl">❌</span>
      <span className="font-medium">DOH! Distracted...</span>
    </button>
  );
}; 