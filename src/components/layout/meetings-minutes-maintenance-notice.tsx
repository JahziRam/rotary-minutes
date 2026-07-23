import { Construction } from "lucide-react";
import {
  isMeetingsMinutesMaintenanceActive,
  meetingsMinutesMaintenanceUntilLabel,
} from "@/lib/meetings-minutes-maintenance";

const COPY = {
  fr: {
    title: "Réunions et procès-verbaux temporairement indisponibles",
    body: (until: string) =>
      `Nous nous excusons pour la gêne occasionnée. Les modules Réunions et PV sont en maintenance et seront de nouveau accessibles le ${until}. Merci de votre compréhension.`,
  },
  en: {
    title: "Meetings and minutes temporarily unavailable",
    body: (until: string) =>
      `We apologise for the inconvenience. The Meetings and Minutes modules are under maintenance and will be available again on ${until}. Thank you for your understanding.`,
  },
  es: {
    title: "Reuniones y actas temporalmente no disponibles",
    body: (until: string) =>
      `Disculpe las molestias. Los módulos de Reuniones y Actas están en mantenimiento y estarán disponibles de nuevo el ${until}. Gracias por su comprensión.`,
  },
} as const;

export function MeetingsMinutesMaintenanceNotice({
  locale,
}: {
  locale: string;
}) {
  if (!isMeetingsMinutesMaintenanceActive()) return null;

  const lang = locale === "en" ? "en" : locale === "es" ? "es" : "fr";
  const until = meetingsMinutesMaintenanceUntilLabel(locale);
  const copy = COPY[lang];

  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 sm:p-8 shadow-sm max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Construction className="h-6 w-6 text-amber-800" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-xl font-bold text-navy">{copy.title}</h1>
          <p className="text-sm text-gray-700 leading-relaxed">{copy.body(until)}</p>
          <p className="text-xs font-medium text-amber-900/80 pt-1">
            {lang === "fr"
              ? `Réouverture prévue : ${until}`
              : lang === "es"
                ? `Reapertura prevista: ${until}`
                : `Expected reopening: ${until}`}
          </p>
        </div>
      </div>
    </div>
  );
}
