import { useState, useEffect, useRef } from 'react';
import { msToClock } from '../utils/time';

// --- FOCUSED DIAGNOSTIC SECTION ---
// ENSURE "A black feast.mp3" (or your chosen test file) is DIRECTLY in the /public folder for this test.
const musicFilesFromGlob = import.meta.glob('/A black feast.mp3', { eager: true, as: 'url' });
console.log("MusicPlayer [FOCUSED TEST]: Result of import.meta.glob('/A black feast.mp3'):", musicFilesFromGlob);

interface Song {
  name: string;
  url: string;
}

const trackList: Song[] = Object.entries(musicFilesFromGlob).map(([path, url]) => {
  console.log("MusicPlayer [FOCUSED TEST]: Processing path for trackList:", path, "url:", url);
  return {
    url,
    name: decodeURIComponent(path).split('/').pop()!.replace('.mp3', '')
  };
});
console.log("MusicPlayer [FOCUSED TEST]: Final generated trackList:", trackList);
// --- END FOCUSED DIAGNOSTIC SECTION ---

interface MusicPlayerProps {
  isSessionActive?: boolean;
}

const MusicPlayer: React.FC<{ isSessionActive?: boolean }> = ({ isSessionActive = false }) => {
  const currentAudioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize songs state with the (potentially empty) trackList from the focused test
  const [songs, setSongs] = useState<Song[]>(trackList);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [nextSongIndex, setNextSongIndex] = useState(trackList.length > 1 ? 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songName, setSongName] = useState('');
  const [isCrossFading, setIsCrossFading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEqEnabled, setIsEqEnabled] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(true);
  const [playInSession, setPlayInSession] = useState(false);
  const fadeIntervalRef = useRef<number | null>(null);
  const prevIsSessionActiveRef = useRef(isSessionActive);
  
  console.log("MusicPlayer Render: initial songs state length:", songs.length, "trackList length:", trackList.length);

  // Initialize/Update song related state from localStorage and trackList
  useEffect(() => {
    console.log("MusicPlayer useEffect [songs]: songs.length =", songs.length);
    if (songs.length > 0) {
      const savedIndexStr = localStorage.getItem('lastSongIndex');
      let initialIndex = 0;
      if (savedIndexStr !== null) {
        const savedIndex = parseInt(savedIndexStr, 10);
        if (savedIndex >= 0 && savedIndex < songs.length) {
            initialIndex = savedIndex;
        }
      }
      setCurrentSongIndex(initialIndex);
      setNextSongIndex((initialIndex + 1) % songs.length);
      // Set initial song name
      if (songs[initialIndex]) {
        setSongName(songs[initialIndex].name);
      }

      const loopPreference = localStorage.getItem('flowLoop');
      if (loopPreference !== null) {
        setIsLoopEnabled(loopPreference === 'true');
      }
      
      const sessionPlayPreference = localStorage.getItem('playInSession');
      if (sessionPlayPreference !== null) {
        setPlayInSession(sessionPlayPreference === 'true');
      }
    } else {
        setCurrentSongIndex(0);
        setNextSongIndex(0);
        setSongName("No songs loaded (useEffect)");
    }
  }, [songs]); // Re-run if songs array itself changes (e.g. on HMR if glob changes)

  // Update songName when currentSongIndex or songs list changes
  useEffect(() => {
    console.log("MusicPlayer useEffect [currentSongIndex, songs]: songs.length =", songs.length, "currentSongIndex =", currentSongIndex);
    if (songs.length > 0 && songs[currentSongIndex]) {
      setSongName(songs[currentSongIndex].name);
      localStorage.setItem('lastSongIndex', currentSongIndex.toString());
    } else if (songs.length === 0) {
      setSongName("No songs loaded (useEffect name update)");
    }
  }, [currentSongIndex, songs]);

  // Update current time and duration from audio element
  useEffect(() => {
    const audioEl = currentAudioRef.current;
    if (!audioEl) return;
    
    const updateAudioData = () => {
      setCurrentTime(audioEl.currentTime);
      setDuration(audioEl.duration || 0);
    };

    audioEl.addEventListener('loadedmetadata', updateAudioData);
    audioEl.addEventListener('timeupdate', updateAudioData); // More frequent updates

    // Initial update in case metadata is already loaded
    if(audioEl.readyState >= audioEl.HAVE_METADATA) {
        updateAudioData();
    }
    
    return () => {
      audioEl.removeEventListener('loadedmetadata', updateAudioData);
      audioEl.removeEventListener('timeupdate', updateAudioData);
    };
  }, [currentSongIndex, songs]); // Re-run when song changes

  // Initialize audio context and analyzer for equalizer
  useEffect(() => {
    // Always ensure audio context exists
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Failed to create audio context:', e);
        return;
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.error('Failed to resume audio context:', e));
    }

    // When EQ is toggled OFF
    if (!isEqEnabled) {
      // Clean up visualizer
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Properly clean up and reconnect
      if (analyserRef.current && sourceNodeRef.current && audioContextRef.current) {
        try {
          analyserRef.current.disconnect();
          
          // Disconnect source and reconnect directly to destination for audio to continue
          try { 
            sourceNodeRef.current.disconnect(); 
          } catch (e) {
            // Ignore disconnect errors if already disconnected
          }
          
          // Reconnect source directly to destination
          sourceNodeRef.current.connect(audioContextRef.current.destination);
        } catch (e) {
          console.error('Error during EQ disconnection:', e);
        }
        
        analyserRef.current = null;
      }
      
      // Clear canvas if it exists
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      return;
    }
    
    // When EQ is toggled ON
    
    // Only set up the analyzer if we have audio context and it doesn't exist yet
    if (!analyserRef.current && audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    
    // Set up connection chain if we have all needed components
    if (currentAudioRef.current && audioContextRef.current && analyserRef.current) {
      try {
        // Only create a new source node if one doesn't exist
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(currentAudioRef.current);
        } else {
          // If source exists, disconnect it first to avoid duplicate connections
          try { 
            sourceNodeRef.current.disconnect(); 
          } catch (e) {
            // Ignore disconnect errors
          }
        }
        
        // Connect the audio pipeline: source -> analyser -> destination
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error('Failed to setup audio nodes:', e);
        return;
      }
    }
    
    // Start the visualizer for the EQ display
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barWidth = canvas.width / bufferLength * 2.5;
    let x = 0;
    
    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      
      x = 0;
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Use gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3B82F6'); // blue-500
        gradient.addColorStop(0.5, '#60A5FA'); // blue-400
        gradient.addColorStop(1, '#93C5FD'); // blue-300
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    renderFrame();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isEqEnabled]);

  // Start cross-fade when current song is near end
  useEffect(() => {
    if (!isPlaying || songs.length <= 1 || !currentAudioRef.current || !nextAudioRef.current) return;

    const currentAudio = currentAudioRef.current;
    
    // Function to check if we should start cross-fading
    const checkTime = () => {
      if (!currentAudio || isCrossFading) return;
      
      // Start cross-fade 5 seconds before the end
      const fadeTime = 5; // seconds
      if (currentAudio.duration && currentAudio.currentTime > currentAudio.duration - fadeTime) {
        startCrossFade();
      }
    };
    
    // Set up interval to check time
    const timeCheckInterval = setInterval(checkTime, 500);
    
    return () => {
      clearInterval(timeCheckInterval);
    };
  }, [isPlaying, songs, isCrossFading]);

  // Handle cross-fade between tracks
  const startCrossFade = () => {
    if (!currentAudioRef.current || !nextAudioRef.current || songs.length <= 1) return;
    
    // Check if we should stop after current song based on loop setting
    if (!isLoopEnabled && currentSongIndex === songs.length - 1) {
      if (currentAudioRef.current) {
        // Let the song finish but don't start the next one
        setIsPlaying(false);
        return;
      }
    }
    
    setIsCrossFading(true);
    const currentAudio = currentAudioRef.current;
    const nextAudio = nextAudioRef.current;
    const fadeTime = 5; // seconds
    
    // Make sure next audio is ready
    nextAudio.volume = 0;
    nextAudio.play().catch(console.error);
    
    // Cross-fade over 5 seconds
    let startTime = Date.now();
    const fadeInterval = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      
      if (elapsed <= fadeTime) {
        // Decrease current audio volume
        currentAudio.volume = Math.max(0, 1 - (elapsed / fadeTime));
        // Increase next audio volume
        nextAudio.volume = Math.min(1, elapsed / fadeTime);
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
    }, 50);
    
    fadeIntervalRef.current = fadeInterval;
  };

  // Control play/pause
  useEffect(() => {
    if (songs.length === 0 || !currentAudioRef.current) return;
    
    if (isPlaying) {
      currentAudioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
    } else {
      currentAudioRef.current.pause();
    }
    // This effect should primarily react to isPlaying state or song change
  }, [isPlaying, currentSongIndex, songs]);

  // Handle session active changes for "Only play when session is ON" feature
  useEffect(() => {
    if (playInSession) {
      // If state changed from not active to active, play
      if (!prevIsSessionActiveRef.current && isSessionActive) {
        setIsPlaying(true);
      }
      // If state changed from active to not active, pause
      else if (prevIsSessionActiveRef.current && !isSessionActive) {
        setIsPlaying(false);
      }
    }
    
    // Update the ref for next comparison
    prevIsSessionActiveRef.current = isSessionActive;
  }, [isSessionActive, playInSession]);

  // Handle audio ended event (if cross-fade somehow fails)
  const handleAudioEnded = () => {
    if (!isCrossFading && songs.length > 1) {
      // If we're on the last track and loop is disabled, stop playback
      if (!isLoopEnabled && currentSongIndex === songs.length - 1) {
        setIsPlaying(false);
        return;
      }
      
      setCurrentSongIndex(nextSongIndex);
      setNextSongIndex((nextSongIndex + 1) % songs.length);
    }
  };

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
    
    // Restart with new track if currently playing
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
    
    // Restart with new track if currently playing
    if (currentAudioRef.current) {
      setTimeout(() => {
        if (currentAudioRef.current && isPlaying) {
          currentAudioRef.current.play().catch(console.error);
        }
      }, 50);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentAudioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * currentAudioRef.current.duration;
    
    currentAudioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle loop mode
  const toggleLoop = () => {
    const newValue = !isLoopEnabled;
    setIsLoopEnabled(newValue);
    localStorage.setItem('flowLoop', newValue.toString());
  };

  // Toggle equalizer with improved connection handling
  const toggleEqualizer = () => {
    setIsEqEnabled(prev => !prev);
  };

  // Toggle playInSession mode
  const togglePlayInSession = () => {
    const newValue = !playInSession;
    setPlayInSession(newValue);
    localStorage.setItem('playInSession', newValue.toString());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">🎵 Flow Booster</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayInSession}
            className={`p-1 rounded text-xs ${
              playInSession 
                ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
            title="Only play when session is active"
          >
            ⏱️
          </button>
          <button
            onClick={toggleLoop}
            className={`p-1 rounded text-xs ${
              isLoopEnabled 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
            title="Loop playlist"
          >
            ⟳
          </button>
          <button
            onClick={toggleEqualizer}
            className={`p-1 rounded text-xs ${
              isEqEnabled 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            } transition-colors`}
            title="Toggle Equalizer"
          >
            EQ
          </button>
        </div>
      </div>

      {/* Song Name and Time */}
      <div className="mb-2">
        {(() => {
          console.log("MusicPlayer - Rendering songs. Count:", songs.length, "Current Song Name:", songName);
          return null;
        })()}
        <div className="text-center truncate text-gray-700 dark:text-gray-300 mb-1">
          {songs.length === 0 ? <p>No songs found (render)</p> : songName}
        </div>
        
        {isEqEnabled && (
          <div className="my-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-20" width={300} height={80} />
          </div>
        )}
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{msToClock(currentTime * 1000)}</span>
          <span>{msToClock(duration * 1000)}</span>
        </div>
        
        <div ref={progressRef} className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 mb-3 cursor-pointer overflow-hidden" onClick={handleProgressClick}>
          <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button 
          onClick={handlePrevious}
          className={`w-10 h-10 flex items-center justify-center rounded-full 
            ${songs.length > 1 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' 
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
              ? (isPlaying 
                ? 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' 
                : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700')
              : 'bg-gray-400 text-white cursor-not-allowed'} 
            transition-colors`}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={songs.length === 0}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button 
          onClick={handleNext}
          className={`w-10 h-10 flex items-center justify-center rounded-full 
            ${songs.length > 1 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} 
            transition-colors`}
          aria-label="Next song"
          disabled={songs.length <= 1}
        >
          ⏭️
        </button>
      </div>

      {/* Hidden audio elements */}
      {songs.length > 0 && songs[currentSongIndex] && (
        <>
          <audio
            ref={currentAudioRef}
            src={songs[currentSongIndex].url} // Use .url
            onEnded={handleAudioEnded}
            // onLoadedMetadata is handled by useEffect now
          />
          {songs.length > 1 && songs[nextSongIndex] && (
            <audio
              ref={nextAudioRef}
              src={songs[nextSongIndex].url} // Use .url
            />
          )}
        </>
      )}
    </div>
  );
};

export { MusicPlayer }; 