import { useState } from 'react';
import { Calendar, Wand2, Volume2, Database } from 'lucide-react';
import { AISettingsDialog } from './AISettings';
import { TTSSettingsDialog } from './TTSSettings';
import { DataSettingsDialog } from './DataSettings';

export function Header() {
  const [showAISettings, setShowAISettings] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border/40 bg-paper-dark/50 flex items-center justify-between px-4 paper-shadow">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-ink-secondary" />
          <h1 className="text-lg font-semibold text-ink-primary">Echo Daily</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg hover:bg-white/40 transition-colors"
            title="AI Settings"
            onClick={() => setShowAISettings(true)}
          >
            <Wand2 className="w-4 h-4 text-accent-blue" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/40 transition-colors"
            title="TTS Settings"
            onClick={() => setShowTTSSettings(true)}
          >
            <Volume2 className="w-4 h-4 text-accent-blue" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/40 transition-colors"
            title="Data Management"
            onClick={() => setShowDataSettings(true)}
          >
            <Database className="w-4 h-4 text-accent-blue" />
          </button>
        </div>
      </header>

      <AISettingsDialog isOpen={showAISettings} onClose={() => setShowAISettings(false)} />
      <TTSSettingsDialog isOpen={showTTSSettings} onClose={() => setShowTTSSettings(false)} />
      <DataSettingsDialog isOpen={showDataSettings} onClose={() => setShowDataSettings(false)} />
    </>
  );
}
