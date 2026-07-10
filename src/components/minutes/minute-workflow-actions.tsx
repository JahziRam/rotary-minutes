"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Shield, Send, XCircle, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  submitMinuteForReview,
  approveMinute,
  rejectMinute,
  finalizeAndSendToMembers,
  sendMinuteToAllMembers,
} from "@/actions/minutes";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics";
import { ActionHint } from "@/components/assistance/action-hint";

export function MinuteWorkflowActions({
  minuteId,
  status: initialStatus,
  canSubmit,
  canApprove,
  canFinalize,
  reviewComment,
  presidentApprovalRequired = true,
  memberEmailCount = 0,
  highlightPostMeeting = false,
}: {
  minuteId: string;
  status: string;
  canSubmit: boolean;
  canApprove: boolean;
  canFinalize?: boolean;
  reviewComment?: string | null;
  presidentApprovalRequired?: boolean;
  memberEmailCount?: number;
  /** Emphasize distribution options after ending a live meeting */
  highlightPostMeeting?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("minutes.distribution");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState(initialStatus);

  const canSendDirect = (canFinalize || canSubmit) && memberEmailCount > 0;
  const editable = ["DRAFT", "IN_PROGRESS"].includes(status);

  function showError(code?: string) {
    if (code === "NO_MEMBER_EMAILS") setToast(t("errorNoEmails"));
    else if (code === "NEEDS_APPROVAL") setToast(t("errorNeedsApproval"));
    else if (code === "NOT_FINALIZED") setToast(t("errorNotFinalized"));
    else setToast(t("errorGeneric"));
  }

  if (status === "ARCHIVED") return null;

  return (
    <div className="space-y-4">
      {reviewComment && status === "IN_PROGRESS" && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("presidentComment")} {reviewComment}
        </p>
      )}

      {highlightPostMeeting && editable && (
        <div className="rounded-xl border border-navy/20 bg-navy/5 px-4 py-3">
          <p className="font-medium text-sm text-gray-900">{t("postMeetingTitle")}</p>
          <p className="text-xs text-gray-600 mt-0.5">{t("postMeetingHint")}</p>
        </div>
      )}

      {/* Distribution choices after meeting / while drafting */}
      {editable && (canSubmit || canSendDirect) && (
        <div
          className={`grid gap-3 ${canSubmit && canSendDirect ? "sm:grid-cols-2" : ""}`}
          data-assist="minute-distribution"
        >
          {canSubmit && (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                highlightPostMeeting
                  ? "border-navy/30 bg-white shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-2">
                <Send className="h-5 w-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {presidentApprovalRequired ? t("sendForValidation") : t("finalizeOnly")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {presidentApprovalRequired
                      ? t("sendForValidationHint")
                      : t("finalizeOnlyHint")}
                  </p>
                </div>
              </div>
              <div className="relative" data-assist="minute-submit-review">
                <ActionHint hintId="minute_submit_action" when={canSubmit} />
                <Button
                  variant="gold"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await submitMinuteForReview(minuteId, locale);
                      if (r.success) {
                        if ("finalized" in r && r.finalized) {
                          setStatus("FINALIZED");
                          setToast(t("toastFinalized"));
                          trackEvent(ANALYTICS_EVENTS.MINUTE_FINALIZED, {
                            minute_id: minuteId,
                          });
                        } else {
                          setStatus("REVIEW");
                          setToast(t("toastSubmitted"));
                        }
                        router.refresh();
                      } else {
                        showError("error" in r ? String(r.error) : undefined);
                      }
                    })
                  }
                >
                  <Send className="h-4 w-4" />
                  {presidentApprovalRequired ? t("sendForValidation") : t("finalizeOnly")}
                </Button>
              </div>
            </div>
          )}

          {canSendDirect && (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                highlightPostMeeting
                  ? "border-gold/50 bg-gold/10 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {t("sendToMembers")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("sendToMembersHint", { count: memberEmailCount })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-navy/30"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(t("sendToMembersConfirm", { count: memberEmailCount }))) {
                    return;
                  }
                  startTransition(async () => {
                    const r = await finalizeAndSendToMembers(minuteId, locale);
                    if ("error" in r && r.error) {
                      showError(String(r.error));
                      return;
                    }
                    setStatus("FINALIZED");
                    trackEvent(ANALYTICS_EVENTS.MINUTE_FINALIZED, { minute_id: minuteId });
                    setToast(
                      "message" in r && r.message ? r.message : t("toastSentMembers")
                    );
                    router.refresh();
                  });
                }}
              >
                <Users className="h-4 w-4" />
                {t("sendToMembers")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Already finalized: still allow broadcast to members */}
      {status === "FINALIZED" && canSendDirect && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{t("alreadyFinalized")}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("sendToMembersHint", { count: memberEmailCount })}
              </p>
            </div>
          </div>
          <Button
            variant="gold"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("sendToMembersConfirm", { count: memberEmailCount }))) {
                return;
              }
              startTransition(async () => {
                const r = await sendMinuteToAllMembers(minuteId, locale);
                if (r.error) showError(r.error);
                else setToast(r.message ?? t("toastSentMembers"));
              });
            }}
          >
            <Users className="h-4 w-4" />
            {t("resendToMembers")}
          </Button>
        </div>
      )}

      {/* President approval when in REVIEW */}
      {canApprove && status === "REVIEW" && (
        <div className="flex flex-wrap gap-2">
          <div className="relative" data-assist="minute-finalize-btn">
            <ActionHint hintId="minute_finalize_action" when={canApprove} />
            <Button
              variant="gold"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await approveMinute(minuteId, locale);
                  if ("success" in r && r.success) {
                    trackEvent(ANALYTICS_EVENTS.MINUTE_FINALIZED, { minute_id: minuteId });
                    setStatus("FINALIZED");
                    setToast(t("toastApproved"));
                    router.push(`/${locale}/minutes/${minuteId}`);
                    router.refresh();
                  }
                })
              }
            >
              <Shield className="h-4 w-4" />
              {t("approveFinalize")}
            </Button>
          </div>
          {!rejecting ? (
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
              <XCircle className="h-4 w-4" />
              {t("requestChanges")}
            </Button>
          ) : (
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
              <input
                className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm"
                placeholder={t("commentPlaceholder")}
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
                      setStatus("IN_PROGRESS");
                      setToast(t("toastRejected"));
                      router.refresh();
                    }
                  })
                }
              >
                {t("sendBack")}
              </Button>
            </div>
          )}
        </div>
      )}

      {status === "REVIEW" && !canApprove && (
        <p className="text-sm text-purple-700">{t("awaitingApproval")}</p>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
