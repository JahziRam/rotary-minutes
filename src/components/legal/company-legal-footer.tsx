"use client";

import { useTranslations } from "next-intl";
import { COMPANY_LEGAL } from "@/lib/company-legal";
import { cn } from "@/lib/utils";

/** Compact legal line for client auth pages. */
export function CompanyLegalFooter({ className }: { className?: string }) {
  const t = useTranslations("legal.company");
  const year = new Date().getFullYear();

  return (
    <p className={cn("text-center text-xs text-gray-400 leading-relaxed px-4 py-6", className)}>
      {t("copyright", {
        year,
        product: COMPANY_LEGAL.productName,
        company: COMPANY_LEGAL.companyName,
      })}
      <br />
      {COMPANY_LEGAL.addressLine1}, {COMPANY_LEGAL.city}, {COMPANY_LEGAL.state}{" "}
      {COMPANY_LEGAL.postalCode}, {COMPANY_LEGAL.country}
    </p>
  );
}