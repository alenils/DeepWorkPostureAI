import { useCallback } from 'react';
import { useAudio } from './AudioProvider'; // Import useAudio to access the context

/**
 * Custom hook for playing sound effects.
 * Relies on AudioProvider to manage and play sounds.
 * @param sfxName Filename of the sound effect (e.g., "start.mp3")
 * @returns Function to trigger the sound effect
 */
export const useSound = (sfxName: string) => {
  const { playSfx } = useAudio(); // Get playSfx from our AudioProvider context

  // Return a memoized function that calls the context's playSfx
  const triggerSound = useCallback(() => {
    if (playSfx) {
      playSfx(sfxName);
    } else {
      console.warn('[useSound] playSfx function not available from AudioProvider');
    }
  }, [playSfx, sfxName]);

  return triggerSound;
}; 