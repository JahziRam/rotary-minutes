import { getAssistanceAnalyticsSummary } from "@/actions/assistance-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export async function AssistanceAnalyticsPanel() {
  const stats = await getAssistanceAnalyticsSummary(30);
  if (!stats) return null;

  const topHints = Object.entries(stats.hintsDismissed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topAbandons = Object.entries(stats.stepAbandonment)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-navy" />
          Assistance — 30 derniers jours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Guide démarré" value={stats.guideStarted} />
          <Stat label="Guide terminé" value={stats.guideCompleted} />
          <Stat
            label="Taux complétion guide"
            value={`${stats.guideCompletionRate}%`}
          />
          <Stat label="Retours utilisateurs" value={stats.feedbackCount} />
          <Stat label="Walkthroughs démarrés" value={stats.walkthroughsStarted} />
          <Stat label="Walkthroughs terminés" value={stats.walkthroughsCompleted} />
          <Stat label="Walkthroughs abandonnés" value={stats.walkthroughsAbandoned} />
          <Stat
            label="Note moyenne"
            value={stats.avgFeedbackRating > 0 ? `${stats.avgFeedbackRating}/5` : "—"}
          />
        </div>

        {topAbandons.length > 0 && (
          <div>
            <p className="font-medium text-navy mb-2">Étapes guide abandonnées</p>
            <ul className="space-y-1 text-gray-600">
              {topAbandons.map(([step, count]) => (
                <li key={step} className="flex justify-between">
                  <span>{step}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topHints.length > 0 && (
          <div>
            <p className="font-medium text-navy mb-2">Hints les plus masqués</p>
            <ul className="space-y-1 text-gray-600">
              {topHints.map(([hint, count]) => (
                <li key={hint} className="flex justify-between">
                  <span className="font-mono text-xs">{hint}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-navy">{value}</p>
    </div>
  );
}