"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, X } from "lucide-react";
import { clearViewAsClub } from "@/actions/view-as-club";
import { Button } from "@/components/ui/button";

export function ViewAsClubBanner({
  clubName,
  locale,
}: {
  clubName: string;
  locale: string;
}) {
  const t = useTranslations("viewAsClub");
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 shrink-0 text-amber-700" />
          <span className="truncate">
            {t("banner", { club: clubName })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="h-8 border-amber-300 bg-white/80 hover:bg-white text-amber-900"
          onClick={() => startTransition(() => clearViewAsClub(locale))}
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          {t("exit")}
        </Button>
      </div>
    </div>
  );
}