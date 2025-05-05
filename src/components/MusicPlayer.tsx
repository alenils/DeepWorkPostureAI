import { useState, useEffect, useRef } from 'react';

const SONGS = [
  '/sounds/Song1.mp3',
  '/sounds/song2.mp3'
];

export const MusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songName, setSongName] = useState('');
  
  // Load last played song index from localStorage
  useEffect(() => {
    const savedIndex = localStorage.getItem('lastSongIndex');
    if (savedIndex !== null) {
      setCurrentSongIndex(parseInt(savedIndex, 10));
    }
  }, []);

  // Extract song name from path
  useEffect(() => {
    const path = SONGS[currentSongIndex];
    const fileName = path.split('/').pop() || '';
    const name = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    setSongName(name);
    
    // Save current index to localStorage
    localStorage.setItem('lastSongIndex', currentSongIndex.toString());
  }, [currentSongIndex]);

  // Control play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentSongIndex((prev) => (prev + 1) % SONGS.length);
    if (isPlaying && audioRef.current) {
      // This will trigger the useEffect to play the new song
      audioRef.current.currentTime = 0;
    }
  };

  const handlePrevious = () => {
    setCurrentSongIndex((prev) => (prev === 0 ? SONGS.length - 1 : prev - 1));
    if (isPlaying && audioRef.current) {
      // This will trigger the useEffect to play the new song
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">🎵 Music</h2>

      {/* Song Name */}
      <div className="text-center mb-3 truncate text-gray-700 dark:text-gray-300">
        {songName}
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button 
          onClick={handlePrevious}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Previous song"
        >
          ⏮️
        </button>
        <button 
          onClick={handlePlayPause}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button 
          onClick={handleNext}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Next song"
        >
          ⏭️
        </button>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={SONGS[currentSongIndex]}
        onEnded={handleNext}
        preload="auto"
      />
    </div>
  );
}; 