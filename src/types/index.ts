// Diary entry
export interface DiaryEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  content_json: string; // ProseMirror JSON serialized string
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
