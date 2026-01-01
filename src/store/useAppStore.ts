import { create } from 'zustand';
import { format } from 'date-fns';
import type { DiaryEntry, SaveStatus } from '../types';

interface AppState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  currentEntry: DiaryEntry | null;
  setCurrentEntry: (entry: DiaryEntry | null) => void;

  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;

  editorContent: Record<string, unknown>;
  setEditorContent: (content: Record<string, unknown>) => void;

  isDirty: boolean;
  dirtyDate: string | null;
  markDirty: (date: string) => void;
  clearDirty: () => void;

  currentMonth: string; // yyyy-MM
  setCurrentMonth: (month: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  setSelectedDate: (date) => set({ selectedDate: date }),

  currentEntry: null,
  setCurrentEntry: (entry) => set({ currentEntry: entry }),

  saveStatus: 'idle',
  setSaveStatus: (status) => set({ saveStatus: status }),

  editorContent: { type: 'doc', content: [] },
  setEditorContent: (content) => set({ editorContent: content }),

  isDirty: false,
  dirtyDate: null,
  markDirty: (date) => set({ isDirty: true, dirtyDate: date }),
  clearDirty: () => set({ isDirty: false, dirtyDate: null }),

  currentMonth: format(new Date(), 'yyyy-MM'),
  setCurrentMonth: (month) => set({ currentMonth: month }),
}));
