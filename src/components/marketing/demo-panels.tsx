"use client";

import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_CLUB,
  DEMO_MEMBERS,
  DEMO_MEETINGS,
  DEMO_MINUTES,
  DEMO_STATS,
  DEMO_EMAIL_TEMPLATES,
  DEMO_EMAIL_CAMPAIGNS,
  DEMO_EMAIL_CONTACTS,
  DEMO_DISTRICT_CLUBS,
  DEMO_MANDATES,
  getDemoData,
} from "@/lib/demo-data";
import { DemoLockedButton, DemoFeaturePill } from "./demo-ui";

export type DemoPanelProps = {
  locale: string;
  onPreviewMinute: () => void;
  onLiveMeeting: () => void;
  onMinuteEditor: () => void;
};

export function DemoDashboardPanel({ locale, onPreviewMinute, onLiveMeeting }: DemoPanelProps) {
  const t = useTranslations("demo");
  const dateLocale = locale === "fr" ? fr : enUS;
  const data = getDemoData(locale);
  const isFr = locale === "fr";
  const nextMeeting = DEMO_MEETINGS[2];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoFeaturePill label="PDF + QR" />
        <DemoFeaturePill label={isFr ? "Réunion live" : "Live meeting"} />
        <DemoFeaturePill label={isFr ? "Mode hors ligne" : "Offline mode"} />
        <DemoFeaturePill label="FR / EN" />
      </div>

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
            {DEMO_MINUTES.slice(0, 3).map((pv) => (
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
  const dateLocale = locale === "fr" ? fr : enUS;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("newMeeting")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("importAgenda")} />
      </div>
      {DEMO_MEETINGS.map((m) => (
        <Card key={m.id}>
          <CardContent className="pt-4">
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
                <Badge variant="success">{locale === "fr" ? "Terminée" : "Completed"}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DemoMinutesPanel({ locale, onPreviewMinute, onMinuteEditor }: DemoPanelProps) {
  const t = useTranslations("demo");
  const dateLocale = locale === "fr" ? fr : enUS;
  const isFr = locale === "fr";

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

      {DEMO_MINUTES.map((pv) => (
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
                <DemoLockedButton label={isFr ? "Valider" : "Approve"} />
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
  const isFr = locale === "fr";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {["compose", "templates", "campaigns", "contacts"].map((s) => (
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
          {DEMO_EMAIL_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium text-sm">{tpl.name}</p>
                <p className="text-xs text-gray-500">{tpl.subject}</p>
              </div>
              <span className="text-xs text-gray-400">{tpl.uses} {isFr ? "envois" : "sends"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("emailCampaigns")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {DEMO_EMAIL_CAMPAIGNS.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.recipients} {isFr ? "destinataires" : "recipients"}</p>
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
            <div className="bg-navy/5 px-4 py-2 border-b font-medium">{isFr ? "Convocation réunion" : "Meeting invitation"}</div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-8 w-8 rounded-full bg-navy text-gold text-[10px] font-bold flex items-center justify-center">RC</div>
                <span className="font-semibold">{DEMO_CLUB.name}</span>
              </div>
              <p className="text-gray-700">
                {isFr
                  ? "Bonjour {{memberName}}, vous êtes convié(e) à la réunion du {{meetingDate}}."
                  : "Hello {{memberName}}, you are invited to the meeting on {{meetingDate}}."}
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
  const isFr = locale === "fr";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={t("addMember")} icon={Plus} variant="gold" />
        <DemoLockedButton label={t("importMembers")} />
      </div>

      <Card className="border-gold/20 bg-gold/5">
        <CardContent className="py-3 text-sm">
          🎂 {isFr ? "Anniversaire cette semaine : Camille Petit (12 mars)" : "Birthday this week: Camille Petit (Mar 12)"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("mandates")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {DEMO_MANDATES.map((m) => (
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
            {DEMO_MEMBERS.map((m) => (
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
  const isFr = locale === "fr";

  return (
    <div className="space-y-4">
      <Card className="bg-navy/5 border-navy/10">
        <CardContent className="py-4">
          <p className="text-sm text-gray-600">
            {isFr
              ? `Vue gouverneur — District ${DEMO_CLUB.district} · Accès lecture seule aux PV finalisés`
              : `Governor view — District ${DEMO_CLUB.district} · Read-only access to finalized minutes`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Map className="h-4 w-4" />{t("districtBenchmark")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">{isFr ? "Club" : "Club"}</th>
                <th className="pb-2 font-medium">{t("members")}</th>
                <th className="pb-2 font-medium">{t("attendanceRate")}</th>
                <th className="pb-2 font-medium">{t("minutes")}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DISTRICT_CLUBS.map((c) => (
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
  const isFr = locale === "fr";

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />{t("clubSettings")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{isFr ? "Logo du club" : "Club logo"}</p>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-navy flex items-center justify-center text-gold font-bold text-lg">RC</div>
              <DemoLockedButton label={isFr ? "Choisir une image" : "Upload image"} />
            </div>
          </div>
          {[
            { label: isFr ? "Nom du club" : "Club name", value: DEMO_CLUB.name },
            { label: "District", value: DEMO_CLUB.district },
            { label: isFr ? "Ville" : "City", value: DEMO_CLUB.city },
            { label: isFr ? "Lieu de réunion" : "Meeting location", value: DEMO_CLUB.meetingLocation },
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
    </div>
  );
}

export function DemoSupportPanel({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const isFr = locale === "fr";

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4" />{t("support")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">{isFr ? "Sujet" : "Subject"}</label>
          <div className="mt-1 h-10 rounded-lg border bg-gray-50 px-3 flex items-center text-sm text-gray-400">
            {isFr ? "Question sur l'export PDF" : "Question about PDF export"}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">{isFr ? "Message" : "Message"}</label>
          <div className="mt-1 h-24 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-400">
            {isFr ? "Comment authentifier un PV avec le QR code ?" : "How do I authenticate minutes with the QR code?"}
          </div>
        </div>
        <DemoLockedButton label={t("sendTicket")} variant="gold" />
      </CardContent>
    </Card>
  );
}

export function DemoMinuteEditorPanel({ locale, onPreviewMinute }: { locale: string; onPreviewMinute: () => void }) {
  const t = useTranslations("demo");
  const isFr = locale === "fr";
  const draft = DEMO_MINUTES.find((m) => m.status === "DRAFT")!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">{draft.title}</h2>
          <Badge variant="muted" className="mt-1">{isFr ? "Brouillon" : "Draft"}</Badge>
        </div>
        <button type="button" onClick={onPreviewMinute} className="text-sm text-navy font-medium hover:underline">
          {t("previewMinute")}
        </button>
      </div>

      {[
        { title: isFr ? "Ouverture & quorum" : "Opening & quorum", content: isFr ? "28 membres présents, quorum atteint." : "28 members present, quorum reached." },
        { title: isFr ? "Communications" : "Communications", content: isFr ? "Présentation du projet humanitaire Madagascar." : "Humanitarian project Madagascar presentation." },
        { title: isFr ? "Décisions" : "Decisions", content: "" },
      ].map((item, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">{i + 1}. {item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg border p-3 text-sm min-h-[60px] ${item.content ? "text-gray-700 bg-white" : "text-gray-400 bg-gray-50 border-dashed"}`}>
              {item.content || (isFr ? "Cliquez pour rédiger… (lecture seule)" : "Click to write… (read-only)")}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton label={isFr ? "Enregistrer" : "Save"} variant="gold" />
        <DemoLockedButton label={isFr ? "Soumettre en révision" : "Submit for review"} />
        <DemoLockedButton label={isFr ? "Finaliser" : "Finalize"} />
      </div>
    </div>
  );
}