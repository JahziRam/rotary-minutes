"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { createSupportTicket } from "@/actions/support";

export function SupportTicketForm({ locale }: { locale: string }) {
  const t = useTranslations("support");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSupportTicket(subject, body, locale);
      if ("success" in result && result.success) {
        setSubject("");
        setBody("");
        setToast(t("created"));
      } else if ("error" in result) {
        setToast(
          result.error === "VALIDATION" ? t("validationError") : t("error")
        );
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            {t("subject")}
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            placeholder={t("subjectPlaceholder")}
            required
          />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
            {t("message")}
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
            placeholder={t("messagePlaceholder")}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}