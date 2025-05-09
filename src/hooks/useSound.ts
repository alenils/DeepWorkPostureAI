import { useCallback } from 'react';

// Glob all SFX from /public/sfx/
const sfxFiles = import.meta.glob('/sfx/*.mp3', { eager: true, as: 'url' });

// Build a Map for easy lookup: e.g., "start.mp3" -> "/sfx/start.mp3?t=..."
const sfxMap = new Map<string, string>();
Object.entries(sfxFiles).forEach(([path, url]) => {
  const filename = path.split('/').pop();
  if (filename) {
    sfxMap.set(filename, url);
  }
});
// console.log("useSound: SFX Map initialized:", sfxMap); // Optional: for debugging

/**
 * Custom hook for playing sound effects from /public/sfx/
 * @param baseFilename Filename of the sound file (e.g., "start.mp3")
 * @returns Function to play the sound
 */
export const useSound = (baseFilename: string) => {
  const play = useCallback(() => {
    const soundUrl = sfxMap.get(baseFilename);
    if (!soundUrl) {
      console.warn(`Sound effect "${baseFilename}" not found in sfxMap.`);
      return;
    }

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(error => {
        console.warn(`Failed to play sound "${baseFilename}": ${error.message}`);
      });
    } catch (error) {
      console.warn(`Failed to create audio for "${baseFilename}": ${error}`);
    }
  }, [baseFilename]);

  return play;
}; 