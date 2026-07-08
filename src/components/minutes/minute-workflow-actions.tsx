"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Shield, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  submitMinuteForReview,
  approveMinute,
  rejectMinute,
} from "@/actions/minutes";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics";

export function MinuteWorkflowActions({
  minuteId,
  status,
  canSubmit,
  canApprove,
  reviewComment,
}: {
  minuteId: string;
  status: string;
  canSubmit: boolean;
  canApprove: boolean;
  reviewComment?: string | null;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const isFr = locale === "fr";

  if (status === "FINALIZED" || status === "ARCHIVED") return null;

  return (
    <div className="space-y-3">
      {reviewComment && status === "IN_PROGRESS" && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {isFr ? "Commentaire du président : " : "President comment: "}
          {reviewComment}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canSubmit && ["DRAFT", "IN_PROGRESS"].includes(status) && (
          <Button
            variant="gold"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await submitMinuteForReview(minuteId, locale);
                if (r.success) {
                  setToast(isFr ? "PV soumis en révision" : "Minute submitted for review");
                  router.refresh();
                }
              })
            }
          >
            <Send className="h-4 w-4" />
            {isFr ? "Soumettre au président" : "Submit for review"}
          </Button>
        )}

        {canApprove && status === "REVIEW" && (
          <>
            <Button
              variant="gold"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await approveMinute(minuteId, locale);
                  if ("success" in r && r.success) {
                    trackEvent(ANALYTICS_EVENTS.MINUTE_FINALIZED, { minute_id: minuteId });
                    setToast(isFr ? "PV approuvé et finalisé" : "Minute approved and finalized");
                    router.push(`/${locale}/minutes/${minuteId}`);
                    router.refresh();
                  }
                })
              }
            >
              <Shield className="h-4 w-4" />
              {isFr ? "Approuver et finaliser" : "Approve & finalize"}
            </Button>
            {!rejecting ? (
              <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
                <XCircle className="h-4 w-4" />
                {isFr ? "Demander des corrections" : "Request changes"}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
                <input
                  className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder={isFr ? "Commentaire…" : "Comment…"}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await rejectMinute(minuteId, comment, locale);
                      if (r.success) {
                        setRejecting(false);
                        setToast(isFr ? "PV renvoyé au secrétaire" : "Sent back to secretary");
                        router.refresh();
                      }
                    })
                  }
                >
                  {isFr ? "Renvoyer" : "Send back"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {status === "REVIEW" && !canApprove && (
        <p className="text-sm text-purple-700">
          {isFr
            ? "En attente d'approbation par le président."
            : "Awaiting president approval."}
        </p>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}