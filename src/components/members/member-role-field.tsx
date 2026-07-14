"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { updateMemberRole } from "@/actions/club-users";
import { Toast } from "@/components/ui/toast";
import type { ClubRole } from "@/generated/prisma/client";

export function MemberRoleField({
  memberId,
  role,
  customRoleId,
  hasAccount,
  canManage,
  isCurrentUser,
  roleOptions,
  customRoles = [],
}: {
  memberId: string;
  role: string | null;
  customRoleId: string | null;
  hasAccount: boolean;
  canManage: boolean;
  isCurrentUser: boolean;
  roleOptions: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations("members");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(role ?? "READER");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState(customRoleId ?? "");

  useEffect(() => {
    setSelectedRole(role ?? "READER");
  }, [role]);

  useEffect(() => {
    setSelectedCustomRoleId(customRoleId ?? "");
  }, [customRoleId]);

  if (!canManage) {
    if (!role) return null;
    const label =
      roleOptions.find((r) => r.value === role)?.label ??
      customRoles.find((r) => r.id === customRoleId)?.label ??
      role;
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t("appRole")}
        </p>
        <p className="text-sm font-medium text-gray-900">{label}</p>
      </div>
    );
  }

  function applyRole(nextRole: ClubRole, nextCustomRoleId: string | null) {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, nextRole, nextCustomRoleId);
      if ("error" in result && result.error) {
        if (result.error === "NO_USER_ACCOUNT") setToast(t("noAppAccount"));
        else if (result.error === "SELF_ROLE_CHANGE") setToast(t("cannotChangeOwnRole"));
        setSelectedRole(role ?? "READER");
        setSelectedCustomRoleId(customRoleId ?? "");
        return;
      }
      if ("success" in result && result.success) {
        setToast(t("roleUpdated"));
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border border-navy/15 bg-navy/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-navy" />
          <p className="text-sm font-semibold text-gray-900">{t("appRole")}</p>
        </div>
        <p className="text-xs text-gray-500">{t("appRoleHint")}</p>

        {!hasAccount ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("noAppAccount")}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("appRole")}</label>
              <select
                disabled={pending || isCurrentUser}
                value={selectedRole}
                onChange={(e) => {
                  const nextRole = e.target.value as ClubRole;
                  setSelectedRole(nextRole);
                  applyRole(nextRole, selectedCustomRoleId || null);
                }}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {customRoles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t("customRole")}
                </label>
                <select
                  disabled={pending || isCurrentUser}
                  value={selectedCustomRoleId}
                  onChange={(e) => {
                    const nextCustomRoleId = e.target.value || null;
                    setSelectedCustomRoleId(e.target.value);
                    applyRole(selectedRole as ClubRole, nextCustomRoleId);
                  }}
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">{t("noCustomRole")}</option>
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {isCurrentUser && (
          <p className="text-xs text-gray-500">{t("cannotChangeOwnRole")}</p>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}