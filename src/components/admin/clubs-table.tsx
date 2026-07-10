"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { Search, Power, Clock, Building2, SlidersHorizontal, Settings2, Plus, Eye } from "lucide-react";
import { selectViewAsClubFromForm } from "@/actions/view-as-club";
import { ClubFeaturesPanel } from "@/components/admin/club-features-panel";
import {
  ClubManagementPanel,
  type AdminClubManagementData,
} from "@/components/admin/club-management-panel";
import type { ClubFeatureSet } from "@/lib/feature-definitions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  toggleClubActive,
  updateClubSubscription,
  extendClubTrial,
} from "@/actions/admin";
import { createClubByAdmin } from "@/actions/admin-clubs";
import type { ClubType } from "@/generated/prisma/client";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getPlanLabel } from "@/lib/feature-gate";

export interface AdminClubRow {
  id: string;
  name: string;
  city: string;
  country: string;
  district: string | null;
  isActive: boolean;
  createdAt: string;
  counts: { members: number; meetings: number; minutes: number; users: number };
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
  } | null;
  features: ClubFeatureSet;
}

const PLANS = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;

const planVariant: Record<string, "default" | "gold" | "success" | "muted"> = {
  TRIAL: "muted",
  STARTER: "default",
  PROFESSIONAL: "gold",
  ENTERPRISE: "success",
};

const statusVariant: Record<string, "success" | "warning" | "danger" | "muted"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "danger",
  CANCELLED: "muted",
  EXPIRED: "danger",
};

export function ClubsTable({
  clubs,
  managementByClubId,
  platformUsers,
  customRoles,
}: {
  clubs: AdminClubRow[];
  managementByClubId: Record<string, AdminClubManagementData>;
  platformUsers: Array<{ id: string; email: string; firstName: string; lastName: string }>;
  customRoles: Array<{ id: string; key: string; labelFr: string; labelEn: string }>;
}) {
  const locale = useLocale();
  const tViewAs = useTranslations("viewAsClub");
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "trial">("all");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [expandedFeaturesId, setExpandedFeaturesId] = useState<string | null>(null);
  const [expandedManageId, setExpandedManageId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clubs.filter((c) => {
      if (filter === "active" && !c.isActive) return false;
      if (filter === "inactive" && c.isActive) return false;
      if (filter === "trial" && c.subscription?.status !== "TRIALING") return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        (c.district?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clubs, search, filter]);

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
          <p className="text-sm text-gray-500">{clubs.length} club{clubs.length > 1 ? "s" : ""}</p>
          <Button size="sm" variant="gold" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Nouveau club
          </Button>
        </div>

        {showCreateForm && (
          <form
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
            action={(fd) => {
              startTransition(async () => {
                const result = await createClubByAdmin(
                  {
                    name: fd.get("name") as string,
                    slug: (fd.get("slug") as string) || undefined,
                    type: fd.get("type") as ClubType,
                    city: fd.get("city") as string,
                    country: fd.get("country") as string,
                    district: (fd.get("district") as string) || undefined,
                    email: (fd.get("email") as string) || undefined,
                  },
                  locale
                );
                if (result.success) {
                  setToast("Club créé");
                  setShowCreateForm(false);
                  router.refresh();
                } else if (result.error === "SLUG_EXISTS") {
                  setToast("Ce slug existe déjà");
                }
              });
            }}
          >
            <Input name="name" label="Nom du club" required />
            <Input name="slug" label="Slug (optionnel)" placeholder="auto-généré si vide" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                name="type"
                defaultValue="ROTARY"
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="ROTARY">Rotary</option>
                <option value="ROTARACT">Rotaract</option>
              </select>
            </div>
            <Input name="city" label="Ville" required />
            <Input name="country" label="Pays" required />
            <Input name="district" label="District" />
            <Input name="email" type="email" label="Email" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="gold" disabled={pending}>
                Créer le club
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un club..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "inactive", "trial"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "h-9 px-3 rounded-lg text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f === "all" && "Tous"}
                {f === "active" && "Actifs"}
                {f === "inactive" && "Inactifs"}
                {f === "trial" && "En essai"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Club</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Activité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Abonnement</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Aucun club trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((club) => (
                  <Fragment key={club.id}>
                  <tr className={cn(!club.isActive && "bg-gray-50/50")}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-navy mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{club.name}</p>
                          <p className="text-xs text-gray-500">
                            {club.city}, {club.country}
                            {club.district && ` · D${club.district}`}
                          </p>
                          <div className="flex gap-1.5 mt-1">
                            <Badge variant={club.isActive ? "success" : "muted"}>
                              {club.isActive ? "Actif" : "Inactif"}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {format(new Date(club.createdAt), "dd/MM/yyyy", { locale: dateLocale })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>{club.counts.members} membres</p>
                        <p>{club.counts.meetings} réunions · {club.counts.minutes} PV</p>
                        <p>{club.counts.users} utilisateur{club.counts.users > 1 ? "s" : ""}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {club.subscription ? (
                        <div className="space-y-1.5">
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant={planVariant[club.subscription.plan] ?? "default"}>
                              {getPlanLabel(club.subscription.plan, locale)}
                            </Badge>
                            <Badge variant={statusVariant[club.subscription.status] ?? "muted"}>
                              {club.subscription.status}
                            </Badge>
                          </div>
                          {club.subscription.trialEndsAt && club.subscription.status === "TRIALING" && (
                            <p className="text-xs text-amber-700">
                              Essai jusqu&apos;au{" "}
                              {format(new Date(club.subscription.trialEndsAt), "d MMM yyyy", {
                                locale: dateLocale,
                              })}
                            </p>
                          )}
                          <select
                            disabled={pending}
                            defaultValue={club.subscription.plan}
                            onChange={(e) =>
                              run(
                                () =>
                                  updateClubSubscription(
                                    club.id,
                                    { plan: e.target.value as (typeof PLANS)[number] },
                                    locale
                                  ),
                                "Plan mis à jour"
                              )
                            }
                            className="h-7 w-full max-w-[140px] rounded border border-gray-200 text-xs px-1.5"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>
                                {getPlanLabel(p, locale)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {club.isActive && (
                          <form action={selectViewAsClubFromForm}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="clubId" value={club.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              title={tViewAs("viewClub")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline ml-1">{tViewAs("viewClub")}</span>
                            </Button>
                          </form>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          title="Gérer"
                          onClick={() =>
                            setExpandedManageId((id) => (id === club.id ? null : club.id))
                          }
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline ml-1">Gérer</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          title="Fonctionnalités"
                          onClick={() =>
                            setExpandedFeaturesId((id) => (id === club.id ? null : club.id))
                          }
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          title={club.isActive ? "Désactiver" : "Activer"}
                          onClick={() =>
                            run(
                              () => toggleClubActive(club.id, locale),
                              club.isActive ? "Club désactivé" : "Club activé"
                            )
                          }
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        {club.subscription?.status === "TRIALING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            title="Prolonger l'essai (+14j)"
                            onClick={() =>
                              run(
                                () => extendClubTrial(club.id, 14, locale),
                                "Essai prolongé de 14 jours"
                              )
                            }
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {(expandedManageId === club.id || expandedFeaturesId === club.id) && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        {expandedManageId === club.id && managementByClubId[club.id] && (
                          <ClubManagementPanel
                            club={managementByClubId[club.id]}
                            platformUsers={platformUsers}
                            customRoles={customRoles}
                          />
                        )}
                        {expandedFeaturesId === club.id && (
                          <ClubFeaturesPanel clubId={club.id} features={club.features} />
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">{filtered.length} affiché{filtered.length > 1 ? "s" : ""}</p>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}