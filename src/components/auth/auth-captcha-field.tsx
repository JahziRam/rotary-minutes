"use client";

import { useState } from "react";

// Captcha visuel (calcul a+b) retiré le 2026-07 : cause suspectée de
// saturation mémoire serveur. Honeypot + délai d'ouverture du formulaire
// restent actifs comme filtre anti-bot léger.

export type AuthCaptchaPayload = {
  captchaToken: string;
  captchaAnswer: number;
  openedAt: number;
  website?: string;
};

export function AuthCaptchaField() {
  const [openedAt] = useState(() => Date.now());

  return (
    <div>
      <input type="hidden" name="openedAt" value={openedAt} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        aria-hidden
      />
    </div>
  );
}

export function readAuthCaptchaFromForm(form: FormData): AuthCaptchaPayload {
  return {
    captchaToken: "",
    captchaAnswer: 0,
    openedAt: parseInt(String(form.get("openedAt") ?? ""), 10),
    website: String(form.get("website") ?? "").trim() || undefined,
  };
}