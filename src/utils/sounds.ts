// src/utils/sounds.ts

// Pre-load SFX once and export a lookup
const sfxFiles = import.meta.glob(
  '/sounds/sfx/*.mp3', // Path relative to /public directory
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>; // Cast to Record<string, string> as glob with these options returns URLs

// Helper to get the base filename from the glob path
const getBaseName = (path: string) => path.split('/').pop()!;

export const SFX = {
  start: sfxFiles['/sounds/sfx/start.mp3'],
  pause: sfxFiles['/sounds/sfx/pause.mp3'],
  done: sfxFiles['/sounds/sfx/done.mp3'],
  check: sfxFiles['/sounds/sfx/check.mp3'],
  cancel: sfxFiles['/sounds/sfx/cancel.mp3'],
  distract: sfxFiles['/sounds/sfx/distraction.mp3'], // Assuming distraction.mp3 is the filename
};

// Optional: Log to verify SFX paths are loaded
// console.log("SFX Loaded:", SFX);

// Function to play a sound, can be used in components
export function playSfx(sfxUrl: string | undefined) {
  if (!sfxUrl) {
    console.warn("SFX URL is undefined, cannot play sound.");
    return;
  }
  try {
    const audio = new Audio(sfxUrl);
    audio.volume = 0.5; // Example volume
    audio.play().catch(error => {
      console.warn(`Failed to play SFX: ${sfxUrl}, Error: ${error.message}`);
    });
  } catch (error) {
    console.warn(`Failed to create audio for SFX: ${sfxUrl}, Error: ${error}`);
  }
} 