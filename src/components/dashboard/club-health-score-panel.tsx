import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, AlertTriangle, Info } from "lucide-react";
import { computeClubHealthScore } from "@/lib/club-health-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-100 text-green-800 ring-green-200",
  B: "bg-blue-100 text-blue-800 ring-blue-200",
  C: "bg-amber-100 text-amber-800 ring-amber-200",
  D: "bg-orange-100 text-orange-800 ring-orange-200",
  F: "bg-red-100 text-red-800 ring-red-200",
};

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

export async function ClubHealthScorePanel({
  clubId,
  locale,
}: {
  clubId: string;
  locale: string;
}) {
  const t = await getTranslations("dashboard.healthScore");
  const health = await computeClubHealthScore(clubId);
  const summary = locale === "fr" ? health.summaryFr : health.summaryEn;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-navy" />
          {t("title")}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{health.score}</span>
          <span className="text-sm text-gray-400">/100</span>
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1",
              GRADE_STYLES[health.grade]
            )}
          >
            {health.grade}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">{summary}</p>
        {health.issues.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            {t("allClear")}
          </p>
        ) : (
          <ul className="space-y-2">
            {health.issues.map((issue) => {
              const Icon = SEVERITY_ICON[issue.severity];
              const message = locale === "fr" ? issue.messageFr : issue.messageEn;
              const content = (
                <span className="flex items-start gap-2 text-sm">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      issue.severity === "critical" && "text-red-600",
                      issue.severity === "warning" && "text-amber-600",
                      issue.severity === "info" && "text-blue-600"
                    )}
                  />
                  <span className="flex-1">{message}</span>
                  {issue.count != null && (
                    <Badge variant={issue.severity === "critical" ? "danger" : "warning"}>
                      {issue.count}
                    </Badge>
                  )}
                </span>
              );
              return (
                <li key={issue.key}>
                  {issue.link ? (
                    <Link
                      href={`/${locale}${issue.link}`}
                      className="block rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}