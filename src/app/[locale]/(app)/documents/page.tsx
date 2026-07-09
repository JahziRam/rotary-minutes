import { getTranslations, setRequestLocale } from "next-intl/server";
import { listDocuments } from "@/actions/documents";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { DocumentsLibrary } from "@/components/documents/documents-library";
import { getClubContext } from "@/lib/club-context";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("documents");
  const ctx = await getClubContext();

  const data = await listDocuments();
  if ("error" in data) {
    if (data.error === "FEATURE_DISABLED" && ctx) {
      return (
        <AppShellServer title={t("title")}>
          <FeatureUnavailable
            feature="documentsEnabled"
            locale={locale}
            plan={ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{t("unauthorized")}</p>
      </AppShellServer>
    );
  }

  return (
    <AppShellServer title={t("title")}>
      <DocumentsLibrary
        documents={data.documents}
        folders={"folders" in data ? data.folders : []}
        canManage={data.canManage}
        locale={locale}
        fileManagerEnabled={"fileManagerEnabled" in data ? data.fileManagerEnabled : false}
        documentSharingEnabled={"documentSharingEnabled" in data ? data.documentSharingEnabled : false}
      />
    </AppShellServer>
  );
}