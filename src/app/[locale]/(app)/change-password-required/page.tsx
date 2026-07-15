import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { RequiredChangePasswordForm } from "@/components/auth/required-change-password-form";

export default async function ChangePasswordRequiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.requiredPassword");

  return (
    <AppShellServer title={t("title")}>
      <RequiredChangePasswordForm />
    </AppShellServer>
  );
}