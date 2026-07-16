"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Plus, GripVertical, Save, Download, LayoutTemplate } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applyAgendaTemplate, saveMinute } from "@/actions/minutes";
import {
  saveDraftOffline,
  getUnsyncedDrafts,
  markDraftSynced,
} from "@/lib/offline";
import { MinuteWorkflowActions } from "./minute-workflow-actions";
import { MinuteAssistPanel } from "./minute-assist-panel";
import { MinuteAttachmentsPanel } from "./minute-attachments-panel";
import { MinuteAiPolishButton } from "./minute-ai-polish-button";
import { ContextualHintBanner } from "@/components/assistance/contextual-hint-banner";
import { GlossaryTerm } from "@/components/assistance/glossary-term";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  decisions: string;
  actions: string;
  responsible: string;
  dueDate: string;
  status: string;
}

interface MinuteData {
  id: string;
  title: string;
  status: string;
  reviewComment?: string | null;
  meeting: {
    date: Date | string;
    location?: string | null;
    presidedBy?: string | null;
    secretary?: string | null;
    type?: string;
  };
  agendaItems: AgendaItem[];
}

export function MinuteEditor({
  minute,
  clubId,
  pdfEnabled = true,
  pdfVisible = true,
  canSubmit = false,
  canApprove = false,
  canFinalize = false,
  presidentApprovalRequired = true,
  memberEmailCount = 0,
  highlightPostMeeting = false,
  minuteAiEnabled = false,
  minuteAiRemaining = 0,
}: {
  minute: MinuteData;
  clubId: string;
  pdfEnabled?: boolean;
  pdfVisible?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  canFinalize?: boolean;
  presidentApprovalRequired?: boolean;
  memberEmailCount?: number;
  highlightPostMeeting?: boolean;
  minuteAiEnabled?: boolean;
  minuteAiRemaining?: number;
}) {
  const t = useTranslations("minutes");
  const tAi = useTranslations("minutes.aiAssist");
  const tMeetings = useTranslations("meetings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;

  const [items, setItems] = useState<AgendaItem[]>(
    minute.agendaItems.length > 0
      ? minute.agendaItems
      : [{ id: "1", title: "Ouverture de la séance", description: "", decisions: "", actions: "", responsible: "", dueDate: "", status: "OPEN" }]
  );
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [status, setStatus] = useState(minute.status);
  const [, startTransition] = useTransition();
  const readOnly = ["FINALIZED", "ARCHIVED", "REVIEW"].includes(status);

  const syncAgendaItemIds = useCallback(
    (saved: Array<{ id: string; sortOrder: number }>) => {
      setItems((prev) =>
        prev.map((item, index) => ({
          ...item,
          id: saved[index]?.id ?? item.id,
        }))
      );
    },
    []
  );

  const doSave = useCallback(async () => {
    if (["FINALIZED", "ARCHIVED", "REVIEW"].includes(status)) return;
    setSaving(true);
    const payload = { agendaItems: items };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await saveDraftOffline(minute.id, clubId, payload);
      setIsOffline(true);
      setLastSaved(new Date());
      setSaving(false);
      return;
    }

    setIsOffline(false);
    const result = await saveMinute(minute.id, payload);
    if ("success" in result && result.success) {
      if (result.agendaItems?.length) {
        syncAgendaItemIds(result.agendaItems);
      }
      await markDraftSynced(minute.id);
      setLastSaved(new Date());
    }
    setSaving(false);
  }, [minute.id, clubId, items, status, syncAgendaItemIds]);

  const syncOfflineDrafts = useCallback(async () => {
    const drafts = await getUnsyncedDrafts();
    for (const draft of drafts) {
      if (draft.id !== minute.id) continue;
      const data = draft.data as { agendaItems: AgendaItem[] };
      const result = await saveMinute(draft.id, data);
      if ("success" in result && result.success) {
        await markDraftSynced(draft.id);
        if (data.agendaItems && result.agendaItems?.length) {
          setItems(
            data.agendaItems.map((item, index) => ({
              ...item,
              id: result.agendaItems?.[index]?.id ?? item.id,
            }))
          );
        } else if (data.agendaItems) {
          setItems(data.agendaItems);
        }
        setLastSaved(new Date());
        setIsOffline(false);
        startTransition(() => router.refresh());
      }
    }
  }, [minute.id, router, startTransition]);

  useEffect(() => {
    const timer = setInterval(doSave, 30000);
    return () => clearInterval(timer);
  }, [doSave]);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => {
      setIsOffline(false);
      void syncOfflineDrafts();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [syncOfflineDrafts]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), title: "", description: "", decisions: "", actions: "", responsible: "", dueDate: "", status: "OPEN" },
    ]);
  }

  function updateItem(id: string, field: keyof AgendaItem, value: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function itemsHaveContent(): boolean {
    return items.some(
      (item) =>
        item.description.trim() ||
        item.decisions.trim() ||
        item.actions.trim() ||
        item.responsible.trim() ||
        item.dueDate.trim()
    );
  }

  async function handleApplyTemplate() {
    if (readOnly) return;

    const confirmMsg =
      locale === "fr"
        ? itemsHaveContent()
          ? "Des points contiennent déjà du contenu. Remplacer par le modèle d'ordre du jour ?"
          : "Appliquer le modèle d'ordre du jour pour ce type de réunion ?"
        : itemsHaveContent()
          ? "Some items already have content. Replace with the agenda template?"
          : "Apply the agenda template for this meeting type?";

    if (!window.confirm(confirmMsg)) return;

    const result = await applyAgendaTemplate(minute.id, locale);
    if (result?.error) return;

    if (result.items) {
      setItems(
        result.items.map((item, i) => ({
          id: `${Date.now()}-${i}`,
          title: item.title,
          description: item.description ?? "",
          decisions: "",
          actions: "",
          responsible: "",
          dueDate: "",
          status: item.status ?? "OPEN",
        }))
      );
    }
    startTransition(() => router.refresh());
  }

  const meetingDate = new Date(minute.meeting.date);
  const statusLabel =
    status === "FINALIZED"
      ? t("finalized")
      : status === "REVIEW"
        ? t("inReview")
        : t("draft");

  return (
    <div className="space-y-6" data-assist="minute-editor-content">
      <ContextualHintBanner hintId="minute_editor_intro" />
      <ContextualHintBanner hintId="minute_editor_workflow" />
      <MinuteWorkflowActions
        minuteId={minute.id}
        status={status}
        canSubmit={canSubmit}
        canApprove={canApprove}
        canFinalize={canFinalize}
        reviewComment={minute.reviewComment}
        presidentApprovalRequired={presidentApprovalRequired}
        memberEmailCount={memberEmailCount}
        highlightPostMeeting={highlightPostMeeting}
      />

      <MinuteAssistPanel
        items={items}
        meetingType={minute.meeting.type ?? "STATUTORY"}
        locale={locale}
      />

      {minuteAiEnabled ? (
        <p className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
          {tAi("quotaHint", { remaining: minuteAiRemaining })}
        </p>
      ) : (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          {tAi("upgradeHint")}{" "}
          <Link href={`/${locale}/settings/subscription`} className="text-navy underline">
            {tAi("upgradeLink")}
          </Link>
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={status === "FINALIZED" ? "success" : status === "REVIEW" ? "default" : "warning"}>
            {statusLabel}
          </Badge>
          {isOffline ? (
            <span className="text-xs text-amber-600">{t("offlineDraft")}</span>
          ) : saving ? (
            <span className="text-xs text-gray-400">{t("autoSave")}...</span>
          ) : lastSaved ? (
            <span className="text-xs text-gray-400">{t("autoSave")} — {lastSaved.toLocaleTimeString()}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={doSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {tCommon("save")}
          </Button>
          {status === "FINALIZED" && pdfVisible ? (
            pdfEnabled ? (
              <a
                href={`/api/pdf/${minute.id}`}
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Download className="h-4 w-4" />
                {t("download")}
              </a>
            ) : (
              <Link
                href={`/${locale}/settings/subscription`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-amber-700")}
              >
                <Download className="h-4 w-4" />
                {locale === "fr" ? "PDF — changer d'offre" : "PDF — upgrade"}
              </Link>
            )
          ) : null}
        </div>
      </div>

      <MinuteAttachmentsPanel minuteId={minute.id} />

      <Card>
        <CardHeader><CardTitle>{minute.title}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{tMeetings("date")}</span>
            <p className="font-medium">{format(meetingDate, "d MMMM yyyy", { locale: dateLocale })}</p>
          </div>
          <div>
            <span className="text-gray-500">{tMeetings("location")}</span>
            <p className="font-medium">{minute.meeting.location}</p>
          </div>
          <div>
            <span className="text-gray-500">{tMeetings("presidedBy")}</span>
            <p className="font-medium">{minute.meeting.presidedBy}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900">
            {t("agenda")} — <GlossaryTerm term="minute">{locale === "fr" ? "compte-rendu" : "minutes record"}</GlossaryTerm>
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyTemplate}
              disabled={readOnly}
            >
              <LayoutTemplate className="h-4 w-4" />
              {locale === "fr" ? "Appliquer le modèle" : "Apply template"}
            </Button>
            <Button variant="outline" size="sm" onClick={addItem} disabled={readOnly}>
              <Plus className="h-4 w-4" />
              {tMeetings("addAgendaItem")}
            </Button>
          </div>
        </div>

        <ContextualHintBanner hintId="minute_editor_agenda" />

        {items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                <span className="text-xs font-medium text-gray-400">{t("agendaItem")} {index + 1}</span>
              </div>
              <Input
                label={t("agendaItem")}
                value={item.title}
                onChange={(e) => updateItem(item.id, "title", e.target.value)}
                placeholder="Titre du point"
                disabled={readOnly}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {tAi("notesLabel")}
                </label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  rows={3}
                  disabled={readOnly}
                  placeholder={tAi("notesPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-60"
                />
                {minuteAiEnabled && !readOnly && (
                  <MinuteAiPolishButton
                    minuteId={minute.id}
                    agendaItemId={item.id}
                    agendaTitle={item.title}
                    rawNotes={item.description}
                    existingDecisions={item.decisions}
                    existingActions={item.actions}
                    existingResponsible={item.responsible}
                    existingDueDate={item.dueDate}
                    onPolished={(polished) => {
                      setItems((prev) =>
                        prev.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                description: polished.description,
                                decisions: polished.decisions || row.decisions,
                                actions: polished.actions || row.actions,
                                responsible: polished.responsible || row.responsible,
                                dueDate: polished.dueDate || row.dueDate,
                              }
                            : row
                        )
                      );
                    }}
                  />
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{t("decisions")}</label>
                  <textarea
                    value={item.decisions}
                    onChange={(e) => updateItem(item.id, "decisions", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{t("actions")}</label>
                  <textarea
                    value={item.actions}
                    onChange={(e) => updateItem(item.id, "actions", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input label={t("responsible")} value={item.responsible} onChange={(e) => updateItem(item.id, "responsible", e.target.value)} />
                <Input label={t("dueDate")} type="date" value={item.dueDate} onChange={(e) => updateItem(item.id, "dueDate", e.target.value)} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{t("status")}</label>
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(item.id, "status", e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    <option value="OPEN">Ouvert</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="DEFERRED">Reporté</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}