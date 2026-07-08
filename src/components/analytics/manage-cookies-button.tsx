"use client";

import { useCookieConsent } from "./cookie-consent-provider";

export function ManageCookiesButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { openPreferences } = useCookieConsent();

  return (
    <button type="button" onClick={openPreferences} className={className}>
      {children}
    </button>
  );
}