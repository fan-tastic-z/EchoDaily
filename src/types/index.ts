// 日记条目
export interface DiaryEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  content_json: string; // ProseMirror JSON 序列化后的字符串
  created_at: number; // unix timestamp ms
  updated_at: number; // unix timestamp ms
}

// ProseMirror JSON 类型
export type ProseMirrorNode = {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  attrs?: Record<string, unknown>;
};

// 保存状态
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// UI 状态
export interface UIState {
  selectedDate: string;
  saveStatus: SaveStatus;
}
