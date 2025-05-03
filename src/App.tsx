import { useState } from 'react'
import { FocusSessionTimer } from './components/FocusSessionTimer'
import { DeepFocusInput } from './components/DeepFocusInput'
import { SessionSummaryPanel } from './components/SessionSummaryPanel'
import { SessionHistory } from './components/SessionHistory'
import { DistractionButton } from './components/DistractionButton'

interface SessionData {
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
}

function App() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentGoal, setCurrentGoal] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const [showSummary, setShowSummary] = useState(false)
  const [lastSession, setLastSession] = useState<SessionData | null>(null)
  const [distractionCount, setDistractionCount] = useState(0)
  const [timerMinutes, setTimerMinutes] = useState<string>('25')

  const handleTimerStart = () => {
    setIsSessionActive(true)
    setSessionStartTime(Date.now())
    setDistractionCount(0)
  }

  const handleTimerEnd = () => {
    setIsSessionActive(false)
    
    // Create session data
    const sessionData: SessionData = {
      timestamp: sessionStartTime,
      duration: Date.now() - sessionStartTime,
      goal: currentGoal,
      distractions: distractionCount,
      posture: Math.round(Math.random() * 30 + 70) // Mock posture data for now
    }
    
    // Store in localStorage
    const existingSessions = JSON.parse(localStorage.getItem('sessions') || '[]')
    localStorage.setItem('sessions', JSON.stringify([...existingSessions, sessionData]))
    
    // Show summary
    setLastSession(sessionData)
    setShowSummary(true)
    
    // Reset states
    setCurrentGoal('')
    setDistractionCount(0)
  }

  const handleTimerTick = (remainingMs: number) => {
    // Will be used later for tracking modules
    console.log('Timer tick:', remainingMs)
  }

  const handleGoalSet = (goal: string) => {
    setCurrentGoal(goal)
  }

  const handleDistraction = () => {
    setDistractionCount(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-center mb-6">DeepWorkPostureAI</h1>
          
          {/* Focus Input and Timer Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <DeepFocusInput 
                isSessionActive={isSessionActive}
                onGoalSet={handleGoalSet}
                onStartSession={handleTimerStart}
              />
            </div>
            <div className="md:col-span-1">
              <FocusSessionTimer
                onTimerStart={handleTimerStart}
                onTimerEnd={handleTimerEnd}
                onTimerTick={handleTimerTick}
                isCompact={true}
              />
            </div>
          </div>

          {/* Session Progress Section */}
          {isSessionActive && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-center text-blue-800 font-medium">
                Current Goal: {currentGoal || 'YOLO-MODE'}
              </div>
              <div className="text-center text-blue-600 text-sm mt-1">
                Distractions: {distractionCount}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Session History</h2>
          <SessionHistory />
        </div>

        <SessionSummaryPanel 
          isVisible={showSummary}
          onClose={() => setShowSummary(false)}
          sessionData={lastSession}
        />

        <DistractionButton 
          isVisible={isSessionActive}
          onDistraction={handleDistraction}
        />
      </div>
    </div>
  )
}

export default App 