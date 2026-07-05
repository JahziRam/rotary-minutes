import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Breakdown {
  byPlan: Array<{ plan: string; _count: { plan: number } }>;
  byStatus: Array<{ status: string; _count: { status: number } }>;
}

const planLabels: Record<string, string> = {
  TRIAL: "Essai",
  STARTER: "Starter",
  PROFESSIONAL: "Pro",
  ENTERPRISE: "Enterprise",
};

const statusLabels: Record<string, string> = {
  TRIALING: "En essai",
  ACTIVE: "Actif",
  PAST_DUE: "Impayé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

export function SubscriptionBreakdown({ data }: { data: Breakdown }) {
  const total = data.byStatus.reduce((s, r) => s + r._count.status, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-navy" />
          Abonnements ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Par plan</p>
          <div className="flex flex-wrap gap-2">
            {data.byPlan.map((r) => (
              <Badge key={r.plan} variant="default">
                {planLabels[r.plan] ?? r.plan}: {r._count.plan}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Par statut</p>
          <div className="flex flex-wrap gap-2">
            {data.byStatus.map((r) => (
              <Badge
                key={r.status}
                variant={
                  r.status === "ACTIVE"
                    ? "success"
                    : r.status === "TRIALING"
                      ? "warning"
                      : r.status === "PAST_DUE"
                        ? "danger"
                        : "muted"
                }
              >
                {statusLabels[r.status] ?? r.status}: {r._count.status}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}