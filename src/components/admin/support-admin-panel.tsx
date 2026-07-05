"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  addSupportMessage,
  updateSupportTicketStatus,
} from "@/actions/support";
import type { SupportTicketStatus } from "@/generated/prisma/client";

type AdminTicket = {
  id: string;
  subject: string;
  status: SupportTicketStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  user: { firstName: string; lastName: string; email: string };
  club: { name: string } | null;
  messages: Array<{
    id: string;
    body: string;
    isStaff: boolean;
    createdAt: Date | string;
  }>;
  _count: { messages: number };
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

const STATUS_OPTIONS: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export function SupportAdminPanel({
  tickets,
  locale,
}: {
  tickets: AdminTicket[];
  locale: string;
}) {
  const t = useTranslations("support");
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [selectedId, setSelectedId] = useState<string | null>(
    tickets[0]?.id ?? null
  );
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = tickets.find((t) => t.id === selectedId);

  function handleStatusChange(ticketId: string, status: SupportTicketStatus) {
    startTransition(async () => {
      const result = await updateSupportTicketStatus(ticketId, status, locale);
      if ("success" in result && result.success) {
        setToast(t("statusUpdated"));
        router.refresh();
      } else {
        setToast(t("error"));
      }
    });
  }

  function handleReply() {
    if (!selectedId || !reply.trim()) return;
    startTransition(async () => {
      const result = await addSupportMessage(selectedId, reply, locale);
      if ("success" in result && result.success) {
        setReply("");
        setToast(t("replySent"));
        router.refresh();
      } else {
        setToast(t("error"));
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-navy" />
            {t("adminTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noTickets")}</p>
          ) : (
            <div className="grid lg:grid-cols-5 gap-4 min-h-[400px]">
              <ul className="lg:col-span-2 space-y-2 max-h-[500px] overflow-y-auto">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ticket.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedId === ticket.id
                          ? "border-navy bg-navy/5"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {ticket.user.firstName} {ticket.user.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={statusVariant[ticket.status]} className="text-[10px]">
                          {t(`status.${ticket.status}`)}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {ticket._count.messages} msg
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {selected && (
                <div className="lg:col-span-3 border border-gray-200 rounded-lg p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selected.subject}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {selected.user.firstName} {selected.user.lastName} ·{" "}
                        {selected.user.email}
                        {selected.club?.name ? ` · ${selected.club.name}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(selected.createdAt), "PPp", {
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        handleStatusChange(
                          selected.id,
                          e.target.value as SupportTicketStatus
                        )
                      }
                      disabled={pending}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1.5"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {t(`status.${s}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-64 mb-4">
                    {selected.messages
                      .slice()
                      .reverse()
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            msg.isStaff
                              ? "bg-navy/5 border border-navy/10"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <p className="text-xs text-gray-500 mb-1">
                            {msg.isStaff ? t("staffReply") : t("userReply")} ·{" "}
                            {format(new Date(msg.createdAt), "PPp", {
                              locale: dateLocale,
                            })}
                          </p>
                          <p className="text-gray-800 whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      ))}
                  </div>

                  {selected.status !== "CLOSED" && (
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder={t("replyPlaceholder")}
                      />
                      <Button
                        size="sm"
                        disabled={pending || !reply.trim()}
                        onClick={handleReply}
                      >
                        {pending ? t("submitting") : t("reply")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}