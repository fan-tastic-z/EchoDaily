import { useEffect } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { SaveIndicator } from './components/SaveIndicator'
import { initDb } from './lib/api'
import './App.css'

function App() {
  // Initialize the database
  useEffect(() => {
    initDb().catch(console.error)
  }, [])

  return (
    <div className="h-screen flex flex-col paper-texture bg-paper-bg">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <div className="h-8 border-b border-border/20 bg-paper-bg/50 px-6 flex items-center justify-end">
            <SaveIndicator />
          </div>
          <Editor />
        </div>
      </div>
    </div>
  )
}

export default App
