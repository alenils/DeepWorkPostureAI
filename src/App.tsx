import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="py-6 bg-white shadow">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            DeepWorkPostureAI
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <p>Welcome to DeepWorkPostureAI</p>
      </main>
    </div>
  )
}

export default App 