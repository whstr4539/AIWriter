/**
 * 用户引导 Hook
 * 管理首次使用引导和功能提示
 */

import { useState, useEffect, useCallback } from 'react';

export type OnboardingStep = 
  | 'welcome'
  | 'create_novel'
  | 'create_chapter'
  | 'editor_basics'
  | 'ai_features'
  | 'focus_mode'
  | 'export'
  | 'completed';

interface OnboardingState {
  isFirstTime: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
}

interface UseOnboardingReturn extends OnboardingState {
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  markStepCompleted: (step: OnboardingStep) => void;
  resetOnboarding: () => void;
  hasSeenFeature: (feature: string) => boolean;
  markFeatureSeen: (feature: string) => void;
}

const ONBOARDING_KEY = 'app-onboarding';
const FEATURES_KEY = 'seen-features';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'create_novel',
  'create_chapter',
  'editor_basics',
  'ai_features',
  'focus_mode',
  'export',
  'completed',
];

export const useOnboarding = (): UseOnboardingReturn => {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window === 'undefined') {
      return {
        isFirstTime: true,
        currentStep: 'welcome',
        completedSteps: [],
        skipped: false,
      };
    }

    const saved = localStorage.getItem(ONBOARDING_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // 解析失败，使用默认值
      }
    }

    return {
      isFirstTime: true,
      currentStep: 'welcome',
      completedSteps: [],
      skipped: false,
    };
  });

  const [seenFeatures, setSeenFeatures] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    
    const saved = localStorage.getItem(FEATURES_KEY);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // 保存状态到本地存储
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
    }
  }, [state]);

  // 保存已查看的功能
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FEATURES_KEY, JSON.stringify(Array.from(seenFeatures)));
    }
  }, [seenFeatures]);

  // 开始引导
  const startOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isFirstTime: false,
      currentStep: 'welcome',
      skipped: false,
    }));
  }, []);

  // 下一步
  const nextStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      const nextIndex = Math.min(currentIndex + 1, STEP_ORDER.length - 1);
      const nextStep = STEP_ORDER[nextIndex];
      
      return {
        ...prev,
        currentStep: nextStep,
        completedSteps: [...prev.completedSteps, prev.currentStep],
      };
    });
  }, []);

  // 上一步
  const prevStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);
      
      return {
        ...prev,
        currentStep: STEP_ORDER[prevIndex],
      };
    });
  }, []);

  // 跳过引导
  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      skipped: true,
      currentStep: 'completed',
    }));
  }, []);

  // 完成引导
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: 'completed',
      completedSteps: [...prev.completedSteps, prev.currentStep],
    }));
  }, []);

  // 标记步骤完成
  const markStepCompleted = useCallback((step: OnboardingStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  }, []);

  // 重置引导
  const resetOnboarding = useCallback(() => {
    setState({
      isFirstTime: true,
      currentStep: 'welcome',
      completedSteps: [],
      skipped: false,
    });
  }, []);

  // 检查是否已查看某个功能
  const hasSeenFeature = useCallback((feature: string): boolean => {
    return seenFeatures.has(feature);
  }, [seenFeatures]);

  // 标记功能已查看
  const markFeatureSeen = useCallback((feature: string) => {
    setSeenFeatures((prev) => new Set([...prev, feature]));
  }, []);

  return {
    ...state,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    markStepCompleted,
    resetOnboarding,
    hasSeenFeature,
    markFeatureSeen,
  };
};

export default useOnboarding;
