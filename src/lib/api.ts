import { invoke } from '@tauri-apps/api/core';
import type { DiaryEntry, AIOperation, AISettings } from '../types';

// Initialize the database (kept for compatibility; backend initializes on startup)
export async function initDb(): Promise<void> {
  return invoke('init_db');
}

// Create or update a diary entry
export async function upsertEntry(
  entryDate: string,
  contentJson: string
): Promise<DiaryEntry> {
  return invoke('upsert_entry', {
    entryDate,
    contentJson,
  });
}

// Get a diary entry by date
export async function getEntry(entryDate: string): Promise<DiaryEntry | null> {
  return invoke('get_entry', { entryDate });
}

// List diary entries by month
export async function listEntries(month: string): Promise<DiaryEntry[]> {
  return invoke('list_entries', { month });
}

// Delete a diary entry by date
export async function deleteEntry(entryDate: string): Promise<boolean> {
  return invoke('delete_entry', { entryDate });
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
  });
}

// Save AI settings (provider, model, api key)
export async function saveAISettings(settings: {
  provider: string;
  model: string;
  apiKey: string;
}): Promise<void> {
  return invoke('save_ai_settings', {
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKey,
  });
}

// Get AI settings (API key will be masked)
export async function getAISettings(): Promise<AISettings | null> {
  return invoke('get_ai_settings');
}

// List AI operations for an entry
export async function listAIOperations(
  entryId: string
): Promise<AIOperation[]> {
  return invoke('list_ai_operations', { entryId });
}
