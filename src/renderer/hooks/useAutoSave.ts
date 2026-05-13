import { useEffect, useRef, useState, useCallback } from 'react';
import { useNovelStore } from '../store/novelStore';

interface UseAutoSaveOptions {
  interval?: number;
  enabled?: boolean;
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
  const { interval = 30000, enabled = true } = options;

  const { currentChapter, updateChapterContent, markUnsavedChanges } = useNovelStore();

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  const contentRef = useRef(currentChapter?.content || '');
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const loadedRef = useRef(!!currentChapter?.content);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterIdRef = useRef(currentChapter?.id);
  chapterIdRef.current = currentChapter?.id;

  // Sync content ref when switching chapters
  useEffect(() => {
    if (currentChapter?.content !== undefined) {
      contentRef.current = currentChapter.content;
      dirtyRef.current = false;
      setHasUnsavedChanges(false);
      loadedRef.current = true;
    } else {
      loadedRef.current = false;
    }
  }, [currentChapter?.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) return;

    timerRef.current = setInterval(async () => {
      if (!chapterIdRef.current || !loadedRef.current) return;
      if (!dirtyRef.current || savingRef.current) return;

      const saveContent = contentRef.current || useNovelStore.getState().currentChapter?.content || '';
      if (!saveContent) return;

      savingRef.current = true;
      setIsSaving(true);
      try {
        const result = await updateChapterContent(saveContent);
        if (result) {
          dirtyRef.current = false;
          setHasUnsavedChanges(false);
        }
      } catch {
        // 内部已 catch，兜底
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, updateChapterContent]);

  const setContent = useCallback((newContent: string) => {
    contentRef.current = newContent;
    dirtyRef.current = true;
    setHasUnsavedChanges(true);
    markUnsavedChanges();

    const { currentChapter: ch, setCurrentChapter } = useNovelStore.getState();
    if (ch) {
      setCurrentChapter({ ...ch, content: newContent });
    }
  }, [markUnsavedChanges]);

  const saveNow = useCallback(async () => {
    if (savingRef.current || !loadedRef.current) return;

    const saveContent = contentRef.current || useNovelStore.getState().currentChapter?.content || '';
    if (!saveContent) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const result = await updateChapterContent(saveContent);
      if (result) {
        dirtyRef.current = false;
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date().toISOString());
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [updateChapterContent]);

  return {
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
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
