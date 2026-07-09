"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { sendCampaignNow, deleteCampaign } from "@/actions/emails";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  openCount: number;
  clickCount: number;
  errorCount: number;
  createdAt: Date;
  group: { name: string } | null;
  template: { name: string } | null;
  _count: { logs: number };
};

const STATUS_VARIANT: Record<string, "default" | "gold" | "success" | "warning" | "danger" | "muted"> = {
  DRAFT: "muted",
  SCHEDULED: "warning",
  SENDING: "default",
  SENT: "success",
  FAILED: "danger",
};

export function CampaignsList({
  campaigns,
  canSend,
  locale,
}: {
  campaigns: Campaign[];
  canSend: boolean;
  locale: string;
}) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleString(locale === "en" ? "en-GB" : "fr-FR") : "—";

  if (campaigns.length === 0) {
    return <p className="text-sm text-gray-500">{tCommon("noResults")}</p>;
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "muted"}>
                    {t(`status.${c.status}`)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1 truncate">{c.subject}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                  {c.group && <span>{c.group.name}</span>}
                  {c.template && <span>{c.template.name}</span>}
                  <span>{c._count.logs} {t("recipients").toLowerCase()}</span>
                  {c.status === "SENT" && (() => {
                    const delivered = Math.max(c._count.logs - c.errorCount, 0);
                    const openRate =
                      delivered > 0 ? Math.round((c.openCount / delivered) * 100) : 0;
                    return (
                      <>
                        <span>
                          {t("stats.opens")}: {c.openCount}
                          {delivered > 0 && <> ({openRate}%)</>}
                        </span>
                        <span>{t("stats.errors")}: {c.errorCount}</span>
                      </>
                    );
                  })()}
                  {c.scheduledAt && <span>{t("schedule")}: {fmt(c.scheduledAt)}</span>}
                  {c.sentAt && <span>{t("sentAt")}: {fmt(c.sentAt)}</span>}
                </div>
              </div>
              {canSend && (c.status === "DRAFT" || c.status === "SCHEDULED" || c.status === "FAILED") && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="gold"
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(() => { void sendCampaignNow(c.id); })}
                  >
                    <Send className="h-3 w-3" />
                    {t("sendNow")}
                  </Button>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-600 p-2"
                    onClick={() => startTransition(() => { void deleteCampaign(c.id); })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}