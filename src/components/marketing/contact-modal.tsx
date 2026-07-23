"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Send, CheckCircle2, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitContactForm } from "@/actions/contact";
import { cn } from "@/lib/utils";
import { trackContactFormSubmit } from "@/lib/landing-analytics";

type Topic = "demo" | "pricing" | "support" | "partnership" | "other";

function randomCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b };
}

export function ContactModal({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
}) {
  const t = useTranslations("landing.contact");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(Date.now());
  const [captcha, setCaptcha] = useState(randomCaptcha);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clubName, setClubName] = useState("");
  const [topic, setTopic] = useState<Topic>("demo");
  const [message, setMessage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [humanCheck, setHumanCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setClubName("");
    setTopic("demo");
    setMessage("");
    setCaptchaAnswer("");
    setHumanCheck(false);
    setError(null);
    setSuccess(false);
    setCaptcha(randomCaptcha());
    openedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
      openedAtRef.current = Date.now();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const messageLen = message.length;
  const canSubmit =
    name.trim().length >= 2 &&
    email.includes("@") &&
    message.trim().length >= 20 &&
    humanCheck &&
    !pending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const honeypot = String(formData.get("website") ?? "").trim();

    const result = await submitContactForm({
      name,
      email,
      clubName,
      topic,
      message,
      website: honeypot,
      openedAt: openedAtRef.current,
      captchaA: captcha.a,
      captchaB: captcha.b,
      captchaAnswer: parseInt(captchaAnswer, 10),
      locale,
    });

    setPending(false);

    if ("success" in result && result.success) {
      trackContactFormSubmit("success");
      setSuccess(true);
      return;
    }

    const code = ("error" in result && result.error) ? result.error : "SEND_FAILED";
    trackContactFormSubmit(code);
    setError(t(`errors.${code}` as "errors.SEND_FAILED"));
    if (code === "CAPTCHA_INVALID") {
      setCaptcha(randomCaptcha());
      setCaptchaAnswer("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-navy-dark/75 backdrop-blur-sm" aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-navy via-gold to-navy" />

        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-gray-900">
                {t("title")}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">{t("subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {success ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <p className="mt-4 text-lg font-semibold text-gray-900">{t("successTitle")}</p>
              <p className="mt-2 max-w-sm text-sm text-gray-500">{t("successBody")}</p>
              <Button type="button" variant="gold" className="mt-6" onClick={onClose}>
                {t("close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Honeypot — hidden from users, bots often fill it */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t("name")}
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder={t("namePlaceholder")}
                />
                <Input
                  label={t("email")}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                />
              </div>

              <Input
                label={t("clubName")}
                name="clubName"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                autoComplete="organization"
                placeholder={t("clubPlaceholder")}
              />

              <div className="space-y-1.5">
                <label htmlFor="contact-topic" className="text-sm font-medium text-gray-700">
                  {t("topic")}
                </label>
                <select
                  id="contact-topic"
                  name="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as Topic)}
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="demo">{t("topics.demo")}</option>
                  <option value="pricing">{t("topics.pricing")}</option>
                  <option value="support">{t("topics.support")}</option>
                  <option value="partnership">{t("topics.partnership")}</option>
                  <option value="other">{t("topics.other")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-sm font-medium text-gray-700">
                  {t("message")}
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  maxLength={4000}
                  placeholder={t("messagePlaceholder")}
                  className="flex w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed transition-colors placeholder:text-gray-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
                <p
                  className={cn(
                    "text-xs text-right",
                    messageLen < 20 ? "text-amber-600" : "text-gray-400"
                  )}
                >
                  {messageLen}/4000 · {t("messageHint")}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("securityTitle")}
                </p>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={humanCheck}
                    onChange={(e) => setHumanCheck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy/30"
                  />
                  <span className="text-sm text-gray-700">{t("humanCheck")}</span>
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <p className="text-xs text-gray-400">{t("privacyNote")}</p>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                  {t("cancel")}
                </Button>
                <Button type="submit" variant="gold" disabled={!canSubmit} className="min-w-[140px]">
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("submit")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}