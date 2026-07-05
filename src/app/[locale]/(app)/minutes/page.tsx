import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { searchMinutes } from "@/actions/minutes";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MinutesList } from "@/components/minutes/minutes-list";

export default async function MinutesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    year?: string;
    archived?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext();

  const minutes = ctx
    ? await searchMinutes({
        q: sp.q,
        status: sp.status as never,
        meetingType: sp.type,
        year: sp.year ? parseInt(sp.year, 10) : undefined,
        includeArchived: sp.archived === "1",
      })
    : [];

  return (
    <AppShellServer title={t("minutes.title")}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Link
            href={`/${locale}/meetings/new`}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("minutes.new")}
          </Link>
        </div>
        <MinutesList
          minutes={minutes}
          initialQuery={sp.q ?? ""}
          initialStatus={sp.status ?? ""}
          initialType={sp.type ?? ""}
          initialYear={sp.year ?? ""}
          showArchived={sp.archived === "1"}
        />
      </div>
    </AppShellServer>
  );
}