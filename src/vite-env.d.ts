/// <reference types="vite/client" />

// Add declaration for importing .txt?raw files as strings
declare module '*.txt?raw' {
  const content: string
  export default content
} 