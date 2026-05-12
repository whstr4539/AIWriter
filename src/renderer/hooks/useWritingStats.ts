/**
 * 写作统计 Hook
 * 追踪今日创作时长和字数
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WritingStats {
  writingTime: number; // 分钟
  wordCount: number;
  lastUpdated: string;
}

export const useWritingStats = () => {
  const [stats, setStats] = useState<WritingStats>({
    writingTime: 0,
    wordCount: 0,
    lastUpdated: new Date().toISOString(),
  });
  
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取今天的存储键
  const getTodayKey = useCallback(() => {
    return `writingStats_${new Date().toDateString()}`;
  }, []);

  // 从本地存储加载今日统计
  const loadTodayStats = useCallback(() => {
    const key = getTodayKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setStats({
        writingTime: parsed.writingTime || 0,
        wordCount: parsed.wordCount || 0,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      });
    } else {
      // 新的一天，重置统计
      setStats({
        writingTime: 0,
        wordCount: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [getTodayKey]);

  // 保存统计到本地存储
  const saveStats = useCallback((newStats: WritingStats) => {
    const key = getTodayKey();
    localStorage.setItem(key, JSON.stringify(newStats));
  }, [getTodayKey]);

  // 开始计时
  const startTracking = useCallback(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      
      // 每分钟更新一次写作时长
      timerRef.current = setInterval(() => {
        setStats((prev) => {
          const updated = {
            ...prev,
            writingTime: prev.writingTime + 1,
            lastUpdated: new Date().toISOString(),
          };
          saveStats(updated);
          return updated;
        });
      }, 60000); // 每分钟
    }
  }, [saveStats]);

  // 停止计时
  const stopTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000);
      if (elapsed > 0) {
        setStats((prev) => {
          const updated = {
            ...prev,
            writingTime: prev.writingTime + elapsed,
            lastUpdated: new Date().toISOString(),
          };
          saveStats(updated);
          return updated;
        });
      }
      startTimeRef.current = null;
    }
  }, [saveStats]);

  // 更新字数统计
  const updateWordCount = useCallback((count: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        wordCount: count,
        lastUpdated: new Date().toISOString(),
      };
      saveStats(updated);
      return updated;
    });
  }, [saveStats]);

  // 增加字数
  const addWordCount = useCallback((delta: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        wordCount: prev.wordCount + delta,
        lastUpdated: new Date().toISOString(),
      };
      saveStats(updated);
      return updated;
    });
  }, [saveStats]);

  // 初始化时加载今日统计
  useEffect(() => {
    loadTodayStats();
  }, [loadTodayStats]);

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    stats,
    startTracking,
    stopTracking,
    updateWordCount,
    addWordCount,
    loadTodayStats,
  };
};

export default useWritingStats;
