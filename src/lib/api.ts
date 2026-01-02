import { invoke } from '@tauri-apps/api/core'
import type {
  DiaryEntry,
  AIOperation,
  AISettings,
  TTSVoice,
  TTSSettings,
  TTSResponse,
  WritingStats,
  ImportOptions,
} from '../types'

// Initialize the database (kept for compatibility; backend initializes on startup)
export async function initDb(): Promise<void> {
  return invoke('init_db')
}

// Create or update a diary entry
export async function upsertEntry(entryDate: string, contentJson: string): Promise<DiaryEntry> {
  return invoke('upsert_entry', {
    entryDate,
    contentJson,
  })
}

// Get a diary entry by date
export async function getEntry(entryDate: string): Promise<DiaryEntry | null> {
  return invoke('get_entry', { entryDate })
}

// List diary entries by month
export async function listEntries(month: string): Promise<DiaryEntry[]> {
  return invoke('list_entries', { month })
}

// Delete a diary entry by date
export async function deleteEntry(entryDate: string): Promise<boolean> {
  return invoke('delete_entry', { entryDate })
}

// AI Operations

// Polish text using AI
export async function aiPolish(
  entryDate: string,
  text: string,
  opType?: string
): Promise<AIOperation> {
  return invoke('ai_polish', {
    entryDate,
    text,
    ...(opType && { opType }),
  })
}

// Save AI settings (provider, model, api key)
export async function saveAISettings(settings: {
  provider: string
  model: string
  apiKey: string
}): Promise<void> {
  return invoke('save_ai_settings', { settings })
}

// Get AI settings (API key will be masked)
export async function getAISettings(): Promise<AISettings | null> {
  return invoke('get_ai_settings')
}

// List AI operations for an entry
export async function listAIOperations(entryId: string): Promise<AIOperation[]> {
  return invoke('list_ai_operations', { entryId })
}

// ===== TTS Operations =====

// Text to speech synthesis
export async function textToSpeech(options: {
  text: string
  voice?: string
  language?: string
  speed?: number
  provider?: string
}): Promise<TTSResponse> {
  return invoke('text_to_speech', {
    text: options.text,
    ...(options.voice !== undefined && { voice: options.voice }),
    ...(options.language !== undefined && { language: options.language }),
    ...(options.speed !== undefined && { speed: options.speed }),
    ...(options.provider !== undefined && { provider: options.provider }),
  })
}

// List available TTS voices
export async function listTTSVoices(provider?: string): Promise<TTSVoice[]> {
  return invoke('list_tts_voices', {
    ...(provider !== undefined && { provider }),
  })
}

// List available TTS providers
export async function listTTSProviders(): Promise<string[]> {
  return invoke('list_tts_providers')
}

// Save TTS settings
export async function saveTTSSettings(settings: TTSSettings): Promise<void> {
  return invoke('save_tts_settings', { settings })
}

// Get TTS settings
export async function getTTSSettings(provider?: string): Promise<TTSSettings | null> {
  return invoke('get_tts_settings', {
    ...(provider !== undefined && { provider }),
  })
}

// ===== Mood Tracking API =====

// Update or create an entry with mood information
export async function upsertEntryMood(
  entryDate: string,
  mood?: string,
  moodEmoji?: string
): Promise<DiaryEntry> {
  return invoke('upsert_entry_mood', {
    entryDate,
    ...(mood !== undefined && { mood }),
    ...(moodEmoji !== undefined && { moodEmoji }),
  })
}

// List entries filtered by mood for a given month
export async function listEntriesByMood(month: string, mood: string): Promise<DiaryEntry[]> {
  return invoke('list_entries_by_mood', { month, mood })
}

// ===== Search API =====

// Search entries by full-text query
export async function searchEntries(query: string): Promise<DiaryEntry[]> {
  return invoke('search_entries', { query })
}

// ===== Statistics API =====

// Get writing statistics
export async function getWritingStats(): Promise<WritingStats> {
  return invoke('get_writing_stats')
}

// ===== Export/Import API =====

// Export all user data as JSON string
export async function exportData(): Promise<string> {
  return invoke('export_data')
}

// Import user data from JSON string
export async function importData(jsonData: string, options: ImportOptions): Promise<number> {
  return invoke('import_data', { jsonData, options })
}
