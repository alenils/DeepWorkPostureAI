import { useState, useEffect, useRef } from 'react';
import { msToClock } from '../utils/time';

interface MusicPlayerProps {
  isSessionActive?: boolean;
}

interface Song {
  name: string;
  url: string;
}

//------------------------------------------
// 1️⃣ GLOB ALL TRACKS FROM /public/sounds/music
//------------------------------------------
/** Returns an array of { name, url } for every mp3 in /public/sounds/music */
function loadFocusTracks() {
  const files = import.meta.glob(
    '/public/sounds/music/*.mp3', // Path relative to project root, targeting files in public/sounds/music
    { eager: true, query: '?url', import: 'default' }
  );
  // console.log("MusicPlayer: Raw files from glob:", files); // For temporary debugging if needed

  const loadedTracks = Object.entries(files).map(([path, url]) => ({
    url: url as string,
    name: decodeURIComponent(path.split('/').pop()!.replace('.mp3', ''))
  })).sort((a, b) => a.name.localeCompare(b.name)); // alpha-sort
  
  // console.log(`MusicPlayer: Loaded ${loadedTracks.length} focus tracks.`); // For temporary debugging
  return loadedTracks;
}
//------------------------------------------

const MusicPlayer: React.FC<{ isSessionActive?: boolean }> = ({ isSessionActive = false }) => {
  const currentAudioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [songs, setSongs] = useState(() => loadFocusTracks());
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [nextSongIndex, setNextSongIndex] = useState(songs.length > 1 ? 1 : 0); // Initialize based on loaded songs
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
  
  useEffect(() => {
    if (songs.length > 0) {
      console.log(`MusicPlayer: Loaded ${songs.length} focus tracks.`); // Acceptance criteria log
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
      if (songs[initialIndex]) {
        setSongName(songs[initialIndex].name);
      }
      const loopPreference = localStorage.getItem('flowLoop');
      if (loopPreference !== null) setIsLoopEnabled(loopPreference === 'true');
      const sessionPlayPreference = localStorage.getItem('playInSession');
      if (sessionPlayPreference !== null) setPlayInSession(sessionPlayPreference === 'true');
    } else {
        setSongName("No songs loaded");
    }
  }, [songs]);

  useEffect(() => {
    if (songs.length > 0 && songs[currentSongIndex]) {
      setSongName(songs[currentSongIndex].name);
      localStorage.setItem('lastSongIndex', currentSongIndex.toString());
    } else if (songs.length === 0) {
      setSongName("No songs loaded");
    }
  }, [currentSongIndex, songs]);

  useEffect(() => {
    const audioEl = currentAudioRef.current;
    if (!audioEl) return;
    const updateAudioData = () => {
      setCurrentTime(audioEl.currentTime);
      setDuration(audioEl.duration || 0);
    };
    audioEl.addEventListener('loadedmetadata', updateAudioData);
    audioEl.addEventListener('timeupdate', updateAudioData);
    if(audioEl.readyState >= audioEl.HAVE_METADATA) updateAudioData();
    return () => {
      audioEl.removeEventListener('loadedmetadata', updateAudioData);
      audioEl.removeEventListener('timeupdate', updateAudioData);
    };
  }, [currentSongIndex, songs]);

  useEffect(() => {
    // EQ Logic - ensure AudioContext is resumed by user gesture if needed
    const resumeAudioContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (e) { console.error('Failed to resume audio context:', e); }
      }
    };

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        resumeAudioContext(); // attempt resume if created fresh
      } catch (e) { console.error('Failed to create audio context:', e); return; }
    } else {
      resumeAudioContext(); // attempt resume if already exists
    }

    if (!isEqEnabled) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (analyserRef.current && sourceNodeRef.current && audioContextRef.current && sourceNodeRef.current.numberOfOutputs > 0) {
        try {
          sourceNodeRef.current.disconnect(analyserRef.current);
          analyserRef.current.disconnect(audioContextRef.current.destination);
          if(sourceNodeRef.current.mediaElement === currentAudioRef.current) {
             sourceNodeRef.current.connect(audioContextRef.current.destination);
          }
        } catch (e) { /* console.error('Error during EQ old disconnect:', e); */ }
      } else if (sourceNodeRef.current && sourceNodeRef.current.numberOfOutputs > 0 && sourceNodeRef.current.mediaElement === currentAudioRef.current) {
        // If analyser was never connected, but source was to destination
        try { sourceNodeRef.current.disconnect(audioContextRef.current.destination); } catch(e) {/*ignore*/}
        try { sourceNodeRef.current.connect(audioContextRef.current.destination); } catch(e) {/*ignore*/}
      }
      analyserRef.current = null;
      const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);}
      return;
    }
    if (!analyserRef.current && audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    if (currentAudioRef.current && audioContextRef.current && analyserRef.current) {
      try {
        if (!sourceNodeRef.current || sourceNodeRef.current.mediaElement !== currentAudioRef.current) {
            if(sourceNodeRef.current && sourceNodeRef.current.numberOfOutputs > 0) sourceNodeRef.current.disconnect();
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(currentAudioRef.current);
        } else {
             // Ensure source is disconnected before reconnecting to avoid multiple connections
            if(sourceNodeRef.current.numberOfOutputs > 0) sourceNodeRef.current.disconnect();
        }
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) { console.error('Failed to setup audio nodes for EQ:', e); return; }
    }
    const analyser = analyserRef.current; const canvas = canvasRef.current; if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return; const bufferLength = analyser.frequencyBinCount; const dataArray = new Uint8Array(bufferLength);
    const barWidth = canvas.width / bufferLength * 2.5; let x = 0;
    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      x = 0; analyser.getByteFrequencyData(dataArray); ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bufferLength; i++) { const barHeight = (dataArray[i] / 255) * canvas.height; const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0); gradient.addColorStop(0, '#3B82F6'); gradient.addColorStop(0.5, '#60A5FA'); gradient.addColorStop(1, '#93C5FD'); ctx.fillStyle = gradient; ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight); x += barWidth + 1; }
    }; renderFrame();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isEqEnabled, currentSongIndex, songs]);

  const handlePlayPauseLogic = () => {
    if (songs.length === 0) return;
    // Autoplay fix: first user click for AudioContext and play
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        setIsPlaying(prevIsPlaying => !prevIsPlaying);
      }).catch(e => console.error("AudioContext resume failed", e));
      return; // Resume will trigger play via useEffect
    }
    setIsPlaying(prevIsPlaying => !prevIsPlaying);
  };

  useEffect(() => {
    if (songs.length === 0 || !currentAudioRef.current) return;
    if (isPlaying) {
      currentAudioRef.current.play().catch(e => { console.error('Error playing audio:', e); setIsPlaying(false);});
    } else {
      currentAudioRef.current.pause();
    }
  }, [isPlaying, currentSongIndex, songs]); // currentSongIndex, songs ensure play() is called on song change if isPlaying true

  const handleAudioEnded = () => {
    if (!isCrossFading && songs.length > 1) {
      if (!isLoopEnabled && currentSongIndex === songs.length - 1) {
        setIsPlaying(false);
        return;
      }
      setCurrentSongIndex(nextSongIndex);
      setNextSongIndex((nextSongIndex + 1) % songs.length);
    }
  };

  const handleNext = () => {
    if (songs.length <= 1) return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
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
    setCurrentSongIndex(nextSongIndex);
    setNextSongIndex((nextSongIndex + 1) % songs.length);
    setIsCrossFading(false);
    if (currentAudioRef.current && isPlaying) {
      setTimeout(() => currentAudioRef.current?.play().catch(console.error), 50);
    }
  };

  const handlePrevious = () => {
    if (songs.length <= 1) return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
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
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
    setNextSongIndex(currentSongIndex); // This should be prevIndex + 1 or currentSongIndex if loop is on last song
    // Corrected nextSongIndex logic for previous
    setNextSongIndex(prevIndex === songs.length - 1 && !isLoopEnabled ? 0 : (prevIndex + 1) % songs.length);
    setIsCrossFading(false);
    if (currentAudioRef.current && isPlaying) {
      setTimeout(() => currentAudioRef.current?.play().catch(console.error), 50);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentAudioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * (currentAudioRef.current.duration || 0);
    currentAudioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleLoop = () => {
    const newValue = !isLoopEnabled;
    setIsLoopEnabled(newValue);
    localStorage.setItem('flowLoop', newValue.toString());
  };

  const toggleEqualizer = () => setIsEqEnabled(prev => !prev);

  const togglePlayInSession = () => {
    const newValue = !playInSession;
    setPlayInSession(newValue);
    localStorage.setItem('playInSession', newValue.toString());
  };

  // Crossfade logic (useEffect)
  useEffect(() => {
    if (!isPlaying || songs.length <= 1 || !currentAudioRef.current || !nextAudioRef.current || !isLoopEnabled) return;
    const currentAudio = currentAudioRef.current;
    const checkTime = () => {
      if (!currentAudio || isCrossFading) return;
      const fadeTime = 5;
      if (currentAudio.duration && currentAudio.currentTime > currentAudio.duration - fadeTime) {
        startCrossFade();
      }
    };
    const timeCheckInterval = setInterval(checkTime, 500);
    return () => clearInterval(timeCheckInterval);
  }, [isPlaying, songs, isCrossFading, isLoopEnabled, currentSongIndex]); // Added currentSongIndex to deps

  // startCrossFade function (ensure it is defined or imported)
  const startCrossFade = () => {
    if (!currentAudioRef.current || !nextAudioRef.current || songs.length <= 1) return;
    if (!isLoopEnabled && currentSongIndex === songs.length - 1 && nextSongIndex === 0) {
        // Don't crossfade if loop is off and it's the last song going to the first
        return;
    }
    setIsCrossFading(true);
    const currentAudio = currentAudioRef.current;
    const nextAudio = nextAudioRef.current;
    const fadeTime = 5;
    nextAudio.volume = 0;
    nextAudio.play().catch(console.error);
    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed <= fadeTime) {
        currentAudio.volume = Math.max(0, 1 - (elapsed / fadeTime));
        nextAudio.volume = Math.min(1, elapsed / fadeTime);
      } else {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.volume = 1;
        nextAudio.volume = 1;
        setCurrentSongIndex(nextSongIndex);
        setNextSongIndex((nextSongIndex + 1) % songs.length);
        setIsCrossFading(false);
        clearInterval(interval);
      }
    }, 50);
    fadeIntervalRef.current = interval;
  };
  
  // Session active changes
   useEffect(() => {
    if (playInSession) {
      if (!prevIsSessionActiveRef.current && isSessionActive) setIsPlaying(true);
      else if (prevIsSessionActiveRef.current && !isSessionActive) setIsPlaying(false);
    }
    prevIsSessionActiveRef.current = isSessionActive;
  }, [isSessionActive, playInSession]);

  // resume AudioContext after the very first user interaction
  useEffect(() => {
    const resume = () => {
      // Check if AudioContext exists on window and if its state is suspended
      if (window.AudioContext && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch((err) => {console.error("Failed to resume AudioContext on interaction:", err)});
      } else if (!audioContextRef.current && window.AudioContext) {
        // If no context exists yet, create one. It might start in a suspended state.
        // This scenario is less likely if EQ useEffect already creates it, but good for robustness.
        audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch((err) => {console.error("Failed to resume newly created AudioContext on interaction:", err)});
        }
      }
      // Clean up event listeners once resumed or attempted
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  
    // Check initial state. If already running, no need to add listeners.
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      // Already running, do nothing.
    } else {
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    }
  
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, []); // Empty dependency array, so it runs once on mount

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">🎵 Flow Booster</h2>
        <div className="flex items-center space-x-2">
          <button onClick={togglePlayInSession} className={`p-1 rounded text-xs ${playInSession ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`} title="Only play when session is active">⏱️</button>
          <button onClick={toggleLoop} className={`p-1 rounded text-xs ${isLoopEnabled ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`} title="Loop playlist">⟳</button>
          <button onClick={toggleEqualizer} className={`p-1 rounded text-xs ${isEqEnabled ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'} transition-colors`} title="Toggle Equalizer">EQ</button>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-center truncate text-gray-700 dark:text-gray-300 mb-1">
          {songs.length === 0 ? <p>No songs loaded</p> : songName}
        </div>
        {isEqEnabled && (<div className="my-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden"><canvas ref={canvasRef} className="w-full h-20" width={300} height={80} /></div>)}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{msToClock(currentTime * 1000)}</span>
          <span>{msToClock(duration * 1000)}</span>
        </div>
        <div ref={progressRef} className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 mb-3 cursor-pointer overflow-hidden" onClick={handleProgressClick}>
          <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button onClick={handlePrevious} className={`w-10 h-10 flex items-center justify-center rounded-full ${songs.length > 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} transition-colors`} aria-label="Previous song" disabled={songs.length <= 1}>⏮️</button>
        <button 
          onClick={handlePlayPauseLogic}
          className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer ${songs.length > 0 ? (isPlaying ? 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700') : 'bg-gray-400 text-white cursor-not-allowed'} transition-colors`}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={songs.length === 0}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button onClick={handleNext} className={`w-10 h-10 flex items-center justify-center rounded-full ${songs.length > 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} transition-colors`} aria-label="Next song" disabled={songs.length <= 1}>⏭️</button>
      </div>

      {songs.length > 0 && songs[currentSongIndex] && (
        <>
          <audio ref={currentAudioRef} src={songs[currentSongIndex].url} onEnded={handleAudioEnded}/>
          {songs.length > 1 && songs[nextSongIndex] && (<audio ref={nextAudioRef} src={songs[nextSongIndex].url} />)}
        </>
      )}
    </div>
  );
};

export { MusicPlayer }; 