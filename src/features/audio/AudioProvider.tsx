/* ===== DEBUG GLOB ===== */
const debugMusic = import.meta.glob('/music/**/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
});

const debugSfx = import.meta.glob('/sounds/sfx/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
});

// Output the keys (just the paths — no URL noise)
console.log('[DEBUG] music keys', Object.keys(debugMusic));
console.log('[DEBUG] sfx   keys', Object.keys(debugSfx));
/* ====================== */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

// Types will be defined here (e.g., Song, Album)
export interface Song {
  name: string;
  url: string;
  album: AlbumId; // To identify which album it belongs to
}

export type AlbumId = 'album1' | 'album2';

interface AudioContextType {
  // Music state & controls
  songs: Song[]; // Current playlist (can be shuffled)
  currentTrack: Song | null;
  isPlaying: boolean;
  playPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectAlbum: (albumId: AlbumId) => void;
  selectedAlbum: AlbumId;
  toggleShuffle: () => void;
  isShuffleActive: boolean;
  // SFX controls
  playSfx: (sfxName: string) => void;
  // Future additions: volume, progress, seeking, EQ, crossfade, etc.
  audioElementRef: React.RefObject<HTMLAudioElement>; // For MusicPlayer to use
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// --- SFX Loading (Suggestion A.1, A.3 - Corrected path based on /public/sounds/sfx)
const sfxFiles = import.meta.glob('/sounds/sfx/*.mp3', { eager:true, query:'?url', import:'default' }) as Record<string, string>;
const sfxMap = new Map<string, string>(
  Object.entries(sfxFiles).map(([path, url]) => {
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return [filename, url];
  })
);
console.log("AudioProvider: SFX Map initialized:", sfxMap); // For debugging

// --- Music Track Loading (Suggestion A.1, A.2) ---
const albumTracksGlob = import.meta.glob('/music/**/*.mp3', { eager:true, query:'?url', import:'default' }) as Record<string, string>;

const allLoadedTracks: Record<AlbumId, Song[]> = {
  album1: [],
  album2: [],
};

const trackListForProvider: Song[] = []; // Flat list for initial provider state if needed, or derive from allLoadedTracks

Object.entries(albumTracksGlob).forEach(([path, url]) => {
  const name = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1).replace('.mp3', ''));
  let album: AlbumId = 'album1'; // Default or derive from path
  if (path.includes('/music/album1/')) {
    album = 'album1';
  } else if (path.includes('/music/album2/')) {
    album = 'album2';
  }
  // Can add more sophisticated album detection if folder structure is deeper/different

  const song: Song = { url, name, album };
  allLoadedTracks[album].push(song);
  trackListForProvider.push(song); // Add to the flat list
});

// Sort tracks within each album
allLoadedTracks.album1.sort((a, b) => a.name.localeCompare(b.name));
allLoadedTracks.album2.sort((a, b) => a.name.localeCompare(b.name));

console.log("AudioProvider: All music tracks loaded:", allLoadedTracks);
if (trackListForProvider.length === 0) {
  console.warn("AudioProvider: trackListForProvider is empty. No music tracks were loaded. Check glob paths and /public/music folder structure.");
}

