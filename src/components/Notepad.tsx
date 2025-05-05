import { useState, useEffect, useRef } from 'react';

export const Notepad = () => {
  const [note, setNote] = useState('');
  const saveTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Load saved note from localStorage
  useEffect(() => {
    const savedNote = localStorage.getItem('notepad');
    if (savedNote) {
      setNote(savedNote);
    }
  }, []);
  
  // Auto-adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [note]);
  
  // Handle note changes with auto-save
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 5 seconds of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem('notepad', newNote);
      console.log('Note auto-saved');
    }, 5000);
  };
  
  // Save on blur
  const handleBlur = () => {
    localStorage.setItem('notepad', note);
    console.log('Note saved on blur');
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt+Shift+T to insert timestamp
    if (e.altKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timestamp = `${hours}:${minutes}`;
      
      // Get cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        
        // Insert timestamp at cursor position
        const newValue = note.substring(0, startPos) + timestamp + note.substring(endPos);
        setNote(newValue);
        
        // Save immediately
        localStorage.setItem('notepad', newValue);
        
        // Set cursor position after the inserted timestamp
        setTimeout(() => {
          textarea.selectionStart = startPos + timestamp.length;
          textarea.selectionEnd = startPos + timestamp.length;
          textarea.focus();
        }, 0);
      }
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transform transition-all">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">📓 Notepad</h2>
      </div>
      
      {/* Notepad inspirational quote header */}
      <p className="italic opacity-50 text-center pb-2 text-sm text-gray-600 dark:text-gray-400">
        "Your mind is for having ideas, not holding them." – David Allen
      </p>
      
      {/* Notepad texture and styling */}
      <div className="bg-amber-50 dark:bg-gray-700 rounded shadow-inner p-4 bg-[url('/images/paper-texture.png')] bg-repeat overflow-visible max-h-[70vh] overflow-y-auto">
        <textarea
          value={note}
          onChange={handleNoteChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={textareaRef}
          placeholder="Jot down your thoughts here..."
          className="w-full bg-transparent resize-none outline-none text-gray-800 dark:text-gray-300 
            border-0 placeholder-gray-400 dark:placeholder-gray-500 p-0 leading-relaxed
            bg-[linear-gradient(transparent,transparent_calc(1.5rem-1px),rgba(0,0,0,0.06)_calc(1.5rem),transparent_calc(1.5rem+1px))]
            dark:bg-[linear-gradient(transparent,transparent_calc(1.5rem-1px),rgba(255,255,255,0.06)_calc(1.5rem),transparent_calc(1.5rem+1px))]
            bg-size-100%-1.5rem
            [background-position:0_1.5rem] text-base"
          style={{ 
            lineHeight: '1.5rem',
            backgroundAttachment: 'local' 
          }}
        />
      </div>
      
      {/* Shortcut hint */}
      <p className="text-[10px] italic opacity-50 pt-1 text-center text-gray-600 dark:text-gray-400">
        Alt + Shift + T inserts timestamp
      </p>
    </div>
  );
}; 