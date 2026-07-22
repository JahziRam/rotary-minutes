"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Plus,
  GripVertical,
  Save,
  Download,
  LayoutTemplate,
  Trash2,
} from "lucide-react";
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
import { toLocalDateInputValue } from "@/lib/local-date";
import {
  OfficerSelect,
  type OfficerMemberOption,
} from "@/components/meetings/officer-select";
import { MinuteWorkflowActions } from "./minute-workflow-actions";
import { MinuteAssistPanel } from "./minute-assist-panel";
import { MinuteAttachmentsPanel } from "./minute-attachments-panel";
import { MinuteAiPolishButton } from "./minute-ai-polish-button";
import { ContextualHintBanner } from "@/components/assistance/contextual-hint-banner";
import { GlossaryTerm } from "@/components/assistance/glossary-term";

/** Delay after last keystroke before background autosave (ms). */
const AUTOSAVE_DEBOUNCE_MS = 1800;
/** Safety net interval autosave (ms). */
const AUTOSAVE_INTERVAL_MS = 45_000;

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

interface MeetingDetails {
  date: Date | string;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  presidedBy?: string | null;
  secretary?: string | null;
  type?: string;
}

interface MinuteData {
  id: string;
  title: string;
  status: string;
  reviewComment?: string | null;
  meeting: MeetingDetails;
  agendaItems: AgendaItem[];
}

