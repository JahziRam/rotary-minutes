"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { MapPin, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  grantDistrictAccess,
  revokeDistrictAccess,
  searchUsersForDistrictGrant,
} from "@/actions/district";
import type { DistrictAccessRole } from "@/generated/prisma/client";

export type DistrictAccessRow = {
  id: string;
  district: string;
  role: DistrictAccessRole;
  canViewPV: boolean;
  expiresAt: string | null;
  grantedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  grantedBy: { firstName: string; lastName: string } | null;
};

export function DistrictAccessPanel({
  grants,
  districts,
}: {
  grants: DistrictAccessRow[];
  districts: string[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; email: string; firstName: string; lastName: string }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const result = await searchUsersForDistrictGrant(query);
    if (!("error" in result)) {
      setSearchResults(result.users);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-navy" />
            Accès district (Gouverneurs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{grants.length} accès actif(s)</p>
            <Button size="sm" variant="gold" onClick={() => setShowForm((v) => !v)}>
              <UserPlus className="h-4 w-4" />
              Accorder un accès
            </Button>
          </div>

          {showForm && (
            <form
              className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
              action={(fd) => {
                const userId = (fd.get("userId") as string) || selectedUserId;
                if (!userId) {
                  setToast("Sélectionnez un utilisateur");
                  return;
                }
                startTransition(async () => {
                  const result = await grantDistrictAccess(
                    {
                      userId,
                      district: fd.get("district") as string,
                      role: fd.get("role") as DistrictAccessRole,
                      canViewPV: fd.get("canViewPV") === "on",
                      expiresAt: (fd.get("expiresAt") as string) || null,
                    },
                    locale
                  );
                  if (result.success) {
                    setToast("Accès district accordé");
                    setShowForm(false);
                    setSelectedUserId("");
                    setSearchQuery("");
                    setSearchResults([]);
                    router.refresh();
                  } else {
                    setToast("Erreur lors de l'attribution");
                  }
                });
              }}
            >
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Utilisateur</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Rechercher par email ou nom…"
                />
                {searchResults.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white divide-y max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedUserId === u.id ? "bg-navy/5" : ""
                        }`}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setSearchQuery(`${u.firstName} ${u.lastName} (${u.email})`);
                          setSearchResults([]);
                        }}
                      >
                        {u.firstName} {u.lastName} — {u.email}
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" name="userId" value={selectedUserId} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">District</label>
                <input
                  name="district"
                  list="district-options"
                  required
                  className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  placeholder="Ex. D1850"
                />
                <datalist id="district-options">
                  {districts.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Rôle</label>
                <select
                  name="role"
                  defaultValue="GOVERNOR"
                  className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="GOVERNOR">Gouverneur</option>
                  <option value="ADG">ADG</option>
                  <option value="VIEWER">Lecteur</option>
                </select>
              </div>

              <Input name="expiresAt" type="date" label="Expiration (optionnel)" />

              <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input type="checkbox" name="canViewPV" defaultChecked className="rounded" />
                Peut consulter les procès-verbaux finalisés
              </label>

              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" variant="gold" disabled={pending || !selectedUserId}>
                  Accorder
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Utilisateur</th>
                  <th className="pb-3 pr-4 font-medium">District</th>
                  <th className="pb-3 pr-4 font-medium">Rôle</th>
                  <th className="pb-3 pr-4 font-medium">PV</th>
                  <th className="pb-3 pr-4 font-medium">Expire</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {grants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Aucun accès district configuré
                    </td>
                  </tr>
                ) : (
                  grants.map((grant) => (
                    <tr key={grant.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">
                          {grant.user.firstName} {grant.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{grant.user.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="muted">{grant.district}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{grant.role}</td>
                      <td className="py-3 pr-4">
                        {grant.canViewPV ? (
                          <Badge variant="success">Oui</Badge>
                        ) : (
                          <span className="text-gray-400">Non</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {grant.expiresAt
                          ? new Date(grant.expiresAt).toLocaleDateString(locale)
                          : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await revokeDistrictAccess(grant.id, locale);
                              if (result.success) {
                                setToast("Accès révoqué");
                                router.refresh();
                              }
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}