// --- Fisher-Yates Shuffle ---
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumId>('album1');
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  // Initialize with tracks from the selected album, potentially shuffled (Suggestion B)
  const [currentTracklist, setCurrentTracklist] = useState<Song[]>(() => {
    const initialAlbumTracks = allLoadedTracks[selectedAlbum] || [];
    return isShuffleActive ? shuffleArray(initialAlbumTracks) : initialAlbumTracks;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentTrack = currentTracklist[currentTrackIndex] || null;

  // Initialize AudioContext and handle resume on first user interaction (Suggestion C)
  useEffect(() => {
    const resume = () => {
      if (!audioContextRef.current && window.AudioContext) {
        try {
          audioContextRef.current = new window.AudioContext();
        } catch (e) {
          console.error("Failed to create AudioContext:", e);
          return;
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.error("AudioContext resume failed:", e));
      }
      // Clean up listeners once resumed or attempt failed
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };

    // Only add listeners if context is not yet running
    // This also handles the case where AudioContext might not be supported
    if (window.AudioContext && (!audioContextRef.current || audioContextRef.current.state !== 'running')) {
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    }

    return () => {
      // Ensure listeners are cleaned up on component unmount if they haven't fired
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, []);

  // Update tracklist when album or shuffle state changes
  useEffect(() => {
    const baseTracklist = allLoadedTracks[selectedAlbum] || [];
    const newTracklist = isShuffleActive ? shuffleArray(baseTracklist) : baseTracklist;
    setCurrentTracklist(newTracklist);
    setCurrentTrackIndex(0); // Reset to first track of new list
  }, [selectedAlbum, isShuffleActive]);

  // --- Audio Playback Controls ---
  const playPause = useCallback(() => {
    if (!audioElementRef.current || !currentTrack) return;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
         if (audioElementRef.current) {
            if (isPlaying) audioElementRef.current.pause();
            else audioElementRef.current.play().catch(console.error);
            setIsPlaying(!isPlaying);
         }
      }).catch(console.error);
      return;
    }

    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTrack]);

  const selectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    if (audioElementRef.current) {
      // audioElementRef.current.src = currentTracklist[index].url; // This will be handled by MusicPlayer via currentTrack.url
      if (isPlaying) {
        // Delay play slightly to allow src change to take effect if MusicPlayer handles it
        // setTimeout(() => audioElementRef.current?.play().catch(console.error), 50);
      } else {
        // If paused, we just want the src to update, MusicPlayer will handle loading
      }
    }
  }, [isPlaying, currentTracklist]);

  const nextTrack = useCallback(() => {
    if (currentTracklist.length === 0) return;
    const newIndex = (currentTrackIndex + 1) % currentTracklist.length;
    selectTrack(newIndex);
  }, [currentTrackIndex, currentTracklist.length, selectTrack]);

  const prevTrack = useCallback(() => {
    if (currentTracklist.length === 0) return;
    const newIndex = (currentTrackIndex - 1 + currentTracklist.length) % currentTracklist.length;
    selectTrack(newIndex);
  }, [currentTrackIndex, currentTracklist.length, selectTrack]);

  const playSfx = useCallback((sfxName: string) => {
    const url = sfxMap.get(sfxName);
    if (url) {
      // Ensure context is running for SFX too (Suggestion C part implied)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
         audioContextRef.current.resume().catch(console.error);
      }
      const audio = new Audio(url);
      audio.volume = 0.4; // SFX Volume
      audio.play().catch(e => console.warn(`SFX "${sfxName}" (url: ${url}) play error:`, e));
    } else {
      console.warn(`SFX "${sfxName}" not found. Available:`, Array.from(sfxMap.keys()));
    }
  }, []);

  const selectAlbumCallback = useCallback((albumId: AlbumId) => {
    if (isPlaying) {
        // Optionally pause music when album changes, or let it continue if new track exists
        // setIsPlaying(false);
    }
    setSelectedAlbum(albumId);
  }, [isPlaying]);

  const toggleShuffleCallback = useCallback(() => {
    setIsShuffleActive(prev => !prev);
  }, []);
  
  // Effect to handle audio element source change and play/pause state
  useEffect(() => {
    if (audioElementRef.current && currentTrack) {
      if (audioElementRef.current.src !== currentTrack.url) {
        audioElementRef.current.src = currentTrack.url;
        // MusicPlayer will receive new currentTrack and handle loading it
      }
      if (isPlaying) {
        audioElementRef.current.play().catch(e => {
            console.error('Error playing audio in effect:', e);
            // setIsPlaying(false); // Optionally stop if play fails
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [currentTrack, isPlaying]);


  const value: AudioContextType = {
    songs: currentTracklist,
    currentTrack,
    isPlaying,
    playPause,
    nextTrack,
    prevTrack,
    selectAlbum: selectAlbumCallback,
    selectedAlbum,
    toggleShuffle: toggleShuffleCallback,
    isShuffleActive,
    playSfx,
    audioElementRef,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}; 