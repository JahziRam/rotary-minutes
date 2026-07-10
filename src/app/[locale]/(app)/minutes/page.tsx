import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { searchMinutes } from "@/actions/minutes";
import { parseListParams, listParamsToRecord } from "@/lib/server-list";
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
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext();

  const listParams = parseListParams({ q: sp.q, page: sp.page });

  const minutes = ctx
    ? await searchMinutes({
        q: sp.q,
        status: sp.status as never,
        meetingType: sp.type,
        year: sp.year ? parseInt(sp.year, 10) : undefined,
        includeArchived: sp.archived === "1",
        page: listParams.page,
        pageSize: listParams.pageSize,
      })
    : {
        items: [],
        total: 0,
        page: 1,
        pageSize: listParams.pageSize,
        totalPages: 1,
        start: 0,
        end: 0,
      };

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
          listParams={{
            ...listParamsToRecord(listParams),
            status: sp.status,
            type: sp.type,
            year: sp.year,
            archived: sp.archived === "1" ? "1" : undefined,
          }}
        />
      </div>
    </AppShellServer>
  );
}