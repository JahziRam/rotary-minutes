import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield, CheckCircle, XCircle, Download, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string; hash: string }>;
}) {
  const { locale, hash } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("minutes");
  const tVerify = await getTranslations("verify");
  const dateLocale = locale === "fr" ? fr : enUS;

  const minute = await prisma.minute.findFirst({
    where: { contentHash: hash, status: "FINALIZED" },
    include: { club: true, meeting: true },
  });

  const isValid = !!minute;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-navy/10 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-navy" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {t("verify")}
          </h1>
          {isValid ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-green-700 font-medium">{tVerify("authentic")}</p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-red-700 font-medium">{tVerify("invalid")}</p>
            </>
          )}
          <div className="text-left space-y-3 text-sm bg-gray-50 rounded-lg p-4">
            {minute ? (
              <>
                <p>
                  <span className="text-gray-500">{tVerify("club")}</span>{" "}
                  <span className="font-medium">{minute.club.name}</span>
                </p>
                <p>
                  <span className="text-gray-500">{tVerify("minutes")}</span>{" "}
                  <span className="font-medium">{minute.title}</span>
                </p>
                <p>
                  <span className="text-gray-500">{tVerify("meetingDate")}</span>{" "}
                  {format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale })}
                </p>
                {minute.finalizedAt && (
                  <p>
                    <span className="text-gray-500">{tVerify("finalizedAt")}</span>{" "}
                    {format(minute.finalizedAt, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })}
                  </p>
                )}
              </>
            ) : null}

            <div className="pt-2 border-t border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Fingerprint className="h-4 w-4" />
                <span>{tVerify("hashAlgorithm")}</span>
              </div>
              <p className="text-xs text-gray-500">{tVerify("hashDescription")}</p>
              <p>
                <span className="text-gray-500">SHA-256 :</span>{" "}
                <code className="text-xs break-all bg-white px-1 py-0.5 rounded border">{hash}</code>
              </p>
            </div>
          </div>

          {minute && (
            <a
              href={`/api/pdf/${minute.id}`}
              download
              className={cn(buttonVariants({ variant: "gold" }), "w-full sm:w-auto")}
            >
              <Download className="h-4 w-4" />
              {tVerify("downloadPdf")}
            </a>
          )}

          <Link
            href={`/${locale}`}
            className="inline-block text-sm text-navy hover:underline"
          >
            {tVerify("backHome")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}