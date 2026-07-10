import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPlatformExportData } from "@/actions/admin-platform";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { Download, FileText } from "lucide-react";

export default async function AdminExportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  let result: Awaited<ReturnType<typeof getPlatformExportData>>;
  try {
    result = await getPlatformExportData();
  } catch (e) {
    console.error("[admin/export]", e);
    result = { error: "EXPORT_FAILED" };
  }

  const hasError = "error" in result;
  const json = result.success ? JSON.stringify(result.data, null, 2) : "{}";

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("export")} description={tPages("export")} />
      <Card>
        <CardContent className="pt-6 space-y-4">
        {hasError ? (
          <AdminErrorBanner message="Impossible de charger les données d'export. Réessayez plus tard." />
        ) : null}
        <div className="flex flex-wrap gap-3">
          <a
            href={
              hasError
                ? undefined
                : `data:application/json;charset=utf-8,${encodeURIComponent(json)}`
            }
            download={
              hasError ? undefined : `rotary-minutes-stats-${new Date().toISOString().split("T")[0]}.json`
            }
            aria-disabled={hasError}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
              hasError
                ? "bg-gray-200 text-gray-500 pointer-events-none"
                : "bg-gold text-navy-dark hover:bg-gold-light"
            }`}
          >
            <Download className="h-4 w-4" />
            Télécharger JSON
          </a>
          <a
            href={hasError ? undefined : "/api/admin/export-pdf"}
            aria-disabled={hasError}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
              hasError
                ? "bg-gray-300 text-gray-500 pointer-events-none"
                : "bg-navy text-white hover:bg-navy-light"
            }`}
          >
            <FileText className="h-4 w-4" />
            Télécharger PDF
          </a>
        </div>
        <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-96 border border-gray-200">
          {hasError ? "{}" : json}
        </pre>
        </CardContent>
      </Card>
    </div>
  );
}