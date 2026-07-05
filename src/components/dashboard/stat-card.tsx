import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p
                className={cn(
                  "text-xs mt-1",
                  trend === "up" && "text-green-600",
                  trend === "down" && "text-red-600",
                  !trend && "text-gray-400"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-navy" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}