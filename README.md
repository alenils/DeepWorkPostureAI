# DeepWorkPostureAI

A browser-based posture and focus assistant that helps users maintain good posture and deep concentration during structured work sessions.

## Features

- Real-time posture tracking using MediaPipe
- Pomodoro-style focus sessions
- Session history and statistics
- Fully offline - runs in your browser
- Privacy-focused - no data leaves your device

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Run tests:
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Project Structure

```
src/
  components/     # Reusable UI components
  features/       # Feature-specific components and logic
    posture/     # Posture detection and feedback
    timer/       # Focus session timer
    history/     # Session history and stats
  hooks/         # Shared React hooks
  lib/           # Third-party integrations
  styles/        # Global styles and Tailwind config
docs/            # Documentation
test/            # Test suites
```

## Conventions

- Business logic lives in `features/*`
- Reusable hooks go in `/hooks`
- Never duplicate code; prefer imports
- All new code with complexity > "simple" must have Vitest unit tests

## License

MIT 