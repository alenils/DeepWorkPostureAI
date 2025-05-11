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

// --- SFX Loading ---
const sfxFileModules = import.meta.glob(
  '/sfx/*.mp3',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;

const sfxMap = new Map<string, string>();
Object.entries(sfxFileModules).forEach(([path, url]) => {
  const filename = path.substring(path.lastIndexOf('/') + 1);
  if (filename) {
    sfxMap.set(filename, url);
  }
});
console.log("AudioProvider: SFX Map initialized:", sfxMap); // For debugging

// --- Music Track Loading ---
const album1Modules = import.meta.glob('/music/album1/*.mp3', {query:'?url',import:'default',eager:true}) as Record<string, string>;
const album2Modules = import.meta.glob('/music/album2/*.mp3', {query:'?url',import:'default',eager:true}) as Record<string, string>;

function parseTracks(modules: Record<string, string>, albumId: AlbumId): Song[] {
  return Object.entries(modules).map(([path, url]) => ({
    url,
    name: decodeURIComponent(path.substring(path.lastIndexOf('/') + 1).replace('.mp3', '')),
    album: albumId,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

const allLoadedTracks: Record<AlbumId, Song[]> = {
  album1: parseTracks(album1Modules, 'album1'),
  album2: parseTracks(album2Modules, 'album2'),
};
console.log("AudioProvider: All music tracks loaded:", allLoadedTracks);

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
    return isShuffleActive ? shuffleArray(allLoadedTracks[selectedAlbum]) : allLoadedTracks[selectedAlbum];
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // For AudioContext resume utility

  const currentTrack = currentTracklist[currentTrackIndex] || null;

  // Initialize AudioContext and handle resume on first user interaction
  useEffect(() => {
    const resume = () => {
      if (!audioContextRef.current && window.AudioContext) {
        audioContextRef.current = new window.AudioContext();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(console.error);
      }
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
    if (!(audioContextRef.current && audioContextRef.current.state === 'running')) {
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    }
    return () => {
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
      if (audioContextRef.current?.state === 'suspended') { // Ensure context is running for SFX too
         audioContextRef.current.resume().catch(console.error);
      }
      const audio = new Audio(url);
      audio.volume = 0.4; // SFX Volume
      audio.play().catch(e => console.warn(`SFX ${sfxName} play error:`, e));
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