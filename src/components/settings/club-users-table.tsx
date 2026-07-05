"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  inviteClubUser,
  updateClubUserRole,
  removeClubUser,
} from "@/actions/club-users";

export interface ClubUserRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

export function ClubUsersTable({
  users,
  currentUserId,
  roleOptions,
}: {
  users: ClubUserRow[];
  currentUserId: string;
  roleOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {users.length} utilisateur{users.length > 1 ? "s" : ""}
          </p>
          <Button size="sm" variant="gold" onClick={() => setShowForm((v) => !v)}>
            <UserPlus className="h-4 w-4" />
            Ajouter un utilisateur
          </Button>
        </div>

        {showForm && (
          <form
            className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
            action={(fd) => {
              startTransition(async () => {
                const result = await inviteClubUser({
                  email: fd.get("email") as string,
                  firstName: fd.get("firstName") as string,
                  lastName: fd.get("lastName") as string,
                  password: (fd.get("password") as string) || undefined,
                  role: fd.get("role") as string as import("@/generated/prisma/client").ClubRole,
                });
                if (result.success) {
                  setToast("Utilisateur ajouté");
                  setShowForm(false);
                  router.refresh();
                } else if (result.error === "ALREADY_MEMBER") {
                  setToast("Cet utilisateur est déjà membre du club");
                } else if (result.error === "MEMBER_LIMIT") {
                  setToast("Limite d'utilisateurs atteinte");
                }
              });
            }}
          >
            <Input name="firstName" label="Prénom" required />
            <Input name="lastName" label="Nom" required />
            <Input name="email" type="email" label="Email" required className="sm:col-span-2" />
            <Input
              name="password"
              type="password"
              label="Mot de passe (nouveau compte)"
              minLength={8}
              placeholder="Requis si l'email n'existe pas"
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Rôle</label>
              <select
                name="role"
                defaultValue="READER"
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-full flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="gold" disabled={pending}>
                Ajouter
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Aucun utilisateur
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.membershipId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.userId === currentUserId && (
                        <Badge variant="muted" className="mt-1">Vous</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={pending || u.userId === currentUserId}
                        defaultValue={u.role}
                        onChange={(e) =>
                          run(
                            () =>
                              updateClubUserRole(
                                u.membershipId,
                                e.target.value as import("@/generated/prisma/client").ClubRole
                              ),
                            "Rôle mis à jour"
                          )
                        }
                        className="h-8 rounded border border-gray-200 text-xs px-2"
                      >
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending || u.userId === currentUserId}
                        title="Retirer du club"
                        onClick={() =>
                          run(
                            () => removeClubUser(u.membershipId),
                            "Utilisateur retiré"
                          )
                        }
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
    </>
  );
}