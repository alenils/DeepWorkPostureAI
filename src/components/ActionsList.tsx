import { useState, useEffect } from 'react';
import { useSound } from '../features/audio/useSound';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export const ActionsList = () => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const playCheckSound = useSound('check.mp3');
  
  // Load items from localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('todo');
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems);
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems);
        }
      } catch (error) {
        console.error('Failed to parse todo items:', error);
      }
    }
  }, []);
  
  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('todo', JSON.stringify(items));
  }, [items]);
  
  // Generate a simple ID for new items
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  // Add a new item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim() === '') return;
    
    const newItem: TodoItem = {
      id: generateId(),
      text: newItemText.trim(),
      done: false
    };
    
    setItems(prev => [newItem, ...prev]);
    setNewItemText('');
  };
  
  // Toggle item completion
  const handleToggleItem = (id: string) => {
    setItems(prev => 
      prev.map(item => {
        if (item.id === id) {
          const newDone = !item.done;
          if (newDone) {
            playCheckSound();
          }
          return { ...item, done: newDone };
        }
        return item;
      })
    );
  };
  
  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">✅ Today's Actions</h2>
      
      {/* Add new item form */}
      <form onSubmit={handleAddItem} className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow min-w-0 max-w-[calc(100%-96px)] p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 
            dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <button 
          type="submit"
          className="w-16 bg-blue-500 text-white p-2 rounded-r font-medium hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Add
        </button>
      </form>
      
      {/* Items list */}
      <div className="space-y-2 overflow-visible max-h-[70vh] overflow-y-auto pr-2">
        {items.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-2">
            No tasks yet. Add one above!
          </p>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              className={`p-3 rounded flex items-center justify-between group transition-colors duration-200 ${
                item.done 
                  ? 'bg-green-100 dark:bg-green-900/30 line-through' 
                  : 'bg-gray-100 dark:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggleItem(item.id)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 transition-colors
                    focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                />
                <span className={`text-gray-800 dark:text-gray-200 ${item.done ? 'text-gray-500 dark:text-gray-400' : ''}`}>
                  {item.text}
                </span>
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 