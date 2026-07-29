import { setRequestLocale } from "next-intl/server";
import { DemoView } from "@/components/marketing/demo-view";

export const dynamic = "force-dynamic";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DemoView locale={locale} />;
}