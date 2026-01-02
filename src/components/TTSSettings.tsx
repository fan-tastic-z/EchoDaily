import { useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';
import { getTTSSettings, saveTTSSettings, listTTSVoices } from '../lib/api';
import type { TTSSettings, TTSVoice } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TTSSettingsDialog({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<TTSSettings>({
    provider: 'qwen',
    model: 'qwen3-tts-flash',
    apiKey: '',
    voice: 'cherry',
    speed: 1.0,
  });
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadVoices();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const current = await getTTSSettings();
      if (current) {
        setSettings({
          ...current,
          apiKey: '',
          voice: current.voice || 'cherry',
          speed: current.speed ?? 1.0,
        });
      }
    } catch (err) {
      console.error('Failed to load TTS settings:', err);
    }
  };

  const loadVoices = async () => {
    try {
      const availableVoices = await listTTSVoices();
      setVoices(availableVoices);
    } catch (err) {
      console.error('Failed to load TTS voices:', err);
    }
  };

  const handleSave = async () => {
    if (!settings.apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await saveTTSSettings({
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey.trim(),
        voice: settings.voice,
        speed: settings.speed,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Group voices by language
  const voicesByLanguage = voices.reduce((acc, voice) => {
    const lang = voice.language;
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, TTSVoice[]>);

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
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Provider
            </label>
            <select
              value={settings.provider}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
            >
              <option value="qwen">Alibaba Cloud Qwen (通义千问)</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Supports Chinese, English, Japanese, Korean, and more
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Model
            </label>
            <select
              value={settings.model}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
            >
              <option value="qwen3-tts-flash">Qwen3-TTS Flash</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Fast synthesis with 49 voice options
            </p>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Voice
            </label>
            <select
              value={settings.voice}
              onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading}
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
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Speed control is not supported by Qwen TTS API. This setting is saved but not applied.
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="Enter your Alibaba Cloud DashScope API key"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isLoading}
            />
            <p className="text-xs text-stone-500 mt-1">
              Get your API key from{' '}
              <a
                href="https://dashscope.console.aliyun.com/apiKey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                dashscope.console.aliyun.com
              </a>
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Pricing:</strong> ¥0.8/10k characters. Free tier: 10k characters for new users.
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
  );
}
