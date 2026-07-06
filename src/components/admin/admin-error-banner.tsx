import { AlertTriangle } from "lucide-react";

export function AdminErrorBanner({
  title = "Certaines données n'ont pas pu être chargées",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">{title}</p>
        {message ? <p className="mt-1 text-amber-800">{message}</p> : null}
      </div>
    </div>
  );
}