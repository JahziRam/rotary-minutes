import { setRequestLocale } from "next-intl/server";
import { getPlatformExportData } from "@/actions/admin-platform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";

export default async function AdminExportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await getPlatformExportData();
  const json = result.success ? JSON.stringify(result.data, null, 2) : "{}";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-navy" />
          Export des statistiques
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Téléchargez les statistiques globales de la plateforme au format JSON ou PDF.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(json)}`}
            download={`rotary-minutes-stats-${new Date().toISOString().split("T")[0]}.json`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger JSON
          </a>
          <a
            href="/api/admin/export-pdf"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-navy text-white hover:bg-navy-light transition-colors"
          >
            <FileText className="h-4 w-4" />
            Télécharger PDF
          </a>
        </div>
        <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-96 border border-gray-200">
          {json}
        </pre>
      </CardContent>
    </Card>
  );
}