export function MinuteEditor({
  minute,
  clubId,
  members = [],
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
  canOverrideLock = false,
  canDeleteAgendaItems = false,
}: {
  minute: MinuteData;
  clubId: string;
  members?: OfficerMemberOption[];
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
  /** President / club admin may edit FINALIZED, ARCHIVED or REVIEW minutes. */
  canOverrideLock?: boolean;
  /** President, secretary, club admin, super admin may remove agenda items. */
  canDeleteAgendaItems?: boolean;
}) {
  const t = useTranslations("minutes");
  const tAi = useTranslations("minutes.aiAssist");
  const tMeetings = useTranslations("meetings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<AgendaItem[]>(
    minute.agendaItems.length > 0
      ? minute.agendaItems
      : [{ id: "1", title: "Ouverture de la séance", description: "", decisions: "", actions: "", responsible: "", dueDate: "", status: "OPEN" }]
  );
  const [title, setTitle] = useState(minute.title);
  const [meetingDate, setMeetingDate] = useState(
    toLocalDateInputValue(minute.meeting.date)
  );
  const [location, setLocation] = useState(minute.meeting.location ?? "");
  const [startTime, setStartTime] = useState(minute.meeting.startTime ?? "");
  const [endTime, setEndTime] = useState(minute.meeting.endTime ?? "");
  const [presidedBy, setPresidedBy] = useState(minute.meeting.presidedBy ?? "");
  const [secretary, setSecretary] = useState(minute.meeting.secretary ?? "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [status, setStatus] = useState(minute.status);
  const [, startTransition] = useTransition();
  const isLockedStatus = ["FINALIZED", "ARCHIVED", "REVIEW"].includes(status);
  const readOnly = isLockedStatus && !canOverrideLock;
  const allowDeleteAgenda = canDeleteAgendaItems && !readOnly;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const skipDebounceRef = useRef(true); // skip first mount
  const itemsRef = useRef(items);
  const metaRef = useRef({
    title,
    meetingDate,
    location,
    startTime,
    endTime,
    presidedBy,
    secretary,
    status,
    canOverrideLock,
  });
  itemsRef.current = items;
  metaRef.current = {
    title,
    meetingDate,
    location,
    startTime,
    endTime,
    presidedBy,
    secretary,
    status,
    canOverrideLock,
  };

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

  const doSave = useCallback(
    async (opts?: { quiet?: boolean }) => {
      const quiet = !!opts?.quiet;
      const meta = metaRef.current;
      if (
        ["FINALIZED", "ARCHIVED", "REVIEW"].includes(meta.status) &&
        !meta.canOverrideLock
      ) {
        return;
      }
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setSaveError(null);

      const payload = {
        title: meta.title,
        agendaItems: itemsRef.current,
        meeting: {
          date: meta.meetingDate,
          location: meta.location,
          startTime: meta.startTime,
          endTime: meta.endTime,
          presidedBy: meta.presidedBy,
          secretary: meta.secretary,
        },
      };

      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await saveDraftOffline(minute.id, clubId, payload);
          setIsOffline(true);
          setLastSaved(new Date());
          return;
        }

        setIsOffline(false);
        const result = await saveMinute(minute.id, payload, { quiet });
        if ("success" in result && result.success) {
          if (result.agendaItems?.length) {
            syncAgendaItemIds(result.agendaItems);
          }
          await markDraftSynced(minute.id);
          setLastSaved(new Date());
        } else if (result && "error" in result && result.error) {
          setSaveError(
            locale === "fr"
              ? "Échec de la sauvegarde — réessayez"
              : locale === "es"
                ? "Error al guardar — reintente"
                : "Save failed — try again"
          );
        }
      } catch {
        setSaveError(
          locale === "fr"
            ? "Échec de la sauvegarde — réessayez"
            : locale === "es"
              ? "Error al guardar — reintente"
              : "Save failed — try again"
        );
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [minute.id, clubId, locale, syncAgendaItemIds]
  );

  const scheduleAutosave = useCallback(() => {
    if (readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSave({ quiet: true });
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [doSave, readOnly]);

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

  // Debounced autosave whenever content changes (after first paint).
  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    if (readOnly) return;
    scheduleAutosave();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    items,
    title,
    meetingDate,
    location,
    startTime,
    endTime,
    presidedBy,
    secretary,
    scheduleAutosave,
    readOnly,
  ]);

  // Periodic safety-net autosave.
  useEffect(() => {
    if (readOnly) return;
    const timer = setInterval(() => {
      void doSave({ quiet: true });
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [doSave, readOnly]);

  // Flush pending autosave on leave / tab hide.
  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (!readOnly) void doSave({ quiet: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doSave, readOnly]);

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
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        decisions: "",
        actions: "",
        responsible: "",
        dueDate: "",
        status: "OPEN",
      },
    ]);
  }

  function removeItem(id: string) {
    if (!allowDeleteAgenda) return;
    if (items.length <= 1) return;
    const confirmMsg =
      locale === "fr"
        ? "Supprimer ce point d'ordre du jour ?"
        : locale === "es"
          ? "¿Eliminar este punto del orden del día?"
          : "Remove this agenda item?";
    if (!window.confirm(confirmMsg)) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof AgendaItem, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  /** Immediate quiet save after leaving an agenda field (blur). */
  function handleAgendaFieldBlur() {
    if (readOnly) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void doSave({ quiet: true });
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

  const statusLabel =
    status === "FINALIZED"
      ? t("finalized")
      : status === "REVIEW"
        ? t("inReview")
        : status === "ARCHIVED"
          ? t("archived")
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={status === "FINALIZED" ? "success" : status === "REVIEW" ? "default" : "warning"}>
            {statusLabel}
          </Badge>
          {isLockedStatus && canOverrideLock && !readOnly ? (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5">
              {locale === "fr"
                ? "Modification exceptionnelle (président / admin)"
                : locale === "es"
                  ? "Edición excepcional (presidente / admin)"
                  : "Override edit (president / admin)"}
            </span>
          ) : null}
          {isOffline ? (
            <span className="text-xs text-amber-600">{t("offlineDraft")}</span>
          ) : saveError ? (
            <span className="text-xs text-red-600">{saveError}</span>
          ) : saving ? (
            <span className="text-xs text-gray-400">{t("autoSave")}…</span>
          ) : lastSaved ? (
            <span className="text-xs text-gray-400">
              {t("autoSave")} — {lastSaved.toLocaleTimeString()}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{t("autoSaveHint")}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void doSave({ quiet: false })}
            disabled={saving || readOnly}
          >
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
        <CardHeader>
          <CardTitle>
            {locale === "fr"
              ? "Détails de la réunion et du PV"
              : locale === "es"
                ? "Detalles de la reunión y del acta"
                : "Meeting and minutes details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={locale === "fr" ? "Titre du PV" : locale === "es" ? "Título del acta" : "Minutes title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label={tMeetings("date")}
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              disabled={readOnly}
            />
            <Input
              label={tMeetings("startTime")}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={readOnly}
            />
            <Input
              label={tMeetings("endTime")}
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={readOnly}
            />
            <Input
              label={tMeetings("location")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={readOnly}
            />
            <OfficerSelect
              id="minute-presided-by"
              label={tMeetings("presidedBy")}
              value={presidedBy}
              onChange={setPresidedBy}
              members={members}
              disabled={readOnly}
            />
            <OfficerSelect
              id="minute-secretary"
              label={tMeetings("secretary")}
              value={secretary}
              onChange={setSecretary}
              members={members}
              disabled={readOnly}
            />
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
                <span className="text-xs font-medium text-gray-400">
                  {t("agendaItem")} {index + 1}
                </span>
                <div className="flex-1" />
                {allowDeleteAgenda && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={tMeetings("removeAgendaItem")}
                    title={tMeetings("removeAgendaItem")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Input
                label={t("agendaItem")}
                value={item.title}
                onChange={(e) => updateItem(item.id, "title", e.target.value)}
                onBlur={handleAgendaFieldBlur}
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
                  onBlur={handleAgendaFieldBlur}
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
                      // Persist AI polish quickly in background.
                      setTimeout(() => void doSave({ quiet: true }), 100);
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
                    onBlur={handleAgendaFieldBlur}
                    rows={2}
                    disabled={readOnly}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{t("actions")}</label>
                  <textarea
                    value={item.actions}
                    onChange={(e) => updateItem(item.id, "actions", e.target.value)}
                    onBlur={handleAgendaFieldBlur}
                    rows={2}
                    disabled={readOnly}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label={t("responsible")}
                  value={item.responsible}
                  onChange={(e) => updateItem(item.id, "responsible", e.target.value)}
                  onBlur={handleAgendaFieldBlur}
                  disabled={readOnly}
                />
                <Input
                  label={t("dueDate")}
                  type="date"
                  value={item.dueDate}
                  onChange={(e) => updateItem(item.id, "dueDate", e.target.value)}
                  onBlur={handleAgendaFieldBlur}
                  disabled={readOnly}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{t("status")}</label>
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(item.id, "status", e.target.value)}
                    onBlur={handleAgendaFieldBlur}
                    disabled={readOnly}
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:opacity-60"
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