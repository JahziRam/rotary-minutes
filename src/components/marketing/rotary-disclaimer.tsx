import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";

export async function RotaryDisclaimer({ locale }: { locale: string }) {
  const t = await getTranslations("legal.disclaimer");

  return (
    <div className="border-t border-white/10 bg-navy-dark/95 px-3 py-3 text-center sm:px-4">
      <p className="mx-auto flex max-w-3xl items-start justify-center gap-2 text-xs leading-relaxed text-white/55 sm:items-center sm:text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold/80 sm:mt-0" aria-hidden />
        <span>
          {t("text")}{" "}
          <Link href={`/${locale}/terms`} className="text-gold-light underline-offset-2 hover:underline">
            {t("termsLink")}
          </Link>
        </span>
      </p>
    </div>
  );
}