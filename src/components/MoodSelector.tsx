import { useState, useEffect } from 'react'
import { MOOD_OPTIONS, type MoodType } from '../types'
import { upsertEntryMood } from '../lib/api'
import { Sparkles, X } from 'lucide-react'

// Warm color palette for each mood
const MOOD_COLORS = {
  amazing: { bg: '#fef3c7', border: '#fbbf24', glow: 'rgba(251, 191, 36, 0.3)' }, // Golden warm
  happy: { bg: '#dbeafe', border: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' }, // Sky blue
  neutral: { bg: '#f3f4f6', border: '#9ca3af', glow: 'rgba(156, 163, 175, 0.2)' }, // Soft gray
  sad: { bg: '#e0e7ff', border: '#818cf8', glow: 'rgba(129, 140, 248, 0.3)' }, // Muted indigo
  awful: { bg: '#fee2e2', border: '#f87171', glow: 'rgba(248, 113, 113, 0.3)' }, // Soft red
}

interface Props {
  entryDate: string
  currentMood?: MoodType
  onMoodChange?: (mood: MoodType | undefined) => void
  compact?: boolean
}

export function MoodSelector({ entryDate, currentMood, onMoodChange, compact = false }: Props) {
  const [selectedMood, setSelectedMood] = useState<MoodType | undefined>(currentMood)
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setSelectedMood(currentMood)
  }, [currentMood])

  const handleMoodSelect = async (moodType: MoodType) => {
    // Toggle off if clicking the same mood
    const newMood = selectedMood === moodType ? undefined : moodType
    const moodOption = MOOD_OPTIONS.find((m) => m.type === newMood)

    setSelectedMood(newMood)

    // Save to database
    setIsSaving(true)
    try {
      await upsertEntryMood(entryDate, newMood, moodOption?.emoji)
      onMoodChange?.(newMood)
      setIsExpanded(false)
    } catch (err) {
      console.error('Failed to save mood:', err)
      setSelectedMood(currentMood)
    } finally {
      setIsSaving(false)
    }
  }

  if (compact) {
    // Compact mode for Sidebar - elegant mood badge
    const currentMoodOption = MOOD_OPTIONS.find((m) => m.type === selectedMood)
    const colors = selectedMood ? MOOD_COLORS[selectedMood] : null

    return (
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${
          selectedMood ? 'shadow-sm' : 'hover:bg-white/30'
        }`}
        style={
          selectedMood
            ? {
                backgroundColor: colors?.bg,
                border: `1.5px solid ${colors?.border}`,
              }
            : {}
        }
        title={currentMoodOption?.label || 'Set mood'}
      >
        <span className="text-sm">{currentMoodOption?.emoji || '✨'}</span>
      </div>
    )
  }

  // Full mode - elegant expandable mood card
  const currentMoodOption = MOOD_OPTIONS.find((m) => m.type === selectedMood)
  const colors = selectedMood ? MOOD_COLORS[selectedMood] : null

  return (
    <div className="relative">
      {/* Compact trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full
          transition-all duration-300 ease-out
          ${isExpanded ? 'ring-2 ring-accent-blue/30' : 'hover:scale-105'}
          ${isSaving ? 'opacity-60' : ''}
        `}
        style={
          selectedMood && !isExpanded
            ? {
                backgroundColor: colors?.bg,
                border: `1px solid ${colors?.border}`,
              }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
              }
        }
      >
        {selectedMood ? (
          <>
            <span className="text-lg">{currentMoodOption?.emoji}</span>
            <span className="text-sm font-medium" style={{ color: colors?.border }}>
              {currentMoodOption?.label}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-500">How are you?</span>
          </>
        )}
      </button>

      {/* Expandable mood picker */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsExpanded(false)} />

          {/* Mood picker card */}
          <div className="absolute top-full left-0 mt-2 z-50 animate-fade-in">
            <div
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-3 border border-stone-100"
              style={{
                boxShadow: selectedMood
                  ? `0 8px 32px ${colors?.glow}`
                  : '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <div className="flex items-center gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const moodColors = MOOD_COLORS[mood.type]
                  const isSelected = selectedMood === mood.type

                  return (
                    <button
                      key={mood.type}
                      onClick={() => handleMoodSelect(mood.type)}
                      disabled={isSaving}
                      className={`
                        group relative flex flex-col items-center gap-1
                        min-w-[64px] p-3 rounded-xl
                        transition-all duration-300 ease-out
                        ${isSelected ? 'scale-105' : 'hover:scale-105'}
                        disabled:opacity-50 disabled:hover:scale-100
                      `}
                      style={{
                        backgroundColor: isSelected ? moodColors.bg : 'transparent',
                        border: isSelected
                          ? `2px solid ${moodColors.border}`
                          : '2px solid transparent',
                        boxShadow: isSelected ? `0 4px 16px ${moodColors.glow}` : 'none',
                      }}
                    >
                      <span className="text-3xl transition-transform group-hover:scale-110">
                        {mood.emoji}
                      </span>
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: isSelected ? moodColors.border : '#6b7280' }}
                      >
                        {mood.label}
                      </span>

                      {/* Selection indicator */}
                      {isSelected && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                          style={{ backgroundColor: moodColors.border }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Clear button */}
                {selectedMood && <div className="w-px h-12 bg-stone-200 mx-1" />}
                {selectedMood && (
                  <button
                    onClick={() => handleMoodSelect(selectedMood)}
                    disabled={isSaving}
                    className="
                      flex flex-col items-center justify-center
                      min-w-[64px] p-3 rounded-xl
                      bg-stone-100 hover:bg-stone-200
                      transition-all duration-300
                      disabled:opacity-50
                    "
                  >
                    <X className="w-5 h-5 text-stone-500" />
                    <span className="text-xs text-stone-500 mt-0.5">Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
