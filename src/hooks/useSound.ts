import { useCallback } from 'react';

/**
 * Custom hook for playing sound effects
 * @param filename Name of the sound file in /public/sounds/sfx/ directory
 * @returns Function to play the sound
 */
export const useSound = (filename: string) => {
  const play = useCallback(() => {
    try {
      const audio = new Audio(`/sounds/sfx/${filename}`);
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(error => {
        console.warn(`Failed to play sound: ${error.message}`);
      });
    } catch (error) {
      console.warn(`Failed to create audio: ${error}`);
    }
  }, [filename]);

  return play;
}; 