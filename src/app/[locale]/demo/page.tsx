import { setRequestLocale } from "next-intl/server";
import { DemoView } from "@/components/marketing/demo-view";
import { getDemoClubData } from "@/lib/queries/demo";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const club = await getDemoClubData();

  return <DemoView locale={locale} club={club} />;
}