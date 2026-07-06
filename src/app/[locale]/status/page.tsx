import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSystemStatus } from "@/lib/status-checks";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

/** Live checks — must not prerender at build time (needs runtime DB/env). */
export const dynamic = "force-dynamic";

const STATUS_ICON = {
  operational: CheckCircle,
  degraded: AlertTriangle,
  down: XCircle,
};

const STATUS_VARIANT = {
  operational: "success" as const,
  degraded: "warning" as const,
  down: "danger" as const,
};

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("status");
  const dateLocale = locale === "fr" ? fr : enUS;

  const { checks, overall, checkedAt } = await getSystemStatus();
  const OverallIcon = STATUS_ICON[overall];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}`} className="font-display text-xl font-bold hover:opacity-90">
            Rotary Minutes
          </Link>
          <Link href={`/${locale}/privacy`} className="text-sm text-white/80 hover:text-white">
            {locale === "fr" ? "Confidentialité" : "Privacy"}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-navy/10 flex items-center justify-center mx-auto">
            <Activity className="h-7 w-7 text-navy" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">{t("title")}</h1>
          <p className="text-gray-500 text-sm">
            {t("lastChecked")}: {format(new Date(checkedAt), "d MMM yyyy HH:mm:ss", { locale: dateLocale })}
          </p>
        </div>

        <Card className="border-navy/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OverallIcon
                  className={`h-8 w-8 ${
                    overall === "operational"
                      ? "text-green-500"
                      : overall === "degraded"
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                />
                <div>
                  <p className="font-semibold text-gray-900">{t("overall")}</p>
                  <p className="text-sm text-gray-500">{t(`overallStatus.${overall}`)}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[overall]}>{t(`status.${overall}`)}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <Card key={check.name}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        check.status === "operational"
                          ? "text-green-500"
                          : check.status === "degraded"
                            ? "text-amber-500"
                            : "text-red-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{t(`services.${check.name}`)}</p>
                      <p className="text-xs text-gray-500 truncate">{check.detail}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[check.status]} className="shrink-0">
                    {t(`status.${check.status}`)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}