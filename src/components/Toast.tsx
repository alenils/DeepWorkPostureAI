import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  duration?: number;
}

export const Toast = ({ message, duration = 3000 }: ToastProps) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in-scale z-50">
      {message}
    </div>
  );
}; 