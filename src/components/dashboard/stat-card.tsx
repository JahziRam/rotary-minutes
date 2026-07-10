import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = "navy",
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accent?: "navy" | "gold" | "green" | "amber";
  className?: string;
}) {
  const accentStyles = {
    navy: "bg-navy/10 text-navy",
    gold: "bg-gold/15 text-navy-dark",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <Card className={cn("overflow-hidden border-gray-100 shadow-sm", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p
                className={cn(
                  "text-xs mt-1.5",
                  trend === "up" && "text-emerald-600",
                  trend === "down" && "text-red-600",
                  trend === "neutral" && "text-gray-400",
                  !trend && "text-gray-400"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              accentStyles[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}