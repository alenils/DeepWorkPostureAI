// Import the raw text content using Vite's ?raw suffix
// Make sure the path is correct relative to this utils file
import quoteText from '../data/motivational_quotes.txt.txt?raw';

// Process the raw text into an array of quotes
const quotes: string[] = quoteText
  .split(/\r?\n/) // Split by newline, handling Windows/Unix endings
  .map((line: string) => line.trim()) // Explicitly type 'line'
  .filter((line: string) => line.length > 0); // Explicitly type 'line' and filter empty

/**
 * Selects a random quote from the loaded motivational quotes.
 * Returns a fallback quote if no quotes were loaded.
 */
export const getRandomQuote = (): string => {
  if (!quotes || quotes.length === 0) {
    console.warn('No motivational quotes loaded or file is empty.');
    return "Keep pushing forward!"; // Fallback quote
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}; 