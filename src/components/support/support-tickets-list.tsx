"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { addSupportMessage } from "@/actions/support";
import type { SupportTicketStatus } from "@/generated/prisma/client";

type TicketMessage = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: Date | string;
};

type Ticket = {
  id: string;
  subject: string;
  status: SupportTicketStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  messages: TicketMessage[];
  club?: { name: string } | null;
  _count?: { messages: number };
};

const statusVariant: Record<
  SupportTicketStatus,
  "default" | "warning" | "success" | "muted"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "muted",
};

export function SupportTicketsList({
  tickets,
  locale,
}: {
  tickets: Ticket[];
  locale: string;
}) {
  const t = useTranslations("support");
  const dateLocale = locale === "fr" ? fr : enUS;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleReply(ticketId: string) {
    const body = replyText[ticketId]?.trim();
    if (!body) return;

    startTransition(async () => {
      const result = await addSupportMessage(ticketId, body, locale);
      if ("success" in result && result.success) {
        setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
        setToast(t("replySent"));
      } else {
        setToast(t("error"));
      }
    });
  }

  if (tickets.length === 0) {
    return <p className="text-sm text-gray-500">{t("noTickets")}</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {tickets.map((ticket) => {
          const expanded = expandedId === ticket.id;
          return (
            <li
              key={ticket.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expanded ? null : ticket.id)
                }
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-navy shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(ticket.updatedAt), "PPp", { locale: dateLocale })}
                    {ticket.club?.name ? ` · ${ticket.club.name}` : ""}
                  </p>
                </div>
                <Badge variant={statusVariant[ticket.status]}>
                  {t(`status.${ticket.status}`)}
                </Badge>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>

              {expanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {ticket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          msg.isStaff
                            ? "bg-navy/5 border border-navy/10 ml-4"
                            : "bg-white border border-gray-200 mr-4"
                        }`}
                      >
                        <p className="text-xs text-gray-500 mb-1">
                          {msg.isStaff ? t("staffReply") : t("you")} ·{" "}
                          {format(new Date(msg.createdAt), "PPp", {
                            locale: dateLocale,
                          })}
                        </p>
                        <p className="text-gray-800 whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    ))}
                  </div>

                  {ticket.status !== "CLOSED" && (
                    <div className="space-y-2">
                      <textarea
                        value={replyText[ticket.id] ?? ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({
                            ...prev,
                            [ticket.id]: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                        placeholder={t("replyPlaceholder")}
                      />
                      <Button
                        size="sm"
                        disabled={pending || !replyText[ticket.id]?.trim()}
                        onClick={() => handleReply(ticket.id)}
                      >
                        {pending ? t("submitting") : t("reply")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}