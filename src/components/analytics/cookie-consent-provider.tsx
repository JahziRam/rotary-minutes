"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { recordConsent } from "@/actions/gdpr";
import {
  createConsent,
  hasConsentDecision,
  readConsentCookie,
  writeConsentCookie,
  type CookieConsent,
} from "@/lib/cookie-consent";

interface CookieConsentContextValue {
  consent: CookieConsent | null;
  bannerOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function persistConsent(analytics: boolean) {
  const consent = createConsent(analytics);
  writeConsentCookie(consent);
  recordConsent("analytics", analytics).catch(() => {});
  return consent;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readConsentCookie();
    setConsent(stored);
    setBannerOpen(!hasConsentDecision());
    setReady(true);
  }, []);

  const applyConsent = useCallback((analytics: boolean) => {
    const next = persistConsent(analytics);
    setConsent(next);
    setBannerOpen(false);
    window.dispatchEvent(
      new CustomEvent("rm:cookie-consent", { detail: { analytics } })
    );
  }, []);

  const acceptAll = useCallback(() => applyConsent(true), [applyConsent]);
  const rejectOptional = useCallback(() => applyConsent(false), [applyConsent]);
  const openPreferences = useCallback(() => setBannerOpen(true), []);
  const closePreferences = useCallback(() => {
    if (hasConsentDecision()) setBannerOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      bannerOpen: ready && bannerOpen,
      acceptAll,
      rejectOptional,
      openPreferences,
      closePreferences,
    }),
    [consent, ready, bannerOpen, acceptAll, rejectOptional, openPreferences, closePreferences]
  );

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}