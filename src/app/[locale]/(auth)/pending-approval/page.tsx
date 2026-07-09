import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import { logoutUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default async function PendingApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.pendingApproval");
  const session = await getSession();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (session.user.isSuperAdmin || session.user.memberships.length > 0) {
    redirect(`/${locale}/dashboard`);
  }

  if (!session.user.pendingJoin) {
    redirect(`/${locale}/register`);
  }

  const clubName = session.user.pendingJoin.clubName;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              href={`/${locale}`}
              className="font-display text-2xl font-bold text-navy"
            >
              Rotary Minutes
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t("description", { clubName })}
            </p>
            <p className="text-xs text-gray-500">{t("hint")}</p>
            <form action={logoutUser}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline" className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}