"use client";

import { useTranslations } from "next-intl";

export function AppRolePicker({
  roleOptions,
  customRoles = [],
  defaultRole = "READER",
  roleName = "appRole",
  customRoleName = "customRoleId",
  disabled = false,
}: {
  roleOptions: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
  defaultRole?: string;
  roleName?: string;
  customRoleName?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("members");

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("appRole")}</label>
        <select
          name={roleName}
          defaultValue={defaultRole}
          disabled={disabled}
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
          <label className="text-sm font-medium text-gray-700">{t("customRole")}</label>
          <select
            name={customRoleName}
            defaultValue=""
            disabled={disabled}
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
  );
}