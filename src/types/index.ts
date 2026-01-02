// Diary entry
export interface DiaryEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  content_json: string; // ProseMirror JSON serialized string
  mood?: string; // Mood category: amazing, happy, neutral, sad, awful
  mood_emoji?: string; // Emoji representation: 😄, 😊, 😐, 😢, 😭
  created_at: number; // unix timestamp ms
  updated_at: number; // unix timestamp ms
}

// ProseMirror JSON type
export type ProseMirrorNode = {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  attrs?: Record<string, unknown>;
};

// Save status
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// UI state
export interface UIState {
  selectedDate: string;
  saveStatus: SaveStatus;
}

// AI Operation
export interface AIOperation {
  id: string;
  entry_id: string;
  op_type: string; // "polish", "expand", "fix_grammar"
  original_text: string;
  result_text: string;
  provider: string;
  model: string;
  created_at: number;
}

// AI Settings (without actual API key for security)
export interface AISettings {
  provider: string;
  model: string;
  api_key: string; // Masked as "***" when returned from backend
}

// AI operation types
export type AIOpType = 'polish' | 'expand' | 'fix_grammar';

// ===== TTS Types =====

// TTS output format
export type TTSOutputFormat = 'mp3' | 'wav' | 'ogg';

// TTS Voice
export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: string;
  description?: string;
}

// TTS Response
export interface TTSResponse {
  audio_url?: string;  // Backend only
  audio_base64?: string;  // Base64 encoded audio data
  audio_file?: string;  // Path to audio file (for large files)
  format: string;
  duration_ms?: number;
  provider: string;
  model: string;
  voice: string;
}

// TTS Settings
export interface TTSSettings {
  provider: string;
  model: string;
  apiKey: string;  // camelCase to match Rust serde serialization
  voice?: string;
  speed: number;
}

// ===== Mood Tracking Types =====

// Mood type enum
export type MoodType = 'amazing' | 'happy' | 'neutral' | 'sad' | 'awful';

// Mood option with display information
export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}

// Available mood options
export const MOOD_OPTIONS: MoodOption[] = [
  { type: 'amazing', emoji: '😄', label: 'Amazing' },
  { type: 'happy', emoji: '😊', label: 'Happy' },
  { type: 'neutral', emoji: '😐', label: 'Neutral' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'awful', emoji: '😭', label: 'Awful' },
];

