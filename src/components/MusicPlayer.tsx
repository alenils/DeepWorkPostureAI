import { useState, useEffect, useRef } from 'react';

export const MusicPlayer = () => {
  const currentAudioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const [songs, setSongs] = useState<string[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [nextSongIndex, setNextSongIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songName, setSongName] = useState('');
  const [isCrossFading, setIsCrossFading] = useState(false);
  const fadeIntervalRef = useRef<number | null>(null);
  
  // Fetch song list using Vite's import.meta.glob
  useEffect(() => {
    try {
      // Using dynamic import with Vite glob pattern
      const songModules = import.meta.glob('/public/sounds/song*.mp3', { eager: true });
      
      // Process the returned object into an array of paths
      const songPaths = Object.keys(songModules)
        .map(path => path.replace('/public', ''))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      
      setSongs(songPaths);
      console.log('Loaded songs:', songPaths);
    } catch (error) {
      console.error('Failed to load songs:', error);
      setSongs([]);
    }
  }, []);

  // Initialize next song index when songs are loaded
  useEffect(() => {
    if (songs.length > 0) {
      const savedIndex = localStorage.getItem('lastSongIndex');
      if (savedIndex !== null && parseInt(savedIndex, 10) < songs.length) {
        const currentIdx = parseInt(savedIndex, 10);
        setCurrentSongIndex(currentIdx);
        setNextSongIndex((currentIdx + 1) % songs.length);
      } else {
        setNextSongIndex(songs.length > 1 ? 1 : 0);
      }
    }
  }, [songs]);

  // Extract song name from path
  useEffect(() => {
    if (songs.length > 0) {
      const path = songs[currentSongIndex];
      const fileName = path.split('/').pop() || '';
      const name = fileName.replace(/\.[^/.]+$/, '').replace('song', 'Song '); // Remove extension and format name
      setSongName(name);
      
      // Save current index to localStorage
      localStorage.setItem('lastSongIndex', currentSongIndex.toString());
    }
  }, [currentSongIndex, songs]);

  // Start cross-fade when current song is near end
  useEffect(() => {
    if (!isPlaying || songs.length <= 1 || !currentAudioRef.current || !nextAudioRef.current) return;

    const currentAudio = currentAudioRef.current;
    
    // Function to check if we should start cross-fading
    const checkTime = () => {
      if (!currentAudio || isCrossFading) return;
      
      // Start cross-fade 5 seconds before the end
      if (currentAudio.duration && currentAudio.currentTime > currentAudio.duration - 5) {
        startCrossFade();
      }
    };
    
    // Set up interval to check time
    const timeCheckInterval = setInterval(checkTime, 1000);
    
    return () => {
      clearInterval(timeCheckInterval);
    };
  }, [isPlaying, songs, isCrossFading]);

  // Handle cross-fade between tracks
  const startCrossFade = () => {
    if (!currentAudioRef.current || !nextAudioRef.current || songs.length <= 1) return;
    
    setIsCrossFading(true);
    const currentAudio = currentAudioRef.current;
    const nextAudio = nextAudioRef.current;
    
    // Make sure next audio is ready
    nextAudio.volume = 0;
    nextAudio.play().catch(console.error);
    
    // Cross-fade over 5 seconds
    let step = 0;
    const steps = 50; // 50 steps over 5 seconds = 1 step every 100ms
    const fadeInterval = window.setInterval(() => {
      step++;
      if (step <= steps) {
        // Decrease current audio volume
        currentAudio.volume = Math.max(0, 1 - (step / steps));
        // Increase next audio volume
        nextAudio.volume = Math.min(1, step / steps);
      } else {
        // Fade complete
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.volume = 1;
        nextAudio.volume = 1;
        
        // Update track indices
        setCurrentSongIndex(nextSongIndex);
        setNextSongIndex((nextSongIndex + 1) % songs.length);
        setIsCrossFading(false);
        
        // Clear interval
        clearInterval(fadeInterval);
        fadeIntervalRef.current = null;
      }
    }, 100);
    
    fadeIntervalRef.current = fadeInterval;
  };

  // Control play/pause
  useEffect(() => {
    if (songs.length === 0) return;
    
    if (isPlaying) {
      if (currentAudioRef.current) {
        currentAudioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        });
      }
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
      }
      // Clear any ongoing fade
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        setIsCrossFading(false);
      }
    }
  }, [isPlaying, currentSongIndex, songs]);

  const handlePlayPause = () => {
    if (songs.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (songs.length <= 1) return;
    
    // Stop any ongoing cross-fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    // Reset audio elements
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.volume = 1;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.volume = 1;
    }
    
    // Update indices
    setCurrentSongIndex(nextSongIndex);
    setNextSongIndex((nextSongIndex + 1) % songs.length);
    setIsCrossFading(false);
    
    // Always restart with new track, regardless of play state
    if (currentAudioRef.current) {
      setTimeout(() => {
        if (currentAudioRef.current && isPlaying) {
          currentAudioRef.current.play().catch(console.error);
        }
      }, 50);
    }
  };

  const handlePrevious = () => {
    if (songs.length <= 1) return;
    
    // Stop any ongoing cross-fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    // Reset audio elements
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.volume = 1;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.volume = 1;
    }
    
    // Calculate previous index
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    
    // Update indices
    setCurrentSongIndex(prevIndex);
    setNextSongIndex(currentSongIndex);
    setIsCrossFading(false);
    
    // Always restart with new track, regardless of play state
    if (currentAudioRef.current) {
      setTimeout(() => {
        if (currentAudioRef.current && isPlaying) {
          currentAudioRef.current.play().catch(console.error);
        }
      }, 50);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">🎵 Music</h2>

      {/* Song Name */}
      <div className="text-center mb-3 truncate text-gray-700 dark:text-gray-300">
        {songs.length > 0 ? songName : "No songs found"}
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button 
          onClick={handlePrevious}
          className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
            ${songs.length > 1 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} 
            transition-colors`}
          aria-label="Previous song"
          disabled={songs.length <= 1}
        >
          ⏮️
        </button>
        <button 
          onClick={handlePlayPause}
          className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer
            ${songs.length > 0 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-400 text-white cursor-not-allowed'} 
            transition-colors`}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={songs.length === 0}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button 
          onClick={handleNext}
          className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
            ${songs.length > 1 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} 
            transition-colors`}
          aria-label="Next song"
          disabled={songs.length <= 1}
        >
          ⏭️
        </button>
      </div>

      {/* Hidden audio elements for cross-fade */}
      {songs.length > 0 && (
        <>
          <audio
            ref={currentAudioRef}
            src={songs[currentSongIndex]}
            preload="auto"
          />
          {songs.length > 1 && (
            <audio
              ref={nextAudioRef}
              src={songs[nextSongIndex]}
              preload="auto"
            />
          )}
        </>
      )}
    </div>
  );
}; 