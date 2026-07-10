"use client";

import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { pickDemoLocale } from "@/lib/demo-i18n";
import { useTranslations } from "next-intl";
import {
  Calendar,
  FileText,
  Users,
  Mail,
  BarChart3,
  Map,
  Bell,
  Settings,
  LifeBuoy,
  Lock,
  Eye,
  Plus,
  CheckSquare,
  Send,
  Download,
  QrCode,
  WifiOff,
  Globe,
  CalendarPlus,
  FileSpreadsheet,
  LayoutTemplate,
  Coins,
  History,
  Wallet,
  CalendarRange,
  Ticket,
  UserCircle,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Check,
  X,
  Building2,
  User,
  Search,
  Clock,
  Percent,
  Share2,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_CLUB,
  DEMO_EMAIL_CONTACTS,
  DEMO_PORTAL,
  DEMO_PUBLIC_CLUBS,
  DEMO_STATS,
  DEMO_SUBSCRIPTION,
  DEMO_TREASURY,
  getDemoActions,
  getDemoCalendarEvents,
  getDemoClubEvents,
  getDemoData,
  getDemoDistrictClubs,
  getDemoDocuments,
  getDemoDocumentFolders,
  getDemoDues,
  getDemoEmailCampaigns,
  getDemoEmailTemplates,
  getDemoMandates,
  getDemoMeetings,
  getDemoMembers,
  getDemoMinutes,
  getDemoTreasuryEntries,
} from "@/lib/demo-data";
import { MAX_UPLOAD_FILES_PER_BATCH } from "@/lib/upload-limits";
import { DemoLockedButton, DemoFeaturePill } from "./demo-ui";

export type DemoPanelProps = {
  locale: string;
  onPreviewMinute: () => void;
  onLiveMeeting: () => void;
  onMinuteEditor: () => void;
  onRegistration?: () => void;
};

