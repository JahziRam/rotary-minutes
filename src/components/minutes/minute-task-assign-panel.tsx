"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { assignAgendaActions, listPendingAgendaActions } from "@/actions/club-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

type PendingItem = {
  agendaItemId: string;
  agendaTitle: string;
  titles: string[];
  responsible: string | null;
  dueDate: string | null;
  alreadySynced: boolean;
};

type Member = { id: string; firstName: string; lastName: string };

export function MinuteTaskAssignPanel({ minuteId }: { minuteId: string }) {
  const t = useTranslations("minutes.taskAssign");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listPendingAgendaActions(minuteId);
      if (cancelled) return;
      if ("error" in result && result.error) {
        setLoaded(true);
        return;
      }
      if ("pending" in result && Array.isArray(result.pending)) {
        setItems(result.pending);
        setMembers(result.members ?? []);
        setCanManage(Boolean(result.canManage));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [minuteId]);

  if (!loaded) return null;
  if (items.length === 0) return null;

  function handleAssign(agendaItemId: string, responsibleMemberId: string) {
    if (!canManage || !responsibleMemberId) return;
    startTransition(async () => {
      const result = await assignAgendaActions(minuteId, [{ agendaItemId, responsibleMemberId }]);
      if ("success" in result && result.success) {
        setToast(t("assigned"));
        setItems((prev) =>
          prev.map((item) =>
            item.agendaItemId === agendaItemId ? { ...item, alreadySynced: true } : item
          )
        );
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">{t("hint")}</p>
        {items.map((item) => (
          <div
            key={item.agendaItemId}
            className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.agendaTitle}</p>
                <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                  {item.titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </div>
              {item.alreadySynced && <Badge variant="success">{t("synced")}</Badge>}
            </div>
            {canManage && (
              <select
                disabled={pending}
                defaultValue=""
                onChange={(e) => {
                  const memberId = e.target.value;
                  if (memberId) handleAssign(item.agendaItemId, memberId);
                  e.target.value = "";
                }}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
              >
                <option value="">{t("selectMember")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}