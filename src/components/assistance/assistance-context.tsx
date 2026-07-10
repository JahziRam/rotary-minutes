"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AssistanceState } from "@/actions/assistance";

const AssistanceContext = createContext<AssistanceState | null>(null);

export function AssistanceProvider({
  state,
  children,
}: {
  state: AssistanceState | null;
  children: ReactNode;
}) {
  return (
    <AssistanceContext.Provider value={state}>{children}</AssistanceContext.Provider>
  );
}

export function useAssistance() {
  return useContext(AssistanceContext);
}