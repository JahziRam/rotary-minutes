import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function NewMinutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Minutes are auto-created with meetings — redirect to create meeting
  redirect(`/${locale}/meetings/new`);
}