import Link from "next/link";
import { ArrowLeft, Circle } from "lucide-react";
import { MinutePreviewActions } from "./minute-preview-actions";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { calculateAttendanceRate } from "@/lib/rotary";
export interface MinutePreviewData {
  id: string;
  title: string;
  status: string;
  contentHash?: string | null;
  verifyUrl?: string | null;
  qrCodeDataUrl?: string | null;
  club: {
    name: string;
    address?: string | null;
    district?: string | null;
    country?: string | null;
    logoUrl?: string | null;
  };
  meeting: {
    date: Date | string;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    type: string;
    presidedBy?: string | null;
    secretary?: string | null;
    attendances: Array<{ category: string }>;
  };
  agendaItems: Array<{
    id: string;
    title: string;
    decisions?: string | null;
    actions?: string | null;
    responsible?: string | null;
    dueDate?: Date | string | null;
    status: string;
  }>;
  versions: Array<{
    version: number;
    createdAt: Date | string;
    author?: { firstName: string; lastName: string } | null;
  }>;
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  STATUTORY: "Statutaire",
  COMMITTEE: "Comité",
  COMMISSION: "Commission",
  GENERAL_ASSEMBLY: "Assemblée Générale",
  JOINT_MEETING: "Réunion commune",
  GOVERNOR_VISIT: "Visite du Gouverneur",
  TRAINING: "Formation",
  SPECIAL: "Spéciale",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  FINALIZED: { label: "Diffusé", className: "bg-sky-100 text-sky-800" },
  DRAFT: { label: "Brouillon", className: "bg-amber-100 text-amber-800" },
  IN_PROGRESS: { label: "En cours", className: "bg-blue-100 text-blue-800" },
  REVIEW: { label: "En révision", className: "bg-purple-100 text-purple-800" },
  ARCHIVED: { label: "Archivé", className: "bg-gray-100 text-gray-600" },
};

const ITEM_STATUS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Terminé", className: "bg-emerald-100 text-emerald-800" },
  IN_PROGRESS: { label: "En cours", className: "bg-amber-100 text-amber-800" },
  OPEN: { label: "Ouvert", className: "bg-gray-100 text-gray-600" },
  DEFERRED: { label: "Reporté", className: "bg-orange-100 text-orange-800" },
  CANCELLED: { label: "Annulé", className: "bg-red-100 text-red-700" },
};

function countByCategory(attendances: Array<{ category: string }>, cat: string) {
  return attendances.filter((a) => a.category === cat).length;
}

