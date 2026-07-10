import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function PageHelpLink({
  locale,
  anchor,
  variant = "link",
}: {
  locale: string;
  anchor: string;
  variant?: "link" | "button";
}) {
  const t = await getTranslations("assistance");
  const href = `/${locale}/help#${anchor}`;

  if (variant === "button") {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium text-navy hover:bg-navy/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
        <BookOpen className="h-4 w-4" aria-hidden />
        {t("learnMore")}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
    >
      <BookOpen className="h-3.5 w-3.5" aria-hidden />
      {t("learnMore")}
    </Link>
  );
}