"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  addMinuteComment,
  deleteMinuteComment,
  listMinuteComments,
  type MinuteCommentDTO,
} from "@/actions/minute-comments";
import { cn } from "@/lib/utils";

export function MinuteComments({
  minuteId,
  initialComments = [],
  canComment = false,
  canModerate = false,
  className,
}: {
  minuteId: string;
  initialComments?: MinuteCommentDTO[];
  canComment?: boolean;
  canModerate?: boolean;
  className?: string;
}) {
  const t = useTranslations("minutes.memberComments");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const [comments, setComments] = useState<MinuteCommentDTO[]>(initialComments);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [allowComment, setAllowComment] = useState(canComment);
  const [allowModerate, setAllowModerate] = useState(canModerate);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listMinuteComments(minuteId);
      if (result.comments) setComments(result.comments);
      if (typeof result.canComment === "boolean") setAllowComment(result.canComment);
      if (typeof result.canModerate === "boolean") setAllowModerate(result.canModerate);
    });
  }, [minuteId]);

  useEffect(() => {
    if (initialComments.length === 0) refresh();
  }, [initialComments.length, refresh]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await addMinuteComment(minuteId, body, locale);
      if (result.error === "EMPTY") {
        setToast(t("errorEmpty"));
        return;
      }
      if (result.error === "TOO_LONG") {
        setToast(t("errorTooLong"));
        return;
      }
      if (result.error === "LOCKED") {
        setToast(t("errorLocked"));
        return;
      }
      if (result.error || !result.comment) {
        setToast(t("errorGeneric"));
        return;
      }
      setComments((prev) => [...prev, result.comment!]);
      setBody("");
      setToast(t("toastAdded"));
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteMinuteComment(id, locale);
      if (result.error) {
        setToast(t("errorGeneric"));
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      setToast(t("toastDeleted"));
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden",
        className
      )}
      data-assist="minute-comments"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-navy" />
        <h3 className="font-semibold text-gray-900 text-sm">
          {t("title")}
          {comments.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">({comments.length})</span>
          )}
        </h3>
      </div>

      <div className="p-5 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">{t("empty")}</p>
        ) : (
          <ul className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-semibold shrink-0">
                  {c.author.firstName.charAt(0)}
                  {c.author.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.author.firstName} {c.author.lastName}
                        {c.isOwn && (
                          <span className="ml-1.5 text-xs font-normal text-navy">
                            ({t("you")})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(c.createdAt), "d MMM yyyy HH:mm", {
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                    {(c.isOwn || allowModerate) && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t("delete")}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap break-words">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {allowComment ? (
          <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100">
            <label className="text-sm font-medium text-gray-700">{t("addLabel")}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={t("placeholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{body.length}/4000</span>
              <Button type="submit" variant="gold" size="sm" disabled={pending || !body.trim()}>
                <Send className="h-4 w-4" />
                {pending ? t("sending") : t("submit")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            {t("cannotComment")}
          </p>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
