"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  updateClubByAdmin,
  addMemberToClub,
  updateClubMember,
  removeMemberFromClub,
  addClubResponsible,
  updateClubMembership,
  removeClubMembership,
} from "@/actions/admin-clubs";
import { CLUB_ROLES } from "@/lib/rotary";
import { ROLE_LABELS } from "@/lib/role-definitions";
import type { ClubRole, ClubType, Language } from "@/generated/prisma/client";

export interface AdminClubMemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  isActive: boolean;
}

export interface AdminClubMembershipRow {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customRoleId: string | null;
  customRoleLabel: string | null;
  isActive: boolean;
}

export interface AdminClubManagementData {
  id: string;
  slug: string;
  name: string;
  type: ClubType;
  city: string;
  country: string;
  district: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  language: Language;
  isActive: boolean;
  members: AdminClubMemberRow[];
  memberships: AdminClubMembershipRow[];
}

export function ClubManagementPanel({
  club,
  platformUsers,
  customRoles,
}: {
  club: AdminClubManagementData;
  platformUsers: Array<{ id: string; email: string; firstName: string; lastName: string }>;
  customRoles: Array<{ id: string; key: string; labelFr: string; labelEn: string }>;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const roleOptions = CLUB_ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r][locale === "fr" ? "fr" : "en"],
  }));

  const activeMembers = club.members.filter((m) => m.isActive);
  const activeMemberships = club.memberships.filter((m) => m.isActive);
  const memberUserIds = new Set(activeMemberships.map((m) => m.userId));
  const availableUsers = platformUsers.filter((u) => !memberUserIds.has(u.id));

  function run(action: () => Promise<{ success?: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        router.refresh();
      }
    });
  }

  return (
    <div className="px-4 py-4 bg-slate-50 border-t border-gray-100 space-y-6">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-3">Informations du club</p>
        <form
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border border-gray-200 bg-white"
          action={(fd) => {
            startTransition(async () => {
              const result = await updateClubByAdmin(
                club.id,
                {
                  name: fd.get("name") as string,
                  slug: fd.get("slug") as string,
                  type: fd.get("type") as ClubType,
                  city: fd.get("city") as string,
                  country: fd.get("country") as string,
                  district: (fd.get("district") as string) || null,
                  address: (fd.get("address") as string) || null,
                  email: (fd.get("email") as string) || null,
                  phone: (fd.get("phone") as string) || null,
                  website: (fd.get("website") as string) || null,
                  language: fd.get("language") as Language,
                },
                locale
              );
              if (result.success) {
                setToast("Club mis à jour");
                router.refresh();
              }
            });
          }}
        >
          <Input name="name" label="Nom" defaultValue={club.name} required />
          <Input name="slug" label="Slug" defaultValue={club.slug} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              name="type"
              defaultValue={club.type}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="ROTARY">Rotary</option>
              <option value="ROTARACT">Rotaract</option>
            </select>
          </div>
          <Input name="city" label="Ville" defaultValue={club.city} required />
          <Input name="country" label="Pays" defaultValue={club.country} required />
          <Input name="district" label="District" defaultValue={club.district ?? ""} />
          <Input name="address" label="Adresse" defaultValue={club.address ?? ""} className="sm:col-span-2" />
          <Input name="email" type="email" label="Email" defaultValue={club.email ?? ""} />
          <Input name="phone" label="Téléphone" defaultValue={club.phone ?? ""} />
          <Input name="website" label="Site web" defaultValue={club.website ?? ""} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Langue</label>
            <select
              name="language"
              defaultValue={club.language}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="FR">Français</option>
              <option value="EN">English</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" size="sm" variant="gold" disabled={pending}>
              Enregistrer le club
            </Button>
          </div>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Membres Rotary ({activeMembers.length})
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowMemberForm((v) => !v)}>
            <UserPlus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        {showMemberForm && (
          <form
            className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-white mb-3"
            action={(fd) => {
              startTransition(async () => {
                const result = await addMemberToClub(
                  club.id,
                  {
                    firstName: fd.get("firstName") as string,
                    lastName: fd.get("lastName") as string,
                    email: (fd.get("email") as string) || undefined,
                    phone: (fd.get("phone") as string) || undefined,
                    position: (fd.get("position") as string) || undefined,
                  },
                  locale
                );
                if (result.success) {
                  setToast("Membre ajouté");
                  setShowMemberForm(false);
                  router.refresh();
                }
              });
            }}
          >
            <Input name="firstName" label="Prénom" required />
            <Input name="lastName" label="Nom" required />
            <Input name="email" type="email" label="Email" />
            <Input name="phone" label="Téléphone" />
            <Input name="position" label="Fonction" className="sm:col-span-2" />
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowMemberForm(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="gold" disabled={pending}>
                Ajouter le membre
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Membre</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Contact</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    Aucun membre actif
                  </td>
                </tr>
              ) : (
                activeMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      {editingMemberId === m.id ? (
                        <form
                          className="grid sm:grid-cols-2 gap-2"
                          action={(fd) => {
                            startTransition(async () => {
                              const result = await updateClubMember(
                                m.id,
                                {
                                  firstName: fd.get("firstName") as string,
                                  lastName: fd.get("lastName") as string,
                                  email: (fd.get("email") as string) || undefined,
                                  phone: (fd.get("phone") as string) || undefined,
                                  position: (fd.get("position") as string) || undefined,
                                },
                                locale
                              );
                              if (result.success) {
                                setToast("Membre mis à jour");
                                setEditingMemberId(null);
                                router.refresh();
                              }
                            });
                          }}
                        >
                          <Input name="firstName" defaultValue={m.firstName} required />
                          <Input name="lastName" defaultValue={m.lastName} required />
                          <Input name="email" type="email" defaultValue={m.email ?? ""} />
                          <Input name="phone" defaultValue={m.phone ?? ""} />
                          <Input name="position" defaultValue={m.position ?? ""} className="sm:col-span-2" />
                          <div className="sm:col-span-2 flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingMemberId(null)}>
                              Annuler
                            </Button>
                            <Button type="submit" size="sm" variant="gold" disabled={pending}>
                              Enregistrer
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">
                            {m.firstName} {m.lastName}
                          </p>
                          {m.position && <p className="text-xs text-gray-500">{m.position}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-500">
                      {m.email ?? "—"}
                      {m.phone && <p>{m.phone}</p>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingMemberId !== m.id && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => setEditingMemberId(m.id)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            title="Retirer (soft delete)"
                            onClick={() => {
                              if (!confirm(`Retirer ${m.firstName} ${m.lastName} ?`)) return;
                              run(() => removeMemberFromClub(m.id, locale), "Membre retiré");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-medium text-gray-600">
            Utilisateurs & responsables ({activeMemberships.length})
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowUserForm((v) => !v)}>
            <UserPlus className="h-3.5 w-3.5" />
            Assigner
          </Button>
        </div>

        {showUserForm && (
          <form
            className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-white mb-3"
            action={(fd) => {
              startTransition(async () => {
                const userId = fd.get("userId") as string;
                const role = fd.get("role") as ClubRole;
                const customRoleId = (fd.get("customRoleId") as string) || null;
                const result = await addClubResponsible(club.id, userId, role, customRoleId, locale);
                if (result.success) {
                  setToast("Responsable ajouté");
                  setShowUserForm(false);
                  router.refresh();
                } else if (result.error === "ALREADY_MEMBER") {
                  setToast("Cet utilisateur est déjà membre du club");
                }
              });
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Utilisateur</label>
              <select
                name="userId"
                required
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="">— Sélectionner —</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Rôle</label>
              <select
                name="role"
                defaultValue="ADMIN"
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
                <label className="text-sm font-medium text-gray-700">Rôle personnalisé</label>
                <select
                  name="customRoleId"
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">— Aucun —</option>
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {locale === "fr" ? r.labelFr : r.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="gold" disabled={pending || availableUsers.length === 0}>
                Assigner
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Rôle</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMemberships.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    Aucun utilisateur assigné
                  </td>
                </tr>
              ) : (
                activeMemberships.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1.5">
                        <select
                          disabled={pending}
                          defaultValue={m.role}
                          onChange={(e) =>
                            run(
                              () =>
                                updateClubMembership(
                                  m.id,
                                  e.target.value as ClubRole,
                                  m.customRoleId,
                                  locale
                                ),
                              "Rôle mis à jour"
                            )
                          }
                          className="h-8 rounded border border-gray-200 text-xs px-2 max-w-[180px]"
                        >
                          {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        {customRoles.length > 0 && (
                          <select
                            disabled={pending}
                            defaultValue={m.customRoleId ?? ""}
                            onChange={(e) =>
                              run(
                                () =>
                                  updateClubMembership(
                                    m.id,
                                    m.role as ClubRole,
                                    e.target.value || null,
                                    locale
                                  ),
                                "Rôle personnalisé mis à jour"
                              )
                            }
                            className="h-8 rounded border border-gray-200 text-xs px-2 max-w-[180px]"
                          >
                            <option value="">— Rôle personnalisé —</option>
                            {customRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {locale === "fr" ? r.labelFr : r.labelEn}
                              </option>
                            ))}
                          </select>
                        )}
                        {m.customRoleLabel && (
                          <Badge variant="muted" className="w-fit text-xs">
                            {m.customRoleLabel}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        title="Désactiver l'accès"
                        onClick={() => {
                          if (!confirm(`Retirer ${m.firstName} ${m.lastName} du club ?`)) return;
                          run(() => removeClubMembership(m.id, locale), "Accès retiré");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}