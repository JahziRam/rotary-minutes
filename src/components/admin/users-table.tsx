"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
} from "@/actions/admin-platform";

export interface PlatformUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  clubs: Array<{ clubId: string; clubName: string; role: string }>;
}

export function UsersTable({
  users,
  clubs,
}: {
  users: PlatformUserRow[];
  clubs: Array<{ id: string; name: string }>;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
          <Button size="sm" variant="gold" onClick={() => setShowForm((v) => !v)}>
            <UserPlus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        </div>

        {showForm && (
          <form
            className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
            action={(fd) => {
              startTransition(async () => {
                const result = await createPlatformUser(
                  {
                    email: fd.get("email") as string,
                    password: fd.get("password") as string,
                    firstName: fd.get("firstName") as string,
                    lastName: fd.get("lastName") as string,
                    isSuperAdmin: fd.get("isSuperAdmin") === "on",
                    clubId: (fd.get("clubId") as string) || undefined,
                    clubRole: (fd.get("clubRole") as "ADMIN") || undefined,
                  },
                  locale
                );
                if (result.success) {
                  setToast("Utilisateur créé");
                  setShowForm(false);
                  router.refresh();
                }
              });
            }}
          >
            <Input name="firstName" label="Prénom" required />
            <Input name="lastName" label="Nom" required />
            <Input name="email" type="email" label="Email" required />
            <Input name="password" type="password" label="Mot de passe" required minLength={8} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Club</label>
              <select name="clubId" className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
                <option value="">— Aucun —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Rôle club</label>
              <select name="clubRole" className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
                <option value="ADMIN">ADMIN</option>
                <option value="SECRETARY">SECRETARY</option>
                <option value="PRESIDENT">PRESIDENT</option>
                <option value="READER">READER</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm col-span-full">
              <input type="checkbox" name="isSuperAdmin" />
              Super administrateur SaaS
            </label>
            <div className="col-span-full flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" variant="gold" disabled={pending}>Créer</Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Clubs</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {u.isSuperAdmin && <Badge variant="gold" className="mt-1">Super Admin</Badge>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.clubs.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      u.clubs.map((c) => (
                        <p key={c.clubId} className="text-xs text-gray-600">
                          {c.clubName} · {c.role}
                        </p>
                      ))
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          if (!confirm(`Supprimer ${u.email} ?`)) return;
                          const result = await deletePlatformUser(u.id, locale);
                          if (result.success) {
                            setToast("Utilisateur supprimé");
                            router.refresh();
                          }
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}