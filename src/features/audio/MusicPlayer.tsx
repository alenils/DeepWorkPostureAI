import { useState, useEffect, useRef } from 'react';
import { msToClock } from '../../utils/time';
import { useAudio, AlbumId } from './AudioProvider'; // Import useAudio

interface MusicPlayerProps {
  isSessionActive?: boolean; // This prop might still be useful for UI elements specific to session state
}

// loadFocusTracks function is removed as tracks are now loaded in AudioProvider

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ isSessionActive = false }) => {
  const {
    songs, // Will come from context, filtered by selectedAlbum and shuffle state
    currentTrack,
    isPlaying,
    playPause,
    nextTrack,
    prevTrack,
    selectAlbum,
    selectedAlbum,
    toggleShuffle,
    isShuffleActive,
    audioElementRef, // Use the ref from context
  } = useAudio();

  // Refs for UI elements specific to MusicPlayer
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local state for EQ (if not moved to context), and other UI concerns
  const [isEqEnabled, setIsEqEnabled] = useState(false); 
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // playInSession and loop controls could also be part of AudioProvider or remain local if purely UI preference
  const [isLoopEnabled, setIsLoopEnabled] = useState(false); // Default loop to false for auto-advance
  const [playInSessionOnly, setPlayInSessionOnly] = useState(false);
  const prevIsSessionActiveRef = useRef(isSessionActive);

  // EQ and visualizer refs (if EQ is handled here)
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // This might be redundant if provider handles it all
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Update current time and duration from audio element
  useEffect(() => {
    const audioEl = audioElementRef.current;
    if (!audioEl) return;

    const updateAudioData = () => {
      setCurrentTime(audioEl.currentTime);
      setDuration(audioEl.duration || 0);
    };

    audioEl.addEventListener('loadedmetadata', updateAudioData);
    audioEl.addEventListener('timeupdate', updateAudioData);
    audioEl.addEventListener('ended', nextTrack); // Auto-play next track

    if(audioEl.readyState >= audioEl.HAVE_METADATA) updateAudioData();

    return () => {
      audioEl.removeEventListener('loadedmetadata', updateAudioData);
      audioEl.removeEventListener('timeupdate', updateAudioData);
      audioEl.removeEventListener('ended', nextTrack);
    };
  }, [audioElementRef, nextTrack]); // currentTrack is implicitly handled by audioElementRef.current.src change

   // EQ Logic (simplified, assuming AudioContext is managed by provider or resumed globally)
  useEffect(() => {
    const audioEl = audioElementRef.current;
    if (!isEqEnabled || !audioEl) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      // Basic cleanup if EQ is disabled
      const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);}
      // More complex disconnection logic for audio nodes might be needed if they were connected
      return;
    }

    // Ensure AudioContext is available (it should be by now via provider's resume logic)
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) { console.error('MusicPlayer: Failed to create audio context for EQ:', e); return; }
    }
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    if (!sourceNodeRef.current || sourceNodeRef.current.mediaElement !== audioEl) {
        try {
            if(sourceNodeRef.current && sourceNodeRef.current.numberOfOutputs > 0) sourceNodeRef.current.disconnect();
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioEl);
        } catch (e) { console.error('MusicPlayer: Failed to create media element source for EQ:', e); return; }
    }

    try {
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
    } catch (e) { console.error('MusicPlayer: Failed to connect audio nodes for EQ:', e); return; }
    
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
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0); 
        gradient.addColorStop(0, '#3B82F6'); 
        gradient.addColorStop(0.5, '#60A5FA'); 
        gradient.addColorStop(1, '#93C5FD'); 
        ctx.fillStyle = gradient; 
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight); 
        x += barWidth + 1; 
      }
    }; 
    renderFrame();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceNodeRef.current && analyserRef.current && audioContextRef.current && sourceNodeRef.current.numberOfOutputs > 0) {
        try {
          sourceNodeRef.current.disconnect(analyserRef.current);
          analyserRef.current.disconnect(audioContextRef.current.destination);
           // Reconnect source to destination if it was previously connected
          if (audioEl === sourceNodeRef.current.mediaElement) { 
            sourceNodeRef.current.connect(audioContextRef.current.destination);
          }
        } catch (e) { console.warn('MusicPlayer: Error disconnecting EQ nodes:', e); }
      }
    };
  }, [isEqEnabled, audioElementRef, currentTrack]); // Re-run if EQ enabled/disabled or track changes

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audioEl = audioElementRef.current;
    if (!audioEl || !progressRef.current || !currentTrack) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * (audioEl.duration || 0);
    audioEl.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleEqLocal = () => setIsEqEnabled(prev => !prev);
  const toggleLoopLocal = () => {
      setIsLoopEnabled(prev => !prev); 
      // If AudioProvider handles loop, this would call a context function
      if(audioElementRef.current) audioElementRef.current.loop = !isLoopEnabled;
  };
  const togglePlayInSessionLocal = () => setPlayInSessionOnly(prev => !prev);

  // Handle playInSessionOnly logic
  useEffect(() => {
    if (playInSessionOnly) {
      if (!prevIsSessionActiveRef.current && isSessionActive && currentTrack) {
        if(!isPlaying) playPause();
      } else if (prevIsSessionActiveRef.current && !isSessionActive && currentTrack) {
        if(isPlaying) playPause();
      }
    }
    prevIsSessionActiveRef.current = isSessionActive;
  }, [isSessionActive, playInSessionOnly, playPause, isPlaying, currentTrack]);
  
  // UI event handlers
  const handleAlbumChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    selectAlbum(event.target.value as AlbumId);
  };

  if (!currentTrack && songs.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading audio albums...</p>
        </div>
      )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6">
      <audio ref={audioElementRef} loop={isLoopEnabled} />
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
            <button onClick={toggleShuffle} className={`p-1.5 rounded text-xl ${isShuffleActive ? 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`} title={isShuffleActive ? "Disable Shuffle" : "Enable Shuffle"}>🔀</button>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mx-2">🎵 Flow Booster</h2>
        <div className="flex items-center space-x-2">
          <button onClick={togglePlayInSessionLocal} className={`p-1 rounded text-xs ${playInSessionOnly ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`} title="Only play when session is active">⏱️</button>
          <button onClick={toggleLoopLocal} className={`p-1 rounded text-xs ${isLoopEnabled ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`} title={isLoopEnabled ? "Disable Loop" : "Enable Loop"}>⟳</button>
          <button onClick={toggleEqLocal} className={`p-1 rounded text-xs ${isEqEnabled ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'} transition-colors`} title="Toggle Equalizer">EQ</button>
        </div>
      </div>

      <div className="mb-1">
        <select onChange={handleAlbumChange} value={selectedAlbum} className="w-full p-2 mb-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500">
            <option value="album1">Album 1</option>
            <option value="album2">Album 2</option>
        </select>
      </div>

      <div className="mb-2">
        <div className="text-center truncate text-gray-700 dark:text-gray-300 mb-1 min-h-[1.5em]">
          {currentTrack ? currentTrack.name : (songs.length > 0 ? "Select a track" : "No songs in album")}
        </div>
        {isEqEnabled && (<div className="my-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden"><canvas ref={canvasRef} className="w-full h-20" width={300} height={80} /></div>)}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{msToClock(currentTime * 1000)}</span>
          <span>{msToClock(duration * 1000)}</span>
        </div>
        <div ref={progressRef} className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 mb-3 cursor-pointer overflow-hidden" onClick={handleProgressClick}>
          <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-100" style={{ width: `${(duration > 0 ? currentTime / duration : 0) * 100}%` }} />
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button onClick={prevTrack} className={`w-10 h-10 flex items-center justify-center rounded-full ${songs.length > 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} transition-colors`} aria-label="Previous song" disabled={songs.length <= 1 || !currentTrack}>⏮️</button>
        <button 
          onClick={playPause}
          className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer ${currentTrack ? (isPlaying ? 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700') : 'bg-gray-400 text-white cursor-not-allowed'} transition-colors`}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={!currentTrack}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button onClick={nextTrack} className={`w-10 h-10 flex items-center justify-center rounded-full ${songs.length > 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'} transition-colors`} aria-label="Next song" disabled={songs.length <= 1 || !currentTrack}>⏭️</button>
      </div>
    </div>
  );
};

// Removed export { MusicPlayer }; as it's default export or named as per file. Re-export if needed from an index.ts 