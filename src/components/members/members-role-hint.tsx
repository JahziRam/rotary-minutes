import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function MembersRoleHint() {
  const t = await getTranslations("members");

  return (
    <div className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 flex gap-3 items-start">
      <Shield className="h-5 w-5 text-navy shrink-0 mt-0.5" />
      <div className="text-sm text-gray-700 space-y-1">
        <p className="font-medium text-gray-900">{t("roleManagementTitle")}</p>
        <p>{t("roleManagementHint")}</p>
      </div>
    </div>
  );
}