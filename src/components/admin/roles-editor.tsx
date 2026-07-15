"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { ALL_PERMISSIONS, getPermissionLabel, type Permission } from "@/lib/permissions";
import { getRoleLabel } from "@/lib/role-labels";
import { updateRolePermissions, toggleRoleActive } from "@/actions/admin-platform";
import {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "@/actions/admin-roles";

interface BuiltinRoleRow {
  role: string;
  labelFr: string;
  labelEn: string;
  labelEs: string | null;
  description: string | null;
  permissions: string[];
  isActive: boolean;
}

interface CustomRoleRow {
  id: string;
  key: string;
  labelFr: string;
  labelEn: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
  membershipCount: number;
}

export function RolesEditor({
  builtinRoles,
  customRoles,
}: {
  builtinRoles: BuiltinRoleRow[];
  customRoles: CustomRoleRow[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPerms, setNewPerms] = useState<Permission[]>([]);

  function renderPermissions(
    permissions: string[],
    onChange: (next: Permission[]) => void
  ) {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {ALL_PERMISSIONS.map((perm) => {
          const checked = permissions.includes(perm);
          return (
            <label
              key={perm}
              className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={pending}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...permissions, perm]
                    : permissions.filter((p) => p !== perm);
                  onChange(next as Permission[]);
                }}
              />
              {getPermissionLabel(perm, locale)}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Rôles intégrés</h3>
          <div className="space-y-3">
            {builtinRoles.map((r) => (
              <div key={r.role} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => setExpanded(expanded === r.role ? null : r.role)}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {getRoleLabel(r.role as never, locale)}
                      <span className="text-gray-400 font-normal ml-2 text-sm">({r.role})</span>
                    </p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">Intégré</Badge>
                    <Badge variant={r.isActive ? "success" : "muted"}>
                      {r.isActive ? "Actif" : "Inactif"}
                    </Badge>
                    <span className="text-xs text-gray-400">{r.permissions.length} permissions</span>
                  </div>
                </button>
                {expanded === r.role && (
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    {renderPermissions(r.permissions, (next) =>
                      startTransition(async () => {
                        await updateRolePermissions(r.role as "ADMIN", next, locale);
                        setToast("Permissions mises à jour");
                        router.refresh();
                      })
                    )}
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
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Rôles personnalisés</h3>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? "Annuler" : "Nouveau rôle"}
            </Button>
          </div>

          {showCreateForm && (
            <form
              className="rounded-xl border border-navy/20 bg-slate-50 p-4 space-y-3 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const result = await createCustomRole(
                    {
                      key: fd.get("key") as string,
                      labelFr: fd.get("labelFr") as string,
                      labelEn: fd.get("labelEn") as string,
                      description: (fd.get("description") as string) || null,
                      permissions: newPerms,
                    },
                    locale
                  );
                  if ("success" in result && result.success) {
                    setToast("Rôle personnalisé créé");
                    setShowCreateForm(false);
                    setNewPerms([]);
                    router.refresh();
                  } else if ("error" in result) {
                    setToast(`Erreur : ${result.error}`);
                  }
                });
              }}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <Input name="key" label="Clé (ex: EVENT_COORD)" required placeholder="EVENT_COORD" />
                <Input name="description" label="Description" />
                <Input name="labelFr" label="Libellé FR" required />
                <Input name="labelEn" label="Libellé EN" required />
              </div>
              <p className="text-xs text-gray-500">Permissions du nouveau rôle :</p>
              {renderPermissions(newPerms, setNewPerms)}
              <Button type="submit" size="sm" variant="gold" disabled={pending || newPerms.length === 0}>
                Créer le rôle
              </Button>
            </form>
          )}

          {customRoles.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun rôle personnalisé.</p>
          ) : (
            <div className="space-y-3">
              {customRoles.map((r) => {
                const expandKey = `custom-${r.id}`;
                return (
                  <div key={r.id} className="rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpanded(expanded === expandKey ? null : expandKey)}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {locale === "fr" ? r.labelFr : r.labelEn}
                          <span className="text-gray-400 font-normal ml-2 text-sm">({r.key})</span>
                        </p>
                        {r.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="gold">Personnalisé</Badge>
                        <Badge variant={r.isActive ? "success" : "muted"}>
                          {r.isActive ? "Actif" : "Inactif"}
                        </Badge>
                        {r.membershipCount > 0 && (
                          <span className="text-xs text-gray-400">
                            {r.membershipCount} membre{r.membershipCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </button>
                    {expanded === expandKey && (
                      <div className="p-4 space-y-3 border-t border-gray-100">
                        <form
                          className="grid sm:grid-cols-2 gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            startTransition(async () => {
                              const result = await updateCustomRole(
                                r.id,
                                {
                                  labelFr: fd.get("labelFr") as string,
                                  labelEn: fd.get("labelEn") as string,
                                  description: (fd.get("description") as string) || null,
                                },
                                locale
                              );
                              if ("success" in result && result.success) {
                                setToast("Libellés mis à jour");
                                router.refresh();
                              }
                            });
                          }}
                        >
                          <Input name="labelFr" label="Libellé FR" defaultValue={r.labelFr} required />
                          <Input name="labelEn" label="Libellé EN" defaultValue={r.labelEn} required />
                          <div className="sm:col-span-2">
                            <Input
                              name="description"
                              label="Description"
                              defaultValue={r.description ?? ""}
                            />
                          </div>
                          <Button type="submit" size="sm" variant="outline" disabled={pending}>
                            Enregistrer les libellés
                          </Button>
                        </form>

                        {renderPermissions(r.permissions, (next) =>
                          startTransition(async () => {
                            await updateCustomRole(r.id, { permissions: next }, locale);
                            setToast("Permissions mises à jour");
                            router.refresh();
                          })
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await updateCustomRole(r.id, { isActive: !r.isActive }, locale);
                                setToast("Rôle mis à jour");
                                router.refresh();
                              })
                            }
                          >
                            {r.isActive ? "Désactiver" : "Activer"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending || r.membershipCount > 0}
                            title={
                              r.membershipCount > 0
                                ? "Impossible : des membres utilisent ce rôle"
                                : undefined
                            }
                            onClick={() => {
                              if (!confirm(`Supprimer le rôle ${r.key} ?`)) return;
                              startTransition(async () => {
                                const result = await deleteCustomRole(r.id, locale);
                                if ("success" in result && result.success) {
                                  setToast("Rôle supprimé");
                                  router.refresh();
                                } else if ("error" in result) {
                                  setToast(`Erreur : ${result.error}`);
                                }
                              });
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}