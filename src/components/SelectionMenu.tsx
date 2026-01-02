import { useState, useRef, useEffect } from 'react'
import { Wand2, Plus, Loader2, Languages, X } from 'lucide-react'
import { aiPolish } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

interface Props {
  isVisible: boolean
  position: { x: number; y: number }
  selectedText: string
  onReplace: (newText: string) => void
  onClose: () => void
}

export function SelectionMenu({ isVisible, position, selectedText, onReplace, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [targetLang, setTargetLang] = useState<'zh' | 'en'>('zh') // 默认翻译成中文
  const menuRef = useRef<HTMLDivElement>(null)

  // Detect if text contains Chinese to suggest default target language
  const hasChinese = selectedText && /[\u4e00-\u9fff]/.test(selectedText)

  // Auto-detect suggested target language when selected text changes
  useEffect(() => {
    if (selectedText) {
      setTargetLang(hasChinese ? 'en' : 'zh')
    }
  }, [selectedText, hasChinese])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible, onClose])

  const handleAIAction = async (opType: 'polish' | 'expand' | 'fix_grammar' | 'translate') => {
    if (!selectedText.trim()) return

    // For translate, handle differently
    if (opType === 'translate') {
      setIsLoading(true)
      setError(null)
      setTranslation(null)

      try {
        const { selectedDate } = useAppStore.getState()
        console.log('[SelectionMenu] Translate for:', selectedDate, 'target:', targetLang)

        // Use specific translation operation based on target language
        const opTypeForLang = targetLang === 'zh' ? 'translate_to_zh' : 'translate_to_en'
        const result = await aiPolish(selectedDate, selectedText, opTypeForLang)

        console.log('[SelectionMenu] Translation result:', result)
        setTranslation(result.result_text)
      } catch (err) {
        console.error('[SelectionMenu] Translation error:', err)
        const errorMsg = String(err)
        if (errorMsg.includes('API key not configured')) {
          setError('Click the wand icon (🪄) in the header to configure your API key')
        } else if (errorMsg.includes('does not exist') || errorMsg.includes('Entry not found')) {
          setError('Write some text and trigger a save first')
        } else {
          setError(errorMsg.length > 60 ? errorMsg.substring(0, 60) + '...' : errorMsg)
        }
      } finally {
        setIsLoading(false)
      }
      return
    }

    // For polish, expand, fix_grammar - replace the text
    setIsLoading(true)
    setError(null)

    try {
      const { selectedDate } = useAppStore.getState()
      console.log('[SelectionMenu] AI Action:', opType, 'for date:', selectedDate)
      console.log('[SelectionMenu] Selected text:', selectedText)

      const result = await aiPolish(selectedDate, selectedText)
      console.log('[SelectionMenu] AI result:', result)

      // Replace selected text with AI result
      onReplace(result.result_text)
      onClose()
    } catch (err) {
      console.error('[SelectionMenu] AI action error:', err)
      const errorMsg = String(err)
      if (errorMsg.includes('API key not configured')) {
        setError('Click the wand icon (🪄) in the header to configure your API key')
      } else if (errorMsg.includes('does not exist') || errorMsg.includes('Entry not found')) {
        setError('Write some text and trigger a save first (click away or wait)')
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        setError('Network error - check your connection')
      } else {
        setError(errorMsg.length > 60 ? errorMsg.substring(0, 60) + '...' : errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-stone-200 py-1 flex gap-1 px-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 50}px`, // Position above the selection
        transform: 'translateX(-50%)',
      }}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-stone-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </div>
      ) : error ? (
        <div className="px-3 py-2 text-sm text-red-600 max-w-[200px] whitespace-normal">
          {error}
        </div>
      ) : translation ? (
        <div className="px-4 py-3 max-w-sm">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-xs font-medium text-stone-500 uppercase">Translation</span>
            <button
              onClick={() => {
                setTranslation(null)
                onClose()
              }}
              className="p-0.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200">
            <span className="text-xs text-stone-500">Translate to:</span>
            <div className="flex items-center bg-stone-100 rounded-md p-0.5">
              <button
                onClick={() => {
                  setTargetLang('zh')
                  setTranslation(null)
                  handleAIAction('translate')
                }}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  targetLang === 'zh'
                    ? 'bg-white text-accent-blue shadow-sm font-medium'
                    : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => {
                  setTargetLang('en')
                  setTranslation(null)
                  handleAIAction('translate')
                }}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  targetLang === 'en'
                    ? 'bg-white text-accent-blue shadow-sm font-medium'
                    : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-stone-200">
            <p className="text-xs text-stone-500 mb-1">Original:</p>
            <p className="text-sm text-stone-700 font-medium">{selectedText}</p>
          </div>

          <div className="mb-3">
            <p className="text-xs text-stone-500 mb-1">
              Translation ({targetLang === 'zh' ? '中文' : 'English'}):
            </p>
            <p className="text-base font-semibold text-accent-blue bg-accent-blue/5 rounded px-3 py-2">
              {translation}
            </p>
          </div>

          <button
            onClick={() => {
              onReplace(translation)
              setTranslation(null)
              onClose()
            }}
            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-md transition-colors"
          >
            Replace with Translation
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => handleAIAction('polish')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-accent-blue/10 rounded-md transition-colors"
            title="Improve clarity and flow"
          >
            <Wand2 className="w-4 h-4 text-accent-blue" />
            <span>Polish</span>
          </button>
          <button
            onClick={() => handleAIAction('expand')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-accent-blue/10 rounded-md transition-colors"
            title="Add more details"
          >
            <Plus className="w-4 h-4 text-accent-blue" />
            <span>Expand</span>
          </button>
          <button
            onClick={() => handleAIAction('translate')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-accent-blue/10 rounded-md transition-colors"
            title="Translate to Chinese/English"
          >
            <Languages className="w-4 h-4 text-accent-blue" />
            <span>Translate</span>
          </button>
        </>
      )}
    </div>
  )
}
