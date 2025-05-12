/* ===== DEBUG GLOB ===== */
const debugMusic = import.meta.glob('../../assets/music/**/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
});

const debugSfx = import.meta.glob('../../assets/sfx/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
});

// Output the keys (just the paths — no URL noise)
console.log('[DEBUG] music keys', Object.keys(debugMusic));
console.log('[DEBUG] sfx   keys', Object.keys(debugSfx));
/* ====================== */

// Define initialSfxMap at the module level as suggested
const initialSfxMap: Map<string, string> = new Map();

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

// --- SFX Loading (sfxFiles is still module-level and eagerly loaded)
const sfxFiles = import.meta.glob('../../assets/sfx/*.mp3', { eager:true, query:'?url', import:'default' }) as Record<string, string>;
// The module-level sfxMap initialization can be removed or kept for direct debugging, 
// but the component will use sfxMapRef.current
// console.log("AudioProvider: Module-level SFX Map initialized:", new Map(Object.entries(sfxFiles).map(([p, u]) => [p.split('/').pop()!, u as string])));

// --- Music Track Loading (Suggestion A.1, A.2) ---
const albumTracksGlob = import.meta.glob('../../assets/music/**/*.mp3', { eager:true, query:'?url', import:'default' }) as Record<string, string>;

const allLoadedTracks: Record<AlbumId, Song[]> = {
  album1: [],
  album2: [],
};

const trackListForProvider: Song[] = []; // Flat list for initial provider state if needed, or derive from allLoadedTracks

