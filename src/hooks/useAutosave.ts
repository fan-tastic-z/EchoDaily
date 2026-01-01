import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { upsertEntry } from '../lib/api';
import type { ProseMirrorNode } from '../types';

const AUTOSAVE_DELAY_MS = 2000;

export function useAutosave() {
  const { selectedDate, editorContent, dirtyDate, isDirty, markDirty, clearDirty, setSaveStatus } = useAppStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !dirtyDate) return;
    if (dirtyDate === selectedDate) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const flush = async () => {
      try {
        setSaveStatus('saving');
        const contentJson = JSON.stringify(editorContent as ProseMirrorNode);
        await upsertEntry(dirtyDate, contentJson);
        setSaveStatus('saved');
        clearDirty();
      } catch (error) {
        console.error('Autosave flush failed:', error);
        setSaveStatus('error');
        markDirty(dirtyDate);
      }
    };

    void flush();
  }, [clearDirty, dirtyDate, editorContent, isDirty, markDirty, selectedDate, setSaveStatus]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!isDirty || dirtyDate !== selectedDate) {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }

    timeoutRef.current = setTimeout(async () => {
      if (!editorContent || Object.keys(editorContent).length === 0) return;

      try {
        setSaveStatus('saving');
        const contentJson = JSON.stringify(editorContent as ProseMirrorNode);
        await upsertEntry(selectedDate, contentJson);
        setSaveStatus('saved');
        clearDirty();
      } catch (error) {
        console.error('Autosave failed:', error);
        setSaveStatus('error');
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [clearDirty, dirtyDate, editorContent, isDirty, selectedDate, setSaveStatus]);
}
