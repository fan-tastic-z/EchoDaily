import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { SaveStatus } from '../types';

const statusConfig: Record<SaveStatus, { icon: React.ReactNode; text: string; className: string }> = {
  idle: { icon: null, text: '', className: '' },
  saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Saving...', className: 'text-ink-secondary' },
  saved: { icon: <CheckCircle2 className="w-3 h-3" />, text: 'Saved', className: 'text-green-600' },
  error: { icon: <AlertCircle className="w-3 h-3" />, text: 'Save failed', className: 'text-accent-red' },
};

export function SaveIndicator() {
  const { saveStatus } = useAppStore();
  const config = statusConfig[saveStatus];

  if (saveStatus === 'idle') return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
