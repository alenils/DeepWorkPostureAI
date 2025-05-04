# 🧾 DeepWorkPostureAI – Product Requirements Document (PRD)
**Version:** MVP 0.2   <!-- CHANGED -->
**Prepared by:** [Your Name]  
**Last updated:** 2025‑05‑02   <!-- CHANGED -->

## 🎯 Goal

**Summary**  
Build a **browser‑based deep‑work companion** that people return to daily.  
Core value = **powerful focus timer + light gamification**, with optional **posture** and **mouth‑breathing** tracking modules they can toggle per session.  
Runs 100 % offline, zero install, privacy‑first.

**MoSCoW‑prioritised outcomes**

| Priority | Outcome |
|----------|---------|
| **Must‑have** | 1️⃣ Support distraction‑free focus sessions with a Pomodoro/infinite timer.<br>2️⃣ Let users log distractions via quick ✗‑taps and lose streak if ✗ > 5.<br>3️⃣ Provide clear, friendly UI and micro‑gamification (streak flame, daily XP bar). |
| **Should‑have** | 4️⃣ Keep users mindful of posture via optional real‑time tracking + nudges.<br>5️⃣ Show cumulative focus time per day/week so users can meet self‑set targets. |
| **Could‑have** | 6️⃣ Detect mouth‑breathing (open mouth ≥ 6 s) and nudge user to nasal breathing. |

**Non‑functional Must‑haves**  
• Runs 100 % offline • Initial JS ≤ 150 kB (gzip) • Lighthouse Perf ≥ 90 • Lighthouse A11y ≥ 90

---

## 🧩 Core Features (MVP v0.1)

| Feature | Description |
|---------|-------------|
| **Focus Session Timer** | Default 25 min, custom minute value **or “∞” open‑ended**. Timer must run for any tracking modules to activate. |
| **DeepFocus Goal Input** | Short goal typed before session; stored in log. |
| **Distraction Tap Tracker** <!-- NEW --> | Floating ✗‑button increments `distractionCount`. Live counter visible in navbar. |
| **Streak Logic** <!-- CHANGED --> | A session earns a green “🔥 Streak” row **if** posture ≥ 80 % (when posture module on) **and** `distractionCount` ≤ 5. |
| **Posture Module (toggle)** | *When enabled*: Calibration → real‑time tracking (MediaPipe/WASM) → nudges after 10 s slouch ≥ currentSensitivity %. |
| **Mouth‑Breathing Module (toggle)** <!-- NEW --> | *When enabled*: Webcam ROI monitors mouth; open ≥ 6 s → gentle nose‑breath sound. |
| **Sensitivity Control** | Choose 5 / 10 / 15 / 20 % (default 15 %). |
| **Nudge Alerts** | Visual blink and/or soft sound. |
| **Pause / Resume Session** | Instantly stops webcam + timer; resumes intact. |
| **Session Summary** | Shows duration, posture %, goal, ✗‑count. |
| **Session History Log** | Scrollable log: timestamp, goal, posture %, duration, ✗‑count, active modules. |
| **Accumulated Focus Time** | Daily + weekly toggle. |
| **Local‑Only Processing** | No network calls. |

---

## 🖥️ Minimal UI & UX Requirements  <!-- NEW -->

* Friendly, uncluttered layout (Tailwind; light/dark).  
* Big timer ring; green/amber/red border reflects posture state.  
* ✗‑button always reachable (mobile‑thumb zone even på desktop).  
* Gamification:  
  * Animated flame icon next to streak rows.  
  * Daily XP bar fills 1 pt/min; resets at midnight.  
* All interactions keyboard‑accessible; WCAG AA contrast.  

---

## 🚫 Out of Scope (MVP v0.1)

*unchanged (login, mobile, team etc.)*

---

## 📊 Success Criteria (Given / When / Then)  <!-- only NEW/CHANGED rows -->

### 2. Focus Session Timer
*unchanged*

### 3. Distraction Tap Tracker  <!-- NEW -->
**Given** a session is running  
**When** the user clicks ✗  
**Then** `distractionCount` increments by 1 *and* is visible within 200 ms.

### 4. Streak Logic  <!-- CHANGED -->
**Given** a session ends  
**When** (`distractionCount` ≤ 5) **AND** (posture ≥ 80 % *if* posture module was on)  
**Then** the row is tinted green and the flame icon plays a 0.5 s bounce animation.

### 5. Posture Module  <!-- renumbered -->
*old SC for calibration/tracking/nudges remain — unchanged text*

### 6. Mouth‑Breathing Nudge  <!-- NEW -->
**Given** mouth‑module enabled  
**When** mouth open (IOU ratio ≥ 0.5) persists ≥ 6 s  
**Then** play `nose_breath.mp3` once and log `mouthNudge` = true.

*(renumber remaining Non‑functional metrics → now #9)*

---

## 🛠️ Tech Stack

| Component | Choice | Note |
|-----------|--------|------|
| Frontend | React + Vite | |
| Styling | Tailwind CSS | |
| State | React (useState/useEffect) | |
| Posture AI | MediaPipe Pose (WASM) | |
| Mouth AI <!-- NEW --> | TensorFlow.js Face‑Mesh | Lightweight ROI only |
| Storage | LocalStorage | |
| Audio | Web Audio API + embedded MP3 | |
| Versioning | Git + GitHub | |
| Testing | Vitest + Playwright | |

---

## 🔗 Technical References

This project will use open-source posture tracking logic adapted from:

- [killa-kyle/posture-posture-posture (Chrome Extension)](https://github.com/killa-kyle/posture-posture-posture-chrome-extension)

The FaceMesh + rotation-tracking approach aligns well with our in-browser, privacy-first MVP and may be used as the foundation for PostureTrackingEngine.


---

## 🔮 Future Expansion Considerations
*(unchanged – still lists backend, streak trends, team features, gamification tiers)*

🧠 *Important: MVP must run 100 % offline. No backend logic should be implemented at this stage.*
