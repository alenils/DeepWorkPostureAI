# ✅ TASKS – DeepWorkPostureAI  (synkad med PRD v0.2)

## Must‑have Tasks
- [ ] **FocusSessionTimer**
      - AC 1  Default session length = 25 min om användaren inte ändrar.  
      - AC 2  Användaren kan ange valfritt heltal i minuter *eller* välja **∞**.  
      - AC 3  Timer måste vara igång för alla tracking‑moduler och nudges.
- [ ] **DistractionTapTracker**   <!-- NEW -->
      - AC 1  Flytande ✗‑knapp syns under hela sessionen.  
      - AC 2  `distractionCount` ökar med 1 och uppdateras i navbar ≤ 200 ms.  
      - AC 3  Värdet sparas i `ongoing`‑objektet var 5:e sekund (för reload‑säkerhet).
- [ ] **StreakHighlightLogic**   <!-- CHANGED -->
      - AC 1  När en session avslutas, färga raden grön *om*  
        `posture ≥ 80 %` (när posture‑modul på) **och** `distractionCount ≤ 5`.  
      - AC 2  Spela en 0.5 s flame‑bounce‑animation när raden blir grön.
- [ ] **SessionHistoryLog**
      - AC 1  Varje avslutad session lagras i LocalStorage med:  
        timestamp, duration, goal, posture %, `distractionCount`, aktiva moduler.
- [ ] **PersistOngoingTimer**   <!-- NEW -->
      - AC 1  Spara `remainingMs`, `startTimestamp`, `distractionCount`, `postureGoodMs` i `localStorage.ongoing` var 5 s.  
      - AC 2  Vid app‑start, om `ongoing` finns och tiden inte passerat ⇒ resume.
- [ ] **UXPolish & Gamification (Micro XP + Animations)**   <!-- NEW -->
      - AC 1  XP‑bar fylls 1 punkt per minut fokus; reset 00:00 lokal tid.  
      - AC 2  Flame‑icon visar hover‑tooltip “Streak 🔥 Day N”.
- [ ] **LocalOnlyDataLayer**
      - AC  Network‑tabben visar 0 nätverksanrop under full session.

## Should‑have Tasks
- [ ] **PostureCalibration**   <!-- MOVED (Was Must ➜ Should) -->
      - AC 1–2  (samma som tidigare)
- [ ] **PostureTrackingEngine**   <!-- MOVED -->
      - AC   ≥ 15 FPS offline m. MediaPipe WASM.
- [ ] **NudgeAlerts**   <!-- MOVED -->
      - AC 1–3  (oförändrade)
- [ ] **SensitivitySlider**   <!-- MOVED -->
      - AC 1–3  (oförändrade)
- [ ] **AccumulatedFocusCounter**
      - AC  Omräknas vid varje session‑slut; daily+weekly toggle.
- [ ] **SessionSummaryPanel**
      - AC  Visar posture %, duration, goal, ✗‑count; “Done” stänger panel.
- [ ] **DeepFocusGoalInput**
      - AC  Text sparas; fält töms vid nästa session.
- [ ] **PauseResumeControl**
      - AC 1  Pause stoppar webcam + timer ≤ 200 ms.  
      - AC 2  Resume återstartar exakt timestamp.
- [ ] **BumpScoreButton (+5 %)**
      - AC 1–2  (oförändrade)
      
- [ ] **Add Dark Mode toggle (Tailwind 'dark' class)**
  - AC 1: Add toggle button in navbar or footer
  - AC 2: Use Tailwind's 'dark:' variants for styling
  - AC 3: Persist dark/light preference in LocalStorage
  - AC 4: Have a cyberpunk theme as well with colours and backround suited for that.  


## Could‑have Tasks
- [ ] **MouthBreathingModule (toggle)**   <!-- NEW -->
      - AC 1  Aktiveras via modul‑chip; börjar analysera mun‑ROI.  
      - AC 2  Om mun öppen ≥ 6 s ⇒ `nose_breath.mp3` spelas och loggas.  
- [ ] **PWAInstallPrompt** (Workbox) – deferred tills efter MVP.
