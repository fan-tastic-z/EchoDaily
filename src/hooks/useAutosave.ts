import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { upsertEntry } from '../lib/api'
import type { ProseMirrorNode } from '../types'

const AUTOSAVE_DELAY_MS = 2000

export function useAutosave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const pendingRef = useRef(false)
  const currentSavePromiseRef = useRef<Promise<boolean> | null>(null)
  const flushNowRef = useRef<() => Promise<boolean>>(async () => true)

  const flushNow = useCallback(async (): Promise<boolean> => {
    // If already saving, return the current promise
    if (isSavingRef.current && currentSavePromiseRef.current) {
      return currentSavePromiseRef.current
    }

    isSavingRef.current = true

    const promise = (async () => {
      try {
        const state = useAppStore.getState()

        if (!state.isDirty || !state.dirtyDate) return true
        if (state.dirtyDate !== state.selectedDate) return false
        if (!state.editorContent || Object.keys(state.editorContent).length === 0) return true

        const revisionAtStart = state.editRevision

        state.setLastSaveError(null)
        state.setSaveStatus('saving')
        const contentJson = JSON.stringify(state.editorContent as ProseMirrorNode)
        const entry = await upsertEntry(state.selectedDate, contentJson)
        useAppStore.getState().setCurrentEntry(entry)

        const after = useAppStore.getState()
        const unchanged =
          after.isDirty &&
          after.dirtyDate === after.selectedDate &&
          after.editRevision === revisionAtStart

        if (unchanged) {
          after.clearDirtyIf(after.selectedDate)
          after.setSaveStatus('saved')
        } else {
          after.setSaveStatus('idle')
        }

        return true
      } catch (error) {
        console.error('Autosave failed:', error)
        useAppStore.getState().setLastSaveError(String(error))
        useAppStore.getState().setSaveStatus('error')
        return false
      } finally {
        isSavingRef.current = false
        currentSavePromiseRef.current = null

        if (pendingRef.current) {
          pendingRef.current = false
          setTimeout(() => {
            void flushNowRef.current()
          }, 0)
        }
      }
    })()

    currentSavePromiseRef.current = promise
    return promise
  }, [])

  flushNowRef.current = flushNow

  // Use editRevision as a trigger - it increments every time markDirty is called
  const { editRevision } = useAppStore()

  useEffect(() => {
    const state = useAppStore.getState()

    // Only set timeout when dirty and dates match
    if (!state.isDirty || state.dirtyDate !== state.selectedDate) {
      // Clear any existing timeout if conditions aren't met
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // Clear any existing timeout and set a new one (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      void flushNow()
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [editRevision, flushNow])

  return { flushNow }
}
