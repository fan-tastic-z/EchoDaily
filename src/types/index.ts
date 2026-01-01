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