function DemoPendingJoinRequestsCard({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const data = getDemoData(locale);
  const requests = data.pendingJoinRequests;

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-amber-700" />
          {t("pendingJoinTitle", { count: requests.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white border border-amber-100"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {req.firstName} {req.lastName}
              </p>
              <p className="text-sm text-gray-500 truncate">{req.email}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <DemoLockedButton label={t("rejectJoin")} icon={X} />
              <DemoLockedButton label={t("approveJoin")} icon={Check} variant="gold" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DemoDashboardPanel({
  locale,
  onPreviewMinute,
  onLiveMeeting,
  onRegistration,
}: DemoPanelProps) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const data = getDemoData(locale);
  const meetings = getDemoMeetings(locale);
  const minutes = getDemoMinutes(locale);
  const calendarEvents = getDemoCalendarEvents(locale);
  const clubEvents = getDemoClubEvents(locale);
  const nextMeeting = meetings[2];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoFeaturePill label="PDF + QR" />
        <DemoFeaturePill label={L("Réunion live", "Live meeting", "Reunión en vivo")} />
        <DemoFeaturePill label={L("Inscription membre/club", "Member/club signup", "Registro miembro/club")} />
        <DemoFeaturePill label={L("Rotaract −15 %", "Rotaract −15%", "Rotaract −15 %")} />
        <DemoFeaturePill label={L("Trésorerie", "Treasury", "Tesorería")} />
        <DemoFeaturePill label={L("Upload 5 Mo", "5 MB uploads", "Subida 5 MB")} />
        <DemoFeaturePill label={L("FR / EN", "FR / EN", "ES / EN / FR")} />
      </div>

      {onRegistration && (
        <button
          type="button"
          onClick={onRegistration}
          className="w-full text-left rounded-xl border border-navy/15 bg-gradient-to-r from-navy/5 to-gold/10 p-4 hover:border-navy/25 transition-colors"
        >
          <p className="font-semibold text-navy text-sm">{t("registrationTeaserTitle")}</p>
          <p className="text-xs text-gray-600 mt-1">{t("registrationTeaserHint")}</p>
        </button>
      )}

      <DemoPendingJoinRequestsCard locale={locale} />

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("newMeeting")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("newMinute")} icon={FileText} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("attendanceRate"), value: `${DEMO_STATS.annualAttendance}%`, icon: Users },
          { label: t("meetingsMonth"), value: DEMO_STATS.meetingsThisMonth, icon: Calendar },
          { label: t("openActions"), value: DEMO_STATS.openActions, icon: CheckSquare },
          { label: t("scheduledEmails"), value: DEMO_STATS.scheduledEmails, icon: Mail },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <Icon className="h-6 w-6 text-navy/60 shrink-0" />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("nextMeeting")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-navy/5">
              <div className="h-12 w-12 rounded-lg bg-navy text-white flex flex-col items-center justify-center text-xs font-bold">
                <span>{format(nextMeeting.date, "dd", { locale: dateLocale })}</span>
                <span className="text-[10px] uppercase">{format(nextMeeting.date, "MMM", { locale: dateLocale })}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{format(nextMeeting.date, "PPP", { locale: dateLocale })}</p>
                <p className="text-sm text-gray-500">{nextMeeting.location} · {nextMeeting.startTime}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLiveMeeting}
              className="flex w-full items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium border border-gold/40 bg-gold/10 text-navy hover:bg-gold/20 transition-colors"
            >
              <Eye className="h-4 w-4" />
              {t("viewLiveMode")}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("recentMinutes")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {minutes.slice(0, 3).map((pv) => (
              <button
                key={pv.id}
                type="button"
                onClick={onPreviewMinute}
                className="w-full flex items-center justify-between gap-2 rounded-lg p-3 hover:bg-gray-50 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pv.title}</p>
                  <p className="text-xs text-gray-400">{pv.author}</p>
                </div>
                <Badge variant={pv.status === "FINALIZED" ? "success" : pv.status === "REVIEW" ? "warning" : "muted"}>
                  {pv.status}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("openActions")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.openActions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-gray-50 pb-2 last:border-0">
                <span className="font-medium text-gray-800">{a.title}</span>
                <span className="text-gray-500">{a.responsible} · {a.due}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("recentNotifications")}
          </CardTitle>
          <Badge variant="gold">{DEMO_STATS.notificationCount}</Badge>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          {data.notifications.slice(0, 3).map((n) => (
            <div key={n.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-gray-900 text-sm">{n.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{n.time}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">{L("Trésorerie", "Treasury", "Tesorería")}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-bold text-navy">{DEMO_TREASURY.balance.toLocaleString()} {DEMO_TREASURY.currency}</p>
            <p className="text-gray-500">{L("Solde club", "Club balance", "Saldo del club")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">{L("Prochain événement", "Next event", "Próximo evento")}</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{clubEvents[0].title}</p>
            <p className="text-gray-500">{clubEvents[0].registrations}/{clubEvents[0].capacity} {L("inscrits", "registered", "inscritos")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">{L("Calendrier", "Calendar", "Calendario")}</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-600">
            {calendarEvents.slice(0, 2).map((e) => (
              <p key={e.id} className="truncate">{e.date} — {e.title}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DemoNotificationsPanel({ locale }: { locale: string }) {
  const data = getDemoData(locale);
  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
        <Badge variant="gold">{DEMO_STATS.notificationCount}</Badge>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {data.notifications.map((n) => (
          <div key={n.id} className="py-3 first:pt-0">
            <p className="font-medium text-gray-900 text-sm">{n.title}</p>
            <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
            <p className="text-xs text-gray-400 mt-1">{n.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DemoMeetingsPanel({ locale, onLiveMeeting }: DemoPanelProps) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("newMeeting")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("importAgenda")} />
        <DemoLockedButton label={t("exportIcs")} icon={CalendarPlus} />
        <DemoLockedButton label={t("googleCalendar")} icon={Calendar} />
      </div>
      {getDemoMeetings(locale).map((m) => (
        <Card key={m.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{m.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(m.date, "PPP", { locale: dateLocale })} · {m.location}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {m.presidedBy} · {m.attendanceRate > 0 ? `${m.attendanceRate}%` : "—"}
                </p>
              </div>
              {m.attendanceRate === 0 ? (
                <button
                  type="button"
                  onClick={onLiveMeeting}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
                >
                  <Eye className="h-4 w-4" />
                  {t("viewLiveMode")}
                </button>
              ) : (
                <Badge variant="success">{L("Terminée", "Completed", "Finalizada")}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
              <DemoLockedButton label={t("exportIcs")} icon={FileSpreadsheet} />
              <DemoLockedButton label={t("googleCalendar")} icon={CalendarPlus} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DemoMinutesPanel({ locale, onPreviewMinute, onMinuteEditor }: DemoPanelProps) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("newMinute")} icon={Plus} variant="gold" />
        <button
          type="button"
          onClick={onPreviewMinute}
          className="inline-flex items-center gap-2 rounded-lg border border-navy/15 bg-navy/5 px-4 py-2 text-sm font-medium text-navy hover:bg-navy/10"
        >
          <Download className="h-4 w-4" />
          {t("previewPdf")}
        </button>
        <button
          type="button"
          onClick={onPreviewMinute}
          className="inline-flex items-center gap-2 rounded-lg border border-navy/15 px-4 py-2 text-sm font-medium text-navy hover:bg-navy/10"
        >
          <QrCode className="h-4 w-4" />
          {t("previewQr")}
        </button>
      </div>

      {getDemoMinutes(locale).map((pv) => (
        <Card key={pv.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">{pv.title}</p>
                <p className="text-sm text-gray-500">{format(pv.date, "PPP", { locale: dateLocale })} · {pv.author}</p>
              </div>
              <Badge variant={pv.status === "FINALIZED" ? "success" : pv.status === "REVIEW" ? "warning" : "muted"}>
                {pv.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onPreviewMinute} className="text-sm font-medium text-navy hover:underline inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />{t("previewMinute")}
              </button>
              {pv.status === "DRAFT" && (
                <button type="button" onClick={onMinuteEditor} className="text-sm font-medium text-gray-600 hover:underline">
                  {t("viewEditor")}
                </button>
              )}
              {pv.status === "REVIEW" && (
                <DemoLockedButton label={L("Valider", "Approve", "Aprobar")} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DemoEmailsPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {["compose", "templates", "contacts"].map((s) => (
          <span
            key={s}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              s === "templates" ? "bg-navy text-white" : "text-gray-500"
            }`}
          >
            {t(`emailTab.${s}`)}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("composeEmail")} icon={Send} variant="gold" />
        <DemoLockedButton label={t("newTemplate")} icon={Plus} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("emailTemplates")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {getDemoEmailTemplates(locale).map((tpl) => (
            <div key={tpl.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium text-sm">{tpl.name}</p>
                <p className="text-xs text-gray-500">{tpl.subject}</p>
              </div>
              <span className="text-xs text-gray-400">{tpl.uses} {L("envois", "sends", "envíos")}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("emailCampaigns")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {getDemoEmailCampaigns(locale).map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.recipients} {L("destinataires", "recipients", "destinatarios")}</p>
              </div>
              <Badge variant={c.status === "SENT" ? "success" : "warning"}>{c.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("emailPreview")}</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden text-sm">
            <div className="bg-navy/5 px-4 py-2 border-b font-medium">{L("Convocation réunion", "Meeting invitation", "Convocatoria de reunión")}</div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-8 w-8 rounded-full bg-navy text-gold text-[10px] font-bold flex items-center justify-center">RC</div>
                <span className="font-semibold">{DEMO_CLUB.name}</span>
              </div>
              <p className="text-gray-700">
                {L(
                  "Bonjour {{memberName}}, vous êtes convié(e) à la réunion du {{meetingDate}}.",
                  "Hello {{memberName}}, you are invited to the meeting on {{meetingDate}}.",
                  "Hola {{memberName}}, está convocado(a) a la reunión del {{meetingDate}}."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoMembersPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <div className="space-y-4">
      <DemoPendingJoinRequestsCard locale={locale} />

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("addMember")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("importMembers")} />
      </div>

      <Card className="border-gold/20 bg-gold/5">
        <CardContent className="py-3 text-sm">
          🎂 {L("Anniversaire cette semaine : Camille Petit (12 mars)", "Birthday this week: Camille Petit (Mar 12)", "Cumpleaños esta semana: Camille Petit (12 mar)")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("mandates")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {getDemoMandates(locale).map((m) => (
            <div key={m.role} className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">{m.role}</p>
              <p className="font-semibold text-sm mt-1">{m.name}</p>
              <p className="text-[10px] text-gray-400">{m.period}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("memberList")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-100">
            {getDemoMembers(locale).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center text-sm font-semibold text-navy">
                  {m.firstName[0]}{m.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-sm text-gray-500">{m.position}</p>
                </div>
                <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoStatisticsPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const data = getDemoData(locale);
  const max = Math.max(...data.months.map((m) => m.rate));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: t("attendanceRate"), value: `${DEMO_STATS.annualAttendance}%` },
          { label: t("meetings"), value: DEMO_STATS.meetingsCount },
          { label: t("members"), value: DEMO_CLUB.memberCount },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-navy">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />{t("attendanceChart")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-36">
            {data.months.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-navy">{m.rate}%</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-navy to-navy-light"
                  style={{ height: `${(m.rate / max) * 100}%`, minHeight: 8 }}
                />
                <span className="text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DemoLockedButton label={t("exportStats")} icon={Download} />
    </div>
  );
}

export function DemoDistrictPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <div className="space-y-4">
      <Card className="bg-navy/5 border-navy/10">
        <CardContent className="py-4">
          <p className="text-sm text-gray-600">
            {L(
              `Vue gouverneur — District ${DEMO_CLUB.district} · Accès lecture seule aux PV finalisés`,
              `Governor view — District ${DEMO_CLUB.district} · Read-only access to finalized minutes`,
              `Vista del gobernador — Distrito ${DEMO_CLUB.district} · Acceso de solo lectura a actas finalizadas`
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Map className="h-4 w-4" />{t("districtBenchmark")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">{L("Club", "Club", "Club")}</th>
                <th className="pb-2 font-medium">{t("members")}</th>
                <th className="pb-2 font-medium">{t("attendanceRate")}</th>
                <th className="pb-2 font-medium">{t("minutes")}</th>
              </tr>
            </thead>
            <tbody>
              {getDemoDistrictClubs(locale).map((c) => (
                <tr key={c.name} className={`border-b border-gray-50 ${"isAvg" in c && c.isAvg ? "bg-gold/5 font-medium" : ""}`}>
                  <td className="py-2.5">{c.name}</td>
                  <td className="py-2.5">{c.members}</td>
                  <td className="py-2.5">{c.attendance}%</td>
                  <td className="py-2.5">{c.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoSettingsPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />{t("clubSettings")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{L("Logo du club", "Club logo", "Logo del club")}</p>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-navy flex items-center justify-center text-gold font-bold text-lg">RC</div>
              <DemoLockedButton label={L("Choisir une image", "Upload image", "Subir imagen")} />
            </div>
          </div>
          {[
            { label: L("Nom du club", "Club name", "Nombre del club"), value: DEMO_CLUB.name },
            { label: L("Type de club", "Club type", "Tipo de club"), value: L("Club Rotary", "Rotary club", "Club Rotary") },
            { label: L("District", "District", "Distrito"), value: DEMO_CLUB.district },
            { label: L("Ville", "City", "Ciudad"), value: DEMO_CLUB.city },
            { label: L("Lieu de réunion", "Meeting location", "Lugar de reunión"), value: DEMO_CLUB.meetingLocation },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-medium text-gray-500">{f.label}</label>
              <div className="mt-1 h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-700">
                {f.value}
              </div>
            </div>
          ))}
          <DemoLockedButton label={t("saveSettings")} variant="gold" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center gap-3 text-sm text-gray-600">
          <WifiOff className="h-5 w-5 text-navy" />
          {t("offlineFeature")}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center gap-3 text-sm text-gray-600">
          <Globe className="h-5 w-5 text-navy" />
          {t("bilingualFeature")}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center gap-3 text-sm text-gray-600">
          <QrCode className="h-5 w-5 text-navy" />
          {L(
            "PWA : check-in QR hors ligne, consultation PV sans connexion",
            "PWA: offline QR check-in, browse minutes offline",
            "PWA: registro QR sin conexión, consulta de actas sin conexión"
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center gap-3 text-sm text-gray-600">
          <FileSpreadsheet className="h-5 w-5 text-navy" />
          {L(
            "Intégrations : export comptable CSV/OFX, webhooks",
            "Integrations: CSV/OFX accounting export, webhooks",
            "Integraciones: exportación contable CSV/OFX, webhooks"
          )}
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-medium text-emerald-900 flex items-center gap-2">
            <Percent className="h-4 w-4" />
            {t("rotaractDiscountTitle")}
          </p>
          <p className="text-xs text-emerald-800">{t("rotaractDiscountHint", { percent: DEMO_SUBSCRIPTION.rotaractDiscountPercent })}</p>
          <p className="text-xs text-gray-600">
            {L("Essai en cours", "Trial in progress", "Prueba en curso")} — {DEMO_SUBSCRIPTION.trialDaysLeft} {L("jours restants", "days left", "días restantes")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoSupportPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4" />{t("support")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">{L("Sujet", "Subject", "Asunto")}</label>
          <div className="mt-1 h-10 rounded-lg border bg-gray-50 px-3 flex items-center text-sm text-gray-400">
            {L("Question sur l'export PDF", "Question about PDF export", "Pregunta sobre la exportación PDF")}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">{L("Message", "Message", "Mensaje")}</label>
          <div className="mt-1 h-24 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-400">
            {L(
              "Comment authentifier un PV avec le QR code ?",
              "How do I authenticate minutes with the QR code?",
              "¿Cómo autenticar un acta con el código QR?"
            )}
          </div>
        </div>
        <DemoLockedButton label={t("sendTicket")} variant="gold" />
      </CardContent>
    </Card>
  );
}

export function DemoMinuteEditorPanel({ locale, onPreviewMinute }: { locale: string; onPreviewMinute: () => void }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const draft = getDemoMinutes(locale).find((m) => m.status === "DRAFT")!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">{draft.title}</h2>
          <Badge variant="muted" className="mt-1">{L("Brouillon", "Draft", "Borrador")}</Badge>
        </div>
        <button type="button" onClick={onPreviewMinute} className="text-sm text-navy font-medium hover:underline">
          {t("previewMinute")}
        </button>
      </div>

      {[
        {
          title: L("Ouverture & quorum", "Opening & quorum", "Apertura y quórum"),
          content: L("28 membres présents, quorum atteint.", "28 members present, quorum reached.", "28 miembros presentes, quórum alcanzado."),
        },
        {
          title: L("Communications", "Communications", "Comunicaciones"),
          content: L("Présentation du projet humanitaire Madagascar.", "Humanitarian project Madagascar presentation.", "Presentación del proyecto humanitario Madagascar."),
        },
        { title: L("Décisions", "Decisions", "Decisiones"), content: "" },
      ].map((item, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">{i + 1}. {item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg border p-3 text-sm min-h-[60px] ${item.content ? "text-gray-700 bg-white" : "text-gray-400 bg-gray-50 border-dashed"}`}>
              {item.content || L("Cliquez pour rédiger… (lecture seule)", "Click to write… (read-only)", "Haga clic para redactar… (solo lectura)")}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("applyTemplate")} icon={LayoutTemplate} variant="gold" />
        <DemoLockedButton label={L("Enregistrer", "Save", "Guardar")} />
        <DemoLockedButton label={L("Soumettre en révision", "Submit for review", "Enviar a revisión")} />
        <DemoLockedButton label={L("Finaliser", "Finalize", "Finalizar")} />
      </div>
    </div>
  );
}

export function DemoDuesPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const dues = getDemoDues(locale);
  const paid = dues.filter((d) => d.status === "PAID").length;
  const pending = dues.filter((d) => d.status === "PENDING").length;
  const overdue = dues.filter((d) => d.status === "OVERDUE").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("recordPayment")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("sendDuesReminder")} icon={Mail} />
        <DemoLockedButton label={L("Envoyer facture PDF", "Send invoice PDF", "Enviar factura PDF")} icon={Mail} />
        <DemoLockedButton label={L("Envoyer reçu PDF", "Send receipt PDF", "Enviar recibo PDF")} icon={FileText} />
        <DemoLockedButton label={L("Historique par email", "Email history", "Historial por correo")} icon={History} />
        <DemoLockedButton label={t("exportDues")} icon={Download} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("duesPaid"), value: paid },
          { label: t("duesPending"), value: pending },
          { label: t("duesOverdue"), value: overdue },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-navy">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" />
            {t("duesTable")} — {DEMO_CLUB.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">{L("Membre", "Member", "Miembro")}</th>
                <th className="pb-2 font-medium">{L("Mode", "Plan", "Modalidad")}</th>
                <th className="pb-2 font-medium">{t("fiscalYear")}</th>
                <th className="pb-2 font-medium">{t("duesAmount")}</th>
                <th className="pb-2 font-medium">{t("duesDueDate")}</th>
                <th className="pb-2 font-medium">{L("Statut", "Status", "Estado")}</th>
              </tr>
            </thead>
            <tbody>
              {dues.map((d) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-800">{d.member}</td>
                  <td className="py-2.5 text-xs">
                    {d.plan === "MONTHLY" ? L("Mensuel", "Monthly", "Mensual") : L("Annuel", "Annual", "Anual")}
                    {"periodLabel" in d && d.periodLabel ? ` · ${d.periodLabel}` : ""}
                  </td>
                  <td className="py-2.5">{d.fiscalYear}</td>
                  <td className="py-2.5">{d.amount} {d.currency}</td>
                  <td className="py-2.5">{d.dueDateLabel}</td>
                  <td className="py-2.5">
                    <Badge
                      variant={
                        d.status === "PAID" ? "success" : d.status === "OVERDUE" ? "warning" : "muted"
                      }
                    >
                      {d.statusLabel}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoTreasuryPanel({ locale }: { locale: string }) {
  const tDemo = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const t = DEMO_TREASURY;
  return (
    <div className="space-y-4">
      <Card className="border-dashed border-gray-200">
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">{tDemo("treasuryImportTitle")}</p>
          <p className="text-xs text-gray-500">{tDemo("uploadLimitsHint")}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <DemoLockedButton label={tDemo("downloadImportTemplate")} icon={Download} />
            <DemoLockedButton label={tDemo("importTreasuryFile")} icon={FileSpreadsheet} variant="gold" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={L("Ajouter une écriture", "Add entry", "Añadir asiento")} icon={Plus} variant="gold" />
        <DemoLockedButton label={L("Rapport PDF trésorier", "Treasurer PDF report", "Informe PDF del tesorero")} icon={Download} />
        <DemoLockedButton label={L("Exporter CSV", "Export CSV", "Exportar CSV")} icon={FileSpreadsheet} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: L("Recettes", "Income", "Ingresos"), value: t.income, icon: TrendingUp },
          { label: L("Dépenses", "Expenses", "Gastos"), value: t.expenses, icon: TrendingDown },
          { label: L("Solde", "Balance", "Saldo"), value: t.balance, icon: Wallet },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-navy/60" />
              <div>
                <p className="text-lg font-bold">{value.toLocaleString()} {t.currency}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{L("Écritures récentes", "Recent entries", "Asientos recientes")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {getDemoTreasuryEntries(locale).map((e) => (
            <div key={e.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
              <span>{e.label}</span>
              <span className={e.type === "INCOME" ? "text-emerald-600" : "text-red-600"}>
                {e.type === "INCOME" ? "+" : "-"}{e.amount} {t.currency}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoActionsPanel({ locale }: { locale: string }) {
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={L("Nouvelle action", "New action", "Nueva acción")} icon={Plus} variant="gold" />
        <DemoLockedButton label={L("Exporter", "Export", "Exportar")} icon={Download} />
      </div>
      <Card>
        <CardContent className="divide-y divide-gray-50">
          {getDemoActions(locale).map((a) => (
            <div key={a.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-gray-500">{a.responsible} · {a.due}</p>
              </div>
              <Badge variant={a.status === "COMPLETED" ? "success" : a.status === "IN_PROGRESS" ? "warning" : "muted"}>
                {a.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoCalendarPanel({ locale }: { locale: string }) {
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={L("Exporter ICS", "Export ICS", "Exportar ICS")} icon={CalendarPlus} />
        <DemoLockedButton label={L("Ajouter note", "Add note", "Añadir nota")} icon={Plus} variant="gold" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{L("Juillet 2026", "July 2026", "Julio 2026")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {getDemoCalendarEvents(locale).map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-sm">
              <span className={`h-2 w-2 rounded-full ${e.color}`} />
              <span className="text-gray-500 w-24 shrink-0">{e.date}</span>
              <span className="font-medium">{e.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoEventsPanel({ locale }: { locale: string }) {
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  return (
    <div className="space-y-4">
      <DemoLockedButton label={L("Créer un événement", "Create event", "Crear evento")} icon={Plus} variant="gold" />
      <div className="grid gap-4 sm:grid-cols-2">
        {getDemoClubEvents(locale).map((ev) => (
          <Card key={ev.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ev.title}</CardTitle>
              <p className="text-xs text-gray-500">{ev.date} · {ev.location}</p>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{ev.registrations}/{ev.capacity} {L("inscrits", "registered", "inscritos")}</p>
              <p className="text-gray-500">{ev.fee > 0 ? `${ev.fee} EUR` : L("Gratuit", "Free", "Gratuito")}</p>
              <DemoLockedButton label={L("Liste participants", "Participant list", "Lista de participantes")} icon={Users} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DemoPortalPanel({ locale }: { locale: string }) {
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  const p = DEMO_PORTAL;
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          {L("Mon compte", "My account", "Mi cuenta")} — {p.member}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        {[
          { label: L("Cotisation", "Dues", "Cuota"), value: L("À jour", "Up to date", "Al día") },
          { label: L("Assiduité", "Attendance", "Asistencia"), value: `${p.attendanceRate}%` },
          { label: L("Actions en cours", "Open actions", "Acciones en curso"), value: String(p.openActions) },
          { label: L("Documents reçus", "Documents received", "Documentos recibidos"), value: String(p.documentsReceived) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="font-semibold text-navy">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DemoDocumentsPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">{t("documentUploadTitle")}</p>
          <p className="text-xs text-gray-500">{t("uploadLimitsHint")}</p>
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {t("documentDropzone")}
            <p className="text-xs mt-2 text-gray-400">
              {t("documentMultiHint", { max: MAX_UPLOAD_FILES_PER_BATCH })}
            </p>
          </div>
          <DemoLockedButton label={t("documentUploadCta")} icon={Upload} variant="gold" />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {getDemoDocumentFolders(locale).filter((f) => !f.parentId).map((folder) => (
          <div
            key={folder.id}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <FolderOpen className="h-4 w-4 text-gold shrink-0" />
            <div>
              <p className="font-medium">{folder.name}</p>
              <p className="text-xs text-gray-400">{folder.documentCount} {L("fichiers", "files", "archivos")}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="divide-y divide-gray-50">
          {getDemoDocuments(locale).map((d) => (
            <div key={d.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-navy/50 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium block truncate">{d.title}</span>
                  <span className="text-xs text-gray-400">{d.fileSizeKb} Ko</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.shared && (
                  <Badge variant="gold" className="gap-1 text-[10px]">
                    <Share2 className="h-3 w-3" />
                    {L("Partagé", "Shared", "Compartido")}
                  </Badge>
                )}
                <Badge variant="muted">{d.category}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DemoRegistrationPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const L = (frText: string, enText: string, esText: string) =>
    pickDemoLocale(locale, { fr: frText, en: enText, es: esText });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card className="border-navy/10">
        <CardHeader>
          <CardTitle className="text-base">{t("registrationPanelTitle")}</CardTitle>
          <p className="text-sm text-gray-500">{t("registrationPanelHint")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("registrationModeClub")}
            </div>
            <div className="rounded-lg border border-navy bg-navy/5 px-3 py-2.5 text-sm font-medium text-navy flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              {t("registrationModeMember")}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">{t("registrationSelectClub")}</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 pl-9 flex items-center text-sm text-gray-500">
                {L("Paris", "Paris", "París")}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {DEMO_PUBLIC_CLUBS.map((club, i) => (
                <div
                  key={club.id}
                  className={`px-3 py-2.5 text-sm ${i === 0 ? "bg-navy/5 font-medium text-navy" : "text-gray-700"}`}
                >
                  {club.label}
                  {club.type === "ROTARACT" && (
                    <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      −{DEMO_SUBSCRIPTION.rotaractDiscountPercent}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t("registrationApprovalHint")}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
              {L("Prénom", "First name", "Nombre")}
            </div>
            <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
              {L("Nom", "Last name", "Apellidos")}
            </div>
          </div>
          <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
            email@exemple.fr
          </div>

          <DemoLockedButton label={t("registrationSubmit")} variant="gold" className="w-full" />
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="py-5 text-center space-y-2">
          <Clock className="h-8 w-8 text-amber-600 mx-auto" />
          <p className="font-semibold text-gray-900">{t("pendingApprovalTitle")}</p>
          <p className="text-sm text-gray-600">{t("pendingApprovalHint", { clubName: DEMO_CLUB.name })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("registrationClubFlowTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-navy bg-navy/5 px-3 py-2 text-sm font-medium text-navy text-center">
              Rotary
            </div>
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 text-center">
              Rotaract
            </div>
          </div>
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
            {t("rotaractDiscountHint", { percent: DEMO_SUBSCRIPTION.rotaractDiscountPercent })}
          </p>
          <p className="text-xs text-gray-500">{t("registrationClubDuplicateHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}