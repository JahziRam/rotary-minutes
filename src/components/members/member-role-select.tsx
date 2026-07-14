"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateMemberRole } from "@/actions/club-users";
import type { ClubRole } from "@/generated/prisma/client";

export function MemberRoleSelect({
  memberId,
  role,
  customRoleId,
  hasAppAccount,
  isCurrentUser,
  roleOptions,
  customRoles = [],
  compact = false,
  onError,
}: {
  memberId: string;
  role: string | null;
  customRoleId: string | null;
  hasAppAccount: boolean;
  isCurrentUser: boolean;
  roleOptions: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
  compact?: boolean;
  onError?: (message: string) => void;
}) {
  const t = useTranslations("members");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function applyRole(nextRole: ClubRole, nextCustomRoleId: string | null) {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, nextRole, nextCustomRoleId);
      if ("error" in result && result.error) {
        if (result.error === "NO_USER_ACCOUNT") onError?.(t("noAppAccount"));
        else if (result.error === "SELF_ROLE_CHANGE") onError?.(t("cannotChangeOwnRole"));
        return;
      }
      if ("success" in result && result.success) {
        router.refresh();
      }
    });
  }

  if (!hasAppAccount) {
    return (
      <span
        className={`text-gray-400 ${compact ? "text-[10px]" : "text-xs"}`}
        title={t("noAppAccount")}
      >
        —
      </span>
    );
  }

  const selectClass = compact
    ? "h-7 max-w-[9rem] rounded border border-gray-200 bg-white text-[10px] px-1.5"
    : "h-8 max-w-[11rem] rounded-lg border border-gray-200 bg-white text-xs px-2";

  return (
    <div
      className="flex flex-col items-end gap-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <select
        disabled={pending || isCurrentUser}
        defaultValue={role ?? "READER"}
        title={isCurrentUser ? t("cannotChangeOwnRole") : t("appRole")}
        onChange={(e) => applyRole(e.target.value as ClubRole, customRoleId)}
        className={selectClass}
      >
        {roleOptions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {customRoles.length > 0 && (
        <select
          disabled={pending || isCurrentUser}
          defaultValue={customRoleId ?? ""}
          title={t("customRole")}
          onChange={(e) =>
            applyRole((role ?? "READER") as ClubRole, e.target.value || null)
          }
          className={selectClass}
        >
          <option value="">{t("noCustomRole")}</option>
          {customRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}