import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  const { ref } = await searchParams;
  setRequestLocale(locale);

  return <RegisterForm referredByCode={ref} />;
}