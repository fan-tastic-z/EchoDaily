import { useState, useEffect } from 'react'
import { X, Wand2 } from 'lucide-react'
import { getAISettings, saveAISettings } from '../lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AISettingsDialog({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState({ provider: 'zhipu', model: 'glm-4-flash', apiKey: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const current = await getAISettings()
      if (current) {
        setSettings({ ...current, apiKey: '' }) // Don't load actual API key
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err)
    }
  }

  const handleSave = async () => {
    if (!settings.apiKey.trim()) {
      setError('API Key is required')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await saveAISettings({
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey.trim(),
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1000)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 paper-shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent-blue" />
            <h2 className="text-lg font-semibold text-stone-800">AI Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Provider</label>
            <select
              value={settings.provider}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
            >
              <option value="zhipu">Zhipu AI (智谱)</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">Currently only Zhipu AI is supported</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Model</label>
            <select
              value={settings.model}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
            >
              <option value="glm-4-flash">GLM-4 Flash</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">Cost-effective model for development</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="Enter your Zhipu AI API key"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading}
            />
            <p className="text-xs text-stone-500 mt-1">
              Get your API key from{' '}
              <a
                href="https://open.bigmodel.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                open.bigmodel.cn
              </a>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">Settings saved successfully!</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : success ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