export function MinutePreview({
  data,
  locale,
  backHref,
  pdfEnabled = true,
  pdfVisible = true,
  emailsEnabled = true,
  emailsVisible = true,
  hideBackLink = false,
}: {
  data: MinutePreviewData;
  locale: string;
  backHref: string;
  pdfEnabled?: boolean;
  pdfVisible?: boolean;
  emailsEnabled?: boolean;
  emailsVisible?: boolean;
  hideBackLink?: boolean;
}) {
  const dateLocale = locale === "fr" ? fr : enUS;
  const meetingDate = new Date(data.meeting.date);
  const typeLabel = MEETING_TYPE_LABELS[data.meeting.type] ?? data.meeting.type;
  const statusInfo = STATUS_LABELS[data.status] ?? STATUS_LABELS.DRAFT;

  const present = countByCategory(data.meeting.attendances, "PRESENT");
  const excused = countByCategory(data.meeting.attendances, "EXCUSED_ABSENT");
  const unexcused = countByCategory(data.meeting.attendances, "UNEXCUSED_ABSENT");
  const traveling = countByCategory(data.meeting.attendances, "TRAVELING");
  const total = data.meeting.attendances.length || present + excused + unexcused + traveling;
  const rate = total > 0 ? Math.round(calculateAttendanceRate(present, total).rate) : 0;

  const timeRange = [data.meeting.startTime, data.meeting.endTime]
    .filter(Boolean)
    .join("–");

  const subtitle = `${typeLabel} — ${format(meetingDate, "d MMMM yyyy", { locale: dateLocale })}`;

  return (
    <div className="min-h-full -m-4 lg:-m-6 p-4 lg:p-6 bg-[#f8f5f0]">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Aperçu du procès-verbal
          </h1>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        {!hideBackLink && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Main preview card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          {/* Club header */}
          <div className="p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden">
                {data.club.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.club.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg viewBox="0 0 40 40" className="h-8 w-8 text-gold" fill="currentColor">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="20" cy="20" r="6" />
                    <line x1="20" y1="2" x2="20" y2="8" stroke="currentColor" strokeWidth="2" />
                    <line x1="20" y1="32" x2="20" y2="38" stroke="currentColor" strokeWidth="2" />
                    <line x1="2" y1="20" x2="8" y2="20" stroke="currentColor" strokeWidth="2" />
                    <line x1="32" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg leading-tight">
                  {data.club.name}
                </h2>
                {data.club.address && (
                  <p className="text-sm text-gray-500 mt-0.5">{data.club.address}</p>
                )}
                <p className="text-sm text-gray-400">
                  {data.club.district && `District ${data.club.district}`}
                  {data.club.district && data.club.country && " • "}
                  {data.club.country}
                </p>
              </div>
            </div>
          </div>

          {/* Meeting title */}
          <div className="px-6 py-5 text-center border-b border-gray-100">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
              Réunion
            </p>
            <h3 className="text-2xl font-bold text-gray-900">{typeLabel}</h3>
            <p className="text-sm text-gray-500 mt-2">
              {format(meetingDate, "d MMMM yyyy", { locale: dateLocale })}
              {data.meeting.location && ` • ${data.meeting.location}`}
              {timeRange && ` • ${timeRange}`}
            </p>
          </div>

          {/* Key people */}
          <div className="grid grid-cols-3 gap-3 p-6 border-b border-gray-100">
            {[
              { label: "Président", value: data.meeting.presidedBy ?? "—" },
              { label: "Secrétaire", value: data.meeting.secretary ?? "—" },
              {
                label: "Taux d'assiduité",
                value: total > 0 ? `${rate}% (${present}/${total})` : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-[#f8f5f0] px-4 py-3 text-center"
              >
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-1">
                  {label}
                </p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Attendance */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">Présences</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Présent", count: present },
                { label: "Excusé", count: excused },
                { label: "Non excusé", count: unexcused },
                { label: "En voyage", count: traveling },
              ].map(({ label, count }) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center"
                >
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-4">Ordre du jour</h4>
            <div className="space-y-5">
              {data.agendaItems.map((item, i) => {
                const itemStatus = ITEM_STATUS[item.status] ?? ITEM_STATUS.OPEN;
                return (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {i + 1}. {item.title}
                      </p>
                      {item.decisions && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Décisions:</span>{" "}
                          {item.decisions}
                        </p>
                      )}
                      {item.actions && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          <span className="font-medium">Action:</span>{" "}
                          {item.actions}
                          {item.responsible && ` — ${item.responsible}`}
                          {item.dueDate &&
                            ` (${format(new Date(item.dueDate), "d MMMM yyyy", { locale: dateLocale })})`}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${itemStatus.className}`}
                    >
                      {itemStatus.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer hash + QR */}
          <div className="px-6 py-4 flex items-end justify-between gap-4 bg-gray-50/50">
            <div className="min-w-0">
              {data.contentHash && (
                <p className="text-xs text-gray-400 font-mono truncate">
                  Hash d&apos;intégrité: {data.contentHash.slice(0, 22)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Le QR code pointe vers la version officielle en ligne.
              </p>
            </div>
            {data.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.qrCodeDataUrl}
                alt="QR Code"
                className="h-16 w-16 shrink-0 rounded"
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {/* Status + actions */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Statut</h4>
            <span
              className={`inline-flex text-sm font-medium px-3 py-1 rounded-full mb-4 ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
            <MinutePreviewActions
              minuteId={data.id}
              pdfEnabled={pdfEnabled}
              pdfVisible={pdfVisible}
              emailsEnabled={emailsEnabled}
              emailsVisible={emailsVisible}
            />
          </div>

          {/* Version history */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
            <h4 className="font-semibold text-gray-900 mb-4">
              Historique des versions
            </h4>
            {data.versions.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune version enregistrée</p>
            ) : (
              <ul className="space-y-3">
                {data.versions.map((v, i) => {
                  const authorName = v.author
                    ? `${v.author.firstName} ${v.author.lastName}`
                    : "";
                  const isLatest = i === 0;
                  return (
                    <li key={v.version} className="flex items-start gap-2.5">
                      {isLatest ? (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-navy shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          v{v.version}
                          {isLatest && data.status === "FINALIZED" && (
                            <span className="font-normal text-gray-500">
                              {" "}— Diffusé
                            </span>
                          )}
                          {isLatest && data.status === "DRAFT" && (
                            <span className="font-normal text-gray-500">
                              {" "}— Brouillon
                            </span>
                          )}
                        </p>
                        {authorName && (
                          <p className="text-xs text-gray-400">{authorName}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {data.status !== "FINALIZED" && (
            <Link
              href={`/${locale}/minutes/${data.id}/edit`}
              className="flex items-center justify-center w-full h-10 rounded-xl bg-gold text-navy-dark text-sm font-semibold hover:bg-gold-light transition-colors"
            >
              Modifier le PV
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}