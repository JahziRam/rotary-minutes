"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAssistanceFeedback } from "@/actions/assistance-feedback";
import { useAssistance } from "./assistance-context";

export function AssistanceFeedbackButton() {
  const t = useTranslations("assistance.feedback");
  const assistance = useAssistance();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [thanks, setThanks] = useState(false);

  if (!assistance?.guideEnabled || !assistance.clubSetupComplete) return null;

  function submit() {
    if (rating < 1) return;
    startTransition(async () => {
      await submitAssistanceFeedback({
        rating,
        comment,
        context: "in_app",
      });
      setThanks(true);
      setTimeout(() => {
        setOpen(false);
        setThanks(false);
        setRating(0);
        setComment("");
      }, 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 z-[90] h-11 w-11 rounded-full bg-navy text-white shadow-lg flex items-center justify-center hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label={t("open")}
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-4 bg-navy/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <h2 id="feedback-title" className="font-display font-bold text-navy">
                {thanks ? t("thanksTitle") : t("title")}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("close")}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {thanks ? (
              <p className="text-sm text-gray-600">{t("thanksBody")}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">{t("subtitle")}</p>
                <div className="flex gap-1 justify-center" role="group" aria-label={t("ratingLabel")}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`p-2 rounded-lg transition-colors ${
                        rating >= n ? "text-gold" : "text-gray-300 hover:text-gold/60"
                      }`}
                      aria-label={t("star", { n })}
                    >
                      <Star className={`h-7 w-7 ${rating >= n ? "fill-gold" : ""}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder={t("commentPlaceholder")}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  type="button"
                  variant="gold"
                  className="w-full"
                  disabled={rating < 1 || pending}
                  onClick={submit}
                >
                  {pending ? "..." : t("submit")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}