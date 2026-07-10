"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UsageGuideShellProps } from "@/components/layout/app-shell";

type UsageGuideContextValue = {
  config: UsageGuideShellProps;
  isOpen: boolean;
  stepIndex: number;
  openGuide: (stepIndex?: number) => void;
  closeGuide: () => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  registerLauncher: (el: HTMLElement | null) => void;
  launcherRef: React.RefObject<HTMLElement | null>;
};

const UsageGuideContext = createContext<UsageGuideContextValue | null>(null);

export function UsageGuideProvider({
  config,
  children,
}: {
  config: UsageGuideShellProps;
  children: ReactNode;
}) {
  const launcherRef = useRef<HTMLElement | null>(null);
  const wantsAutoOpen =
    config.shouldAutoStart && !config.completed && !config.dismissed;

  const [isOpen, setIsOpen] = useState(wantsAutoOpen);
  const [stepIndex, setStepIndex] = useState(0);

  const openGuide = useCallback((index = 0) => {
    setStepIndex(index);
    setIsOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
    setIsOpen(true);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((i) => i + 1);
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const registerLauncher = useCallback((el: HTMLElement | null) => {
    launcherRef.current = el;
  }, []);

  const value = useMemo(
    () => ({
      config,
      isOpen,
      stepIndex,
      openGuide,
      closeGuide,
      goToStep,
      nextStep,
      prevStep,
      registerLauncher,
      launcherRef,
    }),
    [
      config,
      isOpen,
      stepIndex,
      openGuide,
      closeGuide,
      goToStep,
      nextStep,
      prevStep,
      registerLauncher,
    ]
  );

  return (
    <UsageGuideContext.Provider value={value}>{children}</UsageGuideContext.Provider>
  );
}

export function useUsageGuide() {
  const ctx = useContext(UsageGuideContext);
  if (!ctx) return null;
  return ctx;
}