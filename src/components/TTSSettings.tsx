import { useState, useEffect } from 'react'
import { X, Volume2 } from 'lucide-react'
import { getTTSSettings, saveTTSSettings, listTTSVoices, listTTSProviders } from '../lib/api'
import type { TTSSettings, TTSVoice } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const PROVIDER_INFO = {
  qwen: {
    name: 'Alibaba Cloud Qwen (通义千问)',
    model: 'qwen3-tts-flash',
    description: 'Supports Chinese, English, Japanese, Korean, and more',
    apiPlaceholder: 'Enter your Alibaba Cloud DashScope API key',
    apiLink: 'https://dashscope.console.aliyun.com/apiKey',
    pricing: '¥0.8/10k characters. Free tier: 10k characters for new users.',
    speedSupported: false,
  },
  murf: {
    name: 'Murf.ai',
    model: 'GEN2',
    description: '130+ AI voices across 20+ languages with expressive styles',
    apiPlaceholder: 'Enter your Murf.ai API key',
    apiLink: 'https://murf.ai/api',
    pricing: 'Character-based billing. Check Murf.ai for detailed pricing.',
    speedSupported: true,
  },
}

export function TTSSettingsDialog({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<TTSSettings>({
    provider: 'qwen',
    model: 'qwen3-tts-flash',
    apiKey: '',
    voice: 'cherry',
    speed: 1.0,
  })
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProviders()
      loadSettings()
    }
  }, [isOpen])

  // Load voices when provider changes
  useEffect(() => {
    if (isOpen && settings.provider) {
      loadVoices()
    }
  }, [settings.provider, isOpen])

  const loadProviders = async () => {
    try {
      const providers = await listTTSProviders()
      setAvailableProviders(providers)
    } catch (err) {
      console.error('Failed to load TTS providers:', err)
      setAvailableProviders(['qwen', 'murf'])
    }
  }

  const loadSettings = async () => {
    try {
      const current = await getTTSSettings(settings.provider)
      if (current) {
        setSettings({
          ...current,
          apiKey: '',
          voice: current.voice || 'cherry',
          speed: current.speed ?? 1.0,
        })
      }
    } catch (err) {
      console.error('Failed to load TTS settings:', err)
    }
  }

  const loadVoices = async () => {
    try {
      const availableVoices = await listTTSVoices(settings.provider)
      setVoices(availableVoices)

      // Set default voice if current voice is empty or not available
      if (availableVoices.length > 0) {
        const currentVoiceValid = availableVoices.some((v) => v.id === settings.voice)
        if (!settings.voice || !currentVoiceValid) {
          setSettings((prev) => ({
            ...prev,
            voice: availableVoices[0].id,
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load TTS voices:', err)
    }
  }

  const handleProviderChange = async (newProvider: string) => {
    // Get provider info and update provider, model
    const providerModel =
      PROVIDER_INFO[newProvider as keyof typeof PROVIDER_INFO]?.model || 'qwen3-tts-flash'

    setSettings((prev) => ({
      ...prev,
      provider: newProvider,
      model: providerModel,
      // Don't reset voice yet - let loadVoices handle it
    }))

    // Load voices for new provider
    try {
      const availableVoices = await listTTSVoices(newProvider)
      setVoices(availableVoices)

      // Set first voice as default
      if (availableVoices.length > 0) {
        setSettings((prev) => ({
          ...prev,
          provider: newProvider,
          model: providerModel,
          voice: availableVoices[0].id,
        }))
      }
    } catch (err) {
      console.error('Failed to load TTS voices:', err)
    }
  }

  const handleSave = async () => {
    if (!settings.apiKey.trim()) {
      setError('API Key is required')
      return
    }

    if (!settings.voice) {
      setError('Please select a voice')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await saveTTSSettings({
        provider: settings.provider,
        model:
          PROVIDER_INFO[settings.provider as keyof typeof PROVIDER_INFO]?.model ||
          'qwen3-tts-flash',
        apiKey: settings.apiKey.trim(),
        voice: settings.voice,
        speed: settings.speed,
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

  const currentProviderInfo = PROVIDER_INFO[settings.provider as keyof typeof PROVIDER_INFO]

  // Group voices by language
  const voicesByLanguage = voices.reduce(
    (acc, voice) => {
      const lang = voice.language
      if (!acc[lang]) acc[lang] = []
      acc[lang].push(voice)
      return acc
    },
    {} as Record<string, TTSVoice[]>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 paper-shadow p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-accent-blue" />
            <h2 className="text-lg font-semibold text-stone-800">TTS Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading}
            >
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]?.name || provider}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">{currentProviderInfo?.description}</p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Model</label>
            <select
              value={settings.model}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
            >
              <option value={currentProviderInfo?.model}>{currentProviderInfo?.model}</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              {settings.provider === 'qwen'
                ? 'Fast synthesis with 49 voice options'
                : 'High-quality voices with expressive styles'}
            </p>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Voice</label>
            <select
              value={settings.voice}
              onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading || voices.length === 0}
            >
              {Object.entries(voicesByLanguage).map(([lang, langVoices]) => (
                <optgroup key={lang} label={lang}>
                  {langVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description || voice.gender}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Select your preferred voice for text-to-speech
            </p>
          </div>

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Speed: {settings.speed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speed}
              onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600 opacity-50"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Fast)</span>
            </div>
            {!currentProviderInfo?.speedSupported && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Speed control is not supported by this provider.
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder={currentProviderInfo?.apiPlaceholder}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading}
            />
            <p className="text-xs text-stone-500 mt-1">
              Get your API key from{' '}
              <a
                href={currentProviderInfo?.apiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                {currentProviderInfo?.apiLink?.replace('https://', '')}
              </a>
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Pricing:</strong> {currentProviderInfo?.pricing}
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
