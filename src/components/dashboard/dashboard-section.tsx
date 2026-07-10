import { cn } from "@/lib/utils";

export function DashboardSection({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}