Object.entries(albumTracksGlob).forEach(([path, url]) => {
  const name = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1).replace('.mp3', ''));
  
  // Robust album detection using regex (Suggestion ❶)
  const folderMatch = path.match(/music\/([^/]+)\//i); // Matches text between /music/ and the next slash
  const folderName = folderMatch?.[1]?.toLowerCase();
  
  let album: AlbumId = 'album1'; // Default to album1
  if (folderName === 'album2') {
    album = 'album2';
  }
  // All other folder names (or if no match, e.g. files directly in /music/) will default to album1
  // Or, you could add more specific checks if needed: else if (folderName === 'album1') album = 'album1';

  console.log(`[AudioProvider] Processing track: ${path}, Raw Folder: ${folderMatch?.[1]}, Determined Album: ${album}`);
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
  const [currentTracklist, setCurrentTracklist] = useState<Song[]>(() => {
    const initialAlbumTracks = allLoadedTracks[selectedAlbum] || [];
    return isShuffleActive ? shuffleArray(initialAlbumTracks) : initialAlbumTracks;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // SFX Map Ref as suggested
  const sfxMapRef = useRef(initialSfxMap);

  // Fill sfxMapRef.current exactly once
  if (sfxMapRef.current.size === 0 && Object.keys(sfxFiles).length > 0) {
    Object.entries(sfxFiles).forEach(([path, url]) => {
      const file = path.split('/').pop()!;
      sfxMapRef.current.set(file, url as string);
    });
    console.log('[AudioProvider] sfxMapRef.current populated:', sfxMapRef.current);
  }

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

  // Effect 1: Update tracklist and RESET index when selectedAlbum changes
  useEffect(() => {
    console.log(`[AudioProvider useEffect Album] Album changed to: ${selectedAlbum}`);
    const baseTracklist = allLoadedTracks[selectedAlbum] || [];
    const newTracklist = isShuffleActive ? shuffleArray(baseTracklist) : baseTracklist;
    console.log(`[AudioProvider useEffect Album] Setting new tracklist for ${selectedAlbum}:`, newTracklist.map(t => t.name));
    setCurrentTracklist(newTracklist);
    setCurrentTrackIndex(0); // Reset index only on album change
  }, [selectedAlbum]); // Only depends on selectedAlbum

  // Effect 2: Re-shuffle the list when isShuffleActive changes, WITHOUT resetting index
  useEffect(() => {
    console.log(`[AudioProvider useEffect Shuffle] Shuffle toggled: ${isShuffleActive}`);
    // Get the currently loaded tracks (which should be for the correct selectedAlbum due to Effect 1)
    const currentAlbumTracks = allLoadedTracks[selectedAlbum] || []; 
    const newTracklist = isShuffleActive ? shuffleArray(currentAlbumTracks) : currentAlbumTracks;
    
    // Find the index of the currently playing track *within the newly shuffled/unshuffled list*
    let newIndex = 0; // Default to 0 if track not found or list empty
    if(currentTrack && newTracklist.length > 0) {
      const foundIndex = newTracklist.findIndex(t => t.url === currentTrack.url);
      if (foundIndex !== -1) {
        newIndex = foundIndex;
      }
    }
    
    console.log(`[AudioProvider useEffect Shuffle] Updating tracklist (shuffled: ${isShuffleActive}). Current track index will be: ${newIndex}`, newTracklist.map(t=>t.name));
    setCurrentTracklist(newTracklist); 
    setCurrentTrackIndex(newIndex); // Set index to current track's new position, or 0

  }, [isShuffleActive, selectedAlbum, currentTrack]); // Rerun if shuffle state changes (or album changes, to get correct base list)
    // Including currentTrack might cause loops if not careful, but needed to find its new index.
    // Let's refine dependency if needed, but selectedAlbum is necessary to get the right base list.
    // Re-evaluating dependency array: maybe just depend on isShuffleActive and selectedAlbum?
    // If we only depend on isShuffleActive, the base list might be stale if album changed JUST before shuffle toggle.
    // Let's stick with [isShuffleActive, selectedAlbum, currentTrack] for now, keeping an eye on potential loops.

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

  // Rewritten nextTrack function for shuffle and sequential playback (Suggestion ❷)
  const nextTrack = useCallback(() => {
    if (!currentTrack || currentTracklist.length === 0) {
      // If there's no current track or the list is empty, try to play the first track if available
      if (currentTracklist.length > 0) {
        selectTrack(0);
      }
      return;
    }

    let nextSong: Song | undefined;

    if (isShuffleActive) {
      // Filter out the current track by its URL to avoid playing it immediately again if possible
      const remainingTracks = currentTracklist.filter(t => t.url !== currentTrack.url);
      if (remainingTracks.length > 0) {
        nextSong = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
      } else if (currentTracklist.length > 0) {
        // If current track was the only one, or all tracks are identical (e.g., list of 1),
        // or remainingTracks is empty for any other reason, pick any random from the full list.
        nextSong = currentTracklist[Math.floor(Math.random() * currentTracklist.length)];
      }
    } else {
      const currentIndex = currentTracklist.findIndex(t => t.url === currentTrack.url);
      if (currentIndex !== -1) { // Check if current track was found
        const nextIndex = (currentIndex + 1) % currentTracklist.length;
        nextSong = currentTracklist[nextIndex];
      } else if (currentTracklist.length > 0) {
        // Fallback if current track wasn't found in list (shouldn't happen often)
        // Play the first track of the current list
        nextSong = currentTracklist[0];
        console.warn("[AudioProvider] nextTrack: Current track not found in tracklist, falling back to first track.");
      }
    }

    if (nextSong) {
      const nextSongIndex = currentTracklist.findIndex(t => t.url === nextSong!.url);
      if (nextSongIndex !== -1) {
        selectTrack(nextSongIndex); // selectTrack sets the currentTrackIndex
      } else {
        // This case should ideally not happen if nextSong comes from currentTracklist
        console.warn("[AudioProvider] nextTrack: Could not find the determined next song in the tracklist. This is unexpected.");
        if (currentTracklist.length > 0) selectTrack(0); // Fallback to first track of current list
      }
    } else if (currentTracklist.length > 0) {
        // Fallback if no next song could be determined (e.g. empty list after filter and no fallback selected)
        console.warn("[AudioProvider] nextTrack: No next song could be determined, playing first track of current list as fallback.");
        selectTrack(0);
    } else {
      // If currentTracklist is empty and we somehow got here (e.g. it became empty after currentTrack was set)
      console.warn("[AudioProvider] nextTrack: Tracklist is empty, cannot determine next track.");
      // Optionally, set currentTrack to null or handle appropriately
      // For now, do nothing, which might leave the player stopped with no track.
    }
  }, [currentTrack, currentTracklist, isShuffleActive, selectTrack]);

  const prevTrack = useCallback(() => {
    if (currentTracklist.length === 0) return;
    const newIndex = (currentTrackIndex - 1 + currentTracklist.length) % currentTracklist.length;
    selectTrack(newIndex);
  }, [currentTrackIndex, currentTracklist.length, selectTrack]);

  // New playSfx function as suggested
  const playSfx: AudioContextType['playSfx'] = (name) => {
    const map = sfxMapRef.current;
    console.log('[AudioProvider playSfx] Attempting to play:', name, 'Available SFX in mapRef:', [...map.keys()]);
    const url = map.get(name);
    if (!url) {
      console.warn(`[AudioProvider playSfx] SFX "${name}" missing from sfxMapRef.current. Map size: ${map.size}`);
      return;
    }
    // Ensure AudioContext is running
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => console.error('[AudioProvider playSfx] AudioContext resume failed:', err));
    }
    const audio = new Audio(url);
    audio.volume = 0.4; // SFX Volume
    audio.play().catch(err => console.warn(`[AudioProvider playSfx] SFX "${name}" (url: ${url}) play error:`, err));
  };

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