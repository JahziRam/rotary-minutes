"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { selectViewAsClubFromForm } from "@/actions/view-as-club";
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
  variant = "sidebar",
}: {
  clubs: ViewAsClubOption[];
  currentClubId: string | null;
  locale: string;
  className?: string;
  variant?: "sidebar" | "drawer" | "inline";
}) {
  const t = useTranslations("viewAsClub");

  if (clubs.length === 0) return null;

  const isInline = variant === "inline";
  const isDrawer = variant === "drawer";

  return (
    <div
      className={cn(
        isInline ? "space-y-2" : "px-3 py-2",
        className
      )}
    >
      <label
        className={cn(
          "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide mb-1.5",
          isInline ? "text-gray-500" : isDrawer ? "text-white/50" : "text-white/50"
        )}
      >
        <Building2 className="h-3 w-3" />
        {t("switcherLabel")}
      </label>
      <form action={selectViewAsClubFromForm}>
        <input type="hidden" name="locale" value={locale} />
        <select
          name="clubId"
          defaultValue={currentClubId ?? ""}
          onChange={(e) => {
            const clubId = e.target.value;
            if (!clubId || clubId === currentClubId) return;
            e.currentTarget.form?.requestSubmit();
          }}
          className={cn(
            "w-full h-10 rounded-lg border text-sm px-3 focus:outline-none focus:ring-2",
            isInline
              ? "border-gray-200 bg-white text-gray-900 focus:ring-gold/40"
              : isDrawer
                ? "border-white/15 bg-white/10 text-white focus:ring-gold/40"
                : "border-white/15 bg-white/10 text-white text-xs focus:ring-gold/40"
          )}
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
      </form>
    </div>
  );
}