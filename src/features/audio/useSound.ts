import { useCallback } from 'react';

// Glob all SFX. Assumes SFX files are in /public/sfx/
const sfxFileModules = import.meta.glob(
  '/sfx/*.mp3', // Path relative to /public directory
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>; 

// Build a Map for easy lookup: e.g., "start.mp3" -> "/sfx/start.mp3?t=..."
const sfxMap = new Map<string, string>();
Object.entries(sfxFileModules).forEach(([path, url]) => {
  // path will be like '/sfx/start.mp3'
  const filename = path.substring(path.lastIndexOf('/') + 1);
  if (filename) {
    sfxMap.set(filename, url);
  }
});
// console.log("useSound: SFX Map initialized:", sfxMap);

/**
 * Custom hook for playing sound effects.
 * Sound files should be in /public/sfx/
 * @param baseFilename Filename of the sound file (e.g., "start.mp3")
 * @returns Function to play the sound
 */
export const useSound = (baseFilename: string) => {
  const play = useCallback(() => {
    const soundUrl = sfxMap.get(baseFilename);
    if (!soundUrl) {
      console.warn(`Sound effect "${baseFilename}" not found in sfxMap. Available:`, Array.from(sfxMap.keys()));
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