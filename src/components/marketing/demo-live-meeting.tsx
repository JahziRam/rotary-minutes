"use client";

import { useTranslations } from "next-intl";
import { Circle, CheckCircle2, Clock, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_LIVE_AGENDA, DEMO_CLUB } from "@/lib/demo-data";
import { DemoLockedButton } from "./demo-ui";

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
  const isFr = locale === "fr";

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
              {isFr ? "Mode réunion en direct" : "Live meeting mode"}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {DEMO_CLUB.name} · {isFr ? "Réunion statutaire" : "Statutory meeting"}
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
          <Badge variant="gold">{isFr ? "En cours" : "In progress"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isFr ? "Ordre du jour" : "Agenda"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEMO_LIVE_AGENDA.map((item, i) => {
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
                          ? isFr ? "Terminé" : "Done"
                          : item.status === "IN_PROGRESS"
                            ? isFr ? "En cours" : "Live"
                            : isFr ? "À venir" : "Upcoming"}
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
                          {isFr ? "Saisie des décisions en direct…" : "Recording decisions live…"}
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
          label={isFr ? "Enregistrer le PV" : "Save minutes"}
          variant="gold"
        />
        <DemoLockedButton label={isFr ? "Ajouter un point" : "Add agenda item"} />
      </div>
    </div>
  );
}