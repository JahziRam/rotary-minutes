import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listCommissions } from "@/actions/commissions";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { CommissionsPanel } from "@/components/members/commissions-panel";

export default async function CommissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("commissions");
  const tMembers = await getTranslations("members");

  const data = await listCommissions();
  if ("error" in data) {
    return (
      <AppShellServer title={t("title")}>
        <p className="text-sm text-gray-500">{t("forbidden")}</p>
      </AppShellServer>
    );
  }

  return (
    <AppShellServer title={t("title")}>
      <div className="mb-4">
        <Link
          href={`/${locale}/members`}
          className="text-sm text-navy hover:underline"
        >
          ← {tMembers("title")}
        </Link>
      </div>
      <CommissionsPanel
        commissions={data.commissions}
        members={data.members}
        canManage={data.canManage}
      />
    </AppShellServer>
  );
}
