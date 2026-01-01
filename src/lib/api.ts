import { invoke } from '@tauri-apps/api/core';
import type { DiaryEntry } from '../types';

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
    entryDate: entryDate,
    contentJson: contentJson,
  });
}

// Get a diary entry by date
export async function getEntry(entryDate: string): Promise<DiaryEntry | null> {
  return invoke('get_entry', { entryDate: entryDate });
}

// List diary entries by month
export async function listEntries(month: string): Promise<DiaryEntry[]> {
  return invoke('list_entries', { month: month });
}

// Delete a diary entry by date
export async function deleteEntry(entryDate: string): Promise<boolean> {
  return invoke('delete_entry', { entryDate: entryDate });
}
