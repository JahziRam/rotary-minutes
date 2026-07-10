"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { setViewAsClub } from "@/actions/view-as-club";
import { cn } from "@/lib/utils";

export type ViewAsClubOption = {
  id: string;
  name: string;
  city: string;
};

export function ClubViewAsSwitcher({
  clubs,
  currentClubId,
  locale,
  className,
}: {
  clubs: ViewAsClubOption[];
  currentClubId: string | null;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("viewAsClub");
  const [pending, startTransition] = useTransition();

  if (clubs.length === 0) return null;

  return (
    <div className={cn("px-3 py-2", className)}>
      <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1.5">
        <Building2 className="h-3 w-3" />
        {t("switcherLabel")}
      </label>
      <select
        disabled={pending}
        value={currentClubId ?? ""}
        onChange={(e) => {
          const clubId = e.target.value;
          if (!clubId || clubId === currentClubId) return;
          startTransition(() => setViewAsClub(clubId, locale));
        }}
        className="w-full h-9 rounded-lg border border-white/15 bg-white/10 text-white text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
      >
        <option value="" disabled className="text-gray-900">
          {t("selectClub")}
        </option>
        {clubs.map((club) => (
          <option key={club.id} value={club.id} className="text-gray-900">
            {club.name}
            {club.city ? ` · ${club.city}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}