import React from 'react';

interface QuoteDisplayProps {
  quote: string;
}

export const QuoteDisplay = ({ quote }: QuoteDisplayProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">💬 Inspiration</h2>
      
      <div className="flex flex-col items-center justify-center h-32">
        <p className="italic opacity-70 text-gray-600 dark:text-gray-400 text-sm max-w-xs text-center">
          {quote || "The best way to predict the future is to create it."}
        </p>
      </div>
    </div>
  );
}; 