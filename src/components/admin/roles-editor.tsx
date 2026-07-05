"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/permissions";
import { updateRolePermissions, toggleRoleActive } from "@/actions/admin-platform";

interface RoleRow {
  role: string;
  labelFr: string;
  labelEn: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
}

export function RolesEditor({ roles }: { roles: RoleRow[] }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.role} className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              onClick={() => setExpanded(expanded === r.role ? null : r.role)}
            >
              <div>
                <p className="font-medium text-gray-900">
                  {locale === "fr" ? r.labelFr : r.labelEn}
                  <span className="text-gray-400 font-normal ml-2 text-sm">({r.role})</span>
                </p>
                {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.isActive ? "success" : "muted"}>
                  {r.isActive ? "Actif" : "Inactif"}
                </Badge>
                <span className="text-xs text-gray-400">{r.permissions.length} permissions</span>
              </div>
            </button>
            {expanded === r.role && (
              <div className="p-4 space-y-3 border-t border-gray-100">
                <div className="grid sm:grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = r.permissions.includes(perm);
                    const labels = PERMISSION_LABELS[perm];
                    return (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={checked}
                          disabled={pending}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...r.permissions, perm]
                              : r.permissions.filter((p) => p !== perm);
                            startTransition(async () => {
                              await updateRolePermissions(
                                r.role as "ADMIN",
                                next as Permission[],
                                locale
                              );
                              setToast("Permissions mises à jour");
                              router.refresh();
                            });
                          }}
                        />
                        {locale === "fr" ? labels.fr : labels.en}
                      </label>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleRoleActive(r.role as "ADMIN", locale);
                      setToast("Rôle mis à jour");
                      router.refresh();
                    })
                  }
                >
                  {r.isActive ? "Désactiver le rôle" : "Activer le rôle"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}