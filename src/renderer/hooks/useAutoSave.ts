import { useEffect, useRef, useCallback } from 'react';
import { useNovelStore } from '../store/novelStore';

interface UseAutoSaveOptions {
  interval?: number;
  enabled?: boolean;
  onContentChange?: (content: string) => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
  setContent: (content: string) => void;
  saveNow: () => Promise<void>;
  markUnsaved: () => void;
}

export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveReturn {
  const {
    interval = 30000,
    enabled = true,
    onContentChange,
    onSaveSuccess,
    onSaveError,
  } = options;

  const {
    currentChapter,
    autoSave,
    updateChapterContent,
    setAutoSaveState,
    markUnsavedChanges,
  } = useNovelStore();

  const contentRef = useRef(currentChapter?.content || '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Refs to avoid timer restarts on state changes
  const hasUnsavedRef = useRef(autoSave.hasUnsavedChanges);
  hasUnsavedRef.current = autoSave.hasUnsavedChanges;
  const isSavingRef = useRef(autoSave.isSaving);
  isSavingRef.current = autoSave.isSaving;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const chapterIdRef = useRef(currentChapter?.id);
  chapterIdRef.current = currentChapter?.id;

  // Sync external content change to ref on chapter switch
  useEffect(() => {
    if (currentChapter?.content !== undefined) {
      contentRef.current = currentChapter.content;
    }
  }, [currentChapter?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Auto-save timer — only resets when interval changes
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) return;

    timerRef.current = setInterval(async () => {
      if (!enabledRef.current || !chapterIdRef.current) return;
      if (hasUnsavedRef.current && !isSavingRef.current) {
        await performSave();
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval]);

  const performSave = useCallback(async () => {
    if (!currentChapter || autoSave.isSaving) return;

    try {
      setAutoSaveState({ isSaving: true });
      await updateChapterContent(contentRef.current);

      if (isMountedRef.current) {
        setAutoSaveState({
          isSaving: false,
          hasUnsavedChanges: false,
          pendingChanges: false,
          lastSavedAt: new Date().toISOString(),
        });
        onSaveSuccess?.();
      }
    } catch (error) {
      if (isMountedRef.current) {
        setAutoSaveState({ isSaving: false });
        onSaveError?.(error instanceof Error ? error : new Error('保存失败'));
      }
    }
  }, [currentChapter?.id, autoSave.isSaving, updateChapterContent, setAutoSaveState, onSaveSuccess, onSaveError]);

  const setContent = useCallback((newContent: string) => {
    contentRef.current = newContent;

    const { currentChapter: ch, setCurrentChapter } = useNovelStore.getState();
    if (ch) {
      setCurrentChapter({ ...ch, content: newContent });
    }

    markUnsavedChanges();
    onContentChange?.(newContent);
  }, [markUnsavedChanges, onContentChange]);

  const saveNow = useCallback(async () => {
    await performSave();
  }, [performSave]);

  return {
    isSaving: autoSave.isSaving,
    hasUnsavedChanges: autoSave.hasUnsavedChanges,
    lastSavedAt: autoSave.lastSavedAt,
    setContent,
    saveNow,
    markUnsaved: markUnsavedChanges,
  };
}

export function useSimpleAutoSave<T>(
  value: T,
  onSave: (value: T) => Promise<void> | void,
  options: {
    interval?: number;
    enabled?: boolean;
    deps?: unknown[];
  } = {}
) {
  const { interval = 30000, enabled = true, deps = [] } = options;

  const valueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  useEffect(() => {
    valueRef.current = value;
    setHasUnsavedChanges(true);
  }, [value, ...deps]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(async () => {
      if (!hasUnsavedChanges || isSaving) return;
      setIsSaving(true);
      try {
        await onSave(valueRef.current);
        setHasUnsavedChanges(false);
      } finally {
        setIsSaving(false);
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval]);

  const saveNow = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(valueRef.current);
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, hasUnsavedChanges, saveNow };
}

import React from 'react';
export default useAutoSave;
