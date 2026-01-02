import { create } from 'zustand'
import { format } from 'date-fns'
import type { DiaryEntry, SaveStatus } from '../types'

interface AppState {
  selectedDate: string
  setSelectedDate: (date: string) => void
  pendingSelectedDate: string | null
  requestSelectDate: (date: string) => void
  clearPendingSelectDate: () => void

  currentEntry: DiaryEntry | null
  setCurrentEntry: (entry: DiaryEntry | null) => void

  saveStatus: SaveStatus
  setSaveStatus: (status: SaveStatus) => void
  lastSaveError: string | null
  setLastSaveError: (message: string | null) => void

  editorContent: Record<string, unknown>
  setEditorContent: (content: Record<string, unknown>) => void

  editRevision: number

  isDirty: boolean
  dirtyDate: string | null
  markDirty: (date: string) => void
  clearDirty: () => void
  clearDirtyIf: (date: string) => void

  currentMonth: string // yyyy-MM
  setCurrentMonth: (month: string) => void

  monthEntries: DiaryEntry[]
  setMonthEntries: (entries: DiaryEntry[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  setSelectedDate: (date) => set({ selectedDate: date }),
  pendingSelectedDate: null,
  requestSelectDate: (date) => set({ pendingSelectedDate: date }),
  clearPendingSelectDate: () => set({ pendingSelectedDate: null }),

  currentEntry: null,
  setCurrentEntry: (entry) => set({ currentEntry: entry }),

  saveStatus: 'idle',
  setSaveStatus: (status) => set({ saveStatus: status }),
  lastSaveError: null,
  setLastSaveError: (message) => set({ lastSaveError: message }),

  editorContent: { type: 'doc', content: [] },
  setEditorContent: (content) => set({ editorContent: content }),

  editRevision: 0,

  isDirty: false,
  dirtyDate: null,
  markDirty: (date) =>
    set((state) => ({
      isDirty: true,
      dirtyDate: date,
      editRevision: state.editRevision + 1,
    })),
  clearDirty: () => set({ isDirty: false, dirtyDate: null }),
  clearDirtyIf: (date) =>
    set((state) => {
      if (!state.isDirty || state.dirtyDate !== date) return state
      return { isDirty: false, dirtyDate: null }
    }),

  currentMonth: format(new Date(), 'yyyy-MM'),
  setCurrentMonth: (month) => set({ currentMonth: month }),

  monthEntries: [],
  setMonthEntries: (entries) => set({ monthEntries: entries }),
}))
