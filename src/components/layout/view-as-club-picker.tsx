"use client";

import { useTranslations } from "next-intl";
import { Building2, Eye } from "lucide-react";
import { selectViewAsClubFromForm } from "@/actions/view-as-club";
import { ClubViewAsSwitcher, type ViewAsClubOption } from "./club-view-as-switcher";
import { Card, CardContent } from "@/components/ui/card";

export function ViewAsClubPicker({
  clubs,
  locale,
  currentClubId,
}: {
  clubs: ViewAsClubOption[];
  locale: string;
  currentClubId?: string | null;
}) {
  const t = useTranslations("viewAsClub");

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
      <CardContent className="py-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-navy" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("pickerTitle")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pickerDescription")}</p>
          </div>
        </div>

        <ClubViewAsSwitcher
          clubs={clubs}
          currentClubId={currentClubId ?? null}
          locale={locale}
          variant="inline"
          className="px-0"
        />

        {clubs.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto native-scroll">
            {clubs.map((club) => (
              <form key={club.id} action={selectViewAsClubFromForm}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="clubId" value={club.id} />
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-gold/50 hover:bg-gold/5 text-left transition-colors active:scale-[0.98]"
                >
                  <Building2 className="h-4 w-4 text-navy shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {club.name}
                    </span>
                    {club.city && (
                      <span className="block text-xs text-gray-500 truncate">{club.city}</span>
                    )}
                  </span>
                </button>
              </form>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}