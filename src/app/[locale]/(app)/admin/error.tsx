"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-red-900">Erreur dans l&apos;administration</h2>
          <p className="text-sm text-red-800 mt-1">
            Cette page n&apos;a pas pu s&apos;afficher. Les autres sections admin restent accessibles.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-3 text-xs text-red-700 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          )}
        </div>
      </div>
      <Button type="button" variant="outline" onClick={() => reset()}>
        Réessayer
      </Button>
    </div>
  );
}