"use client";

import { useTranslations } from "next-intl";
import { Circle, CheckCircle2, Clock, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_CLUB, getDemoLiveAgenda } from "@/lib/demo-data";
import { DemoLockedButton } from "./demo-ui";
import { pickDemoLocale } from "@/lib/demo-i18n";

const STATUS_STYLE = {
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-600", badge: "success" as const },
  IN_PROGRESS: { icon: Radio, color: "text-gold-dark", badge: "gold" as const },
  OPEN: { icon: Circle, color: "text-gray-300", badge: "muted" as const },
};

export function DemoLiveMeeting({
  locale,
  onBack,
}: {
  locale: string;
  onBack: () => void;
}) {
  const t = useTranslations("demo");
  const L = (fr: string, en: string, es: string) => pickDemoLocale(locale, { fr, en, es });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              {L("Mode réunion en direct", "Live meeting mode", "Modo reunión en vivo")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {DEMO_CLUB.name} · {L("Réunion statutaire", "Statutory meeting", "Reunión estatutaria")}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-navy hover:underline"
        >
          ← {t("backToDemo")}
        </button>
      </div>

      <Card className="border-gold/30 bg-gold/5">
        <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-navy" />
            <span className="font-medium">12:30 – 14:00</span>
            <span className="text-gray-500">· {DEMO_CLUB.meetingLocation}</span>
          </div>
          <Badge variant="gold">{L("En cours", "In progress", "En curso")}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{L("Ordre du jour", "Agenda", "Orden del día")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {getDemoLiveAgenda(locale).map((item, i) => {
            const style = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE];
            const Icon = style.icon;
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.status === "IN_PROGRESS"
                    ? "border-gold/40 bg-gold/5"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className={`h-4 w-4 ${style.color}`} />
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <Badge variant={style.badge} className="text-[10px]">
                        {item.status === "COMPLETED"
                          ? L("Terminé", "Done", "Hecho")
                          : item.status === "IN_PROGRESS"
                            ? L("En cours", "Live", "En vivo")
                            : L("À venir", "Upcoming", "Próximo")}
                      </Badge>
                    </div>
                    {item.note && (
                      <p className="mt-2 text-sm text-gray-600 rounded-lg bg-white/80 border border-gray-100 p-2.5">
                        {item.note}
                      </p>
                    )}
                    {item.status === "IN_PROGRESS" && (
                      <div className="mt-2 space-y-2">
                        <div className="h-9 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
                          {L(
                            "Saisie des décisions en direct…",
                            "Recording decisions live…",
                            "Registrando decisiones en vivo…"
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <DemoLockedButton
          label={L("Enregistrer le PV", "Save minutes", "Guardar acta")}
          variant="gold"
        />
        <DemoLockedButton
          label={L("Ajouter un point", "Add agenda item", "Añadir punto")}
        />
      </div>
    </div>
  );
}