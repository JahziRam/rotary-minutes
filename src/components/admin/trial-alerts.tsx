import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface TrialAlert {
  id: string;
  trialEndsAt: Date | string | null;
  club: { id: string; name: string; city: string; country: string };
}

export function TrialAlerts({ trials, locale }: { trials: TrialAlert[]; locale: string }) {
  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Essais à surveiller
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trials.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun essai n&apos;expire dans les 7 prochains jours.</p>
        ) : (
          <ul className="space-y-3">
            {trials.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.club.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.club.city}, {t.club.country}
                  </p>
                </div>
                {t.trialEndsAt ? (
                  <Badge
                    variant={
                      new Date(t.trialEndsAt) < new Date() ? "danger" : "warning"
                    }
                    className="shrink-0"
                  >
                    {new Date(t.trialEndsAt) < new Date()
                      ? "Expiré"
                      : format(new Date(t.trialEndsAt), "d MMM", { locale: dateLocale })}
                  </Badge>
                ) : (
                  <Badge variant="warning" className="shrink-0">Sans date</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}