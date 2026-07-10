import { getTranslations } from "next-intl/server";
import { COMPANY_LEGAL, formatCompanyAddress } from "@/lib/company-legal";
import { getAppName } from "@/lib/app-settings";
import { cn } from "@/lib/utils";

export async function CompanyLegalNotice({
  locale,
  variant = "footer",
  className,
}: {
  locale: string;
  variant?: "footer" | "block" | "compact";
  className?: string;
}) {
  const t = await getTranslations("legal.company");
  const year = new Date().getFullYear();
  const productName = await getAppName();

  if (variant === "compact") {
    return (
      <p className={cn("text-xs text-gray-400 leading-relaxed text-center", className)}>
        {t("operatedByShort", { company: COMPANY_LEGAL.companyName })}
      </p>
    );
  }

  if (variant === "block") {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 leading-relaxed",
          className
        )}
      >
        <p className="font-medium text-gray-900">{t("publisherTitle")}</p>
        <p className="mt-2">
          {t("operatedBy", {
            product: productName,
            alias: COMPANY_LEGAL.productAlias,
            company: COMPANY_LEGAL.companyName,
          })}
        </p>
        <p className="mt-1 whitespace-pre-line">{formatCompanyAddress()}</p>
      </div>
    );
  }

  return (
    <p className={cn("text-sm text-white/45 leading-relaxed", className)}>
      <span className="block">
        {t("copyright", {
          year,
          product: productName,
          company: COMPANY_LEGAL.companyName,
        })}
      </span>
      <span className="block mt-1 text-white/35 text-xs">{formatCompanyAddress(true)}</span>
    </p>
  );
}