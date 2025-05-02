# 🧱 stack.md – Tech Stack Rules

## Frameworks & Tools
- Frontend: React + Vite
- Styling: Tailwind CSS only (no custom CSS unless explicitly stated)
- State Management: React hooks (useState, useEffect)
- Posture Detection: MediaPipe Pose (WebAssembly)
- Audio: Web Audio API (local .mp3 only)
- Storage: LocalStorage (browser only, no cloud or sync)
- Version Control: Git + GitHub

## Environment
- No backend or API endpoints allowed in MVP
- Never introduce `.server.js`, `.api.js` or similar files
- Do not install new npm packages without explicit instruction
