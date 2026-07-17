"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  addMemberToCommission,
  createCommission,
  deleteCommission,
  removeMemberFromCommission,
} from "@/actions/commissions";

type CommissionMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
};

type CommissionRow = {
  id: string;
  name: string;
  chairName: string | null;
  memberCount: number;
  members: CommissionMember[];
};

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  commissionId: string | null;
};

export function CommissionsPanel({
  commissions,
  members,
  canManage,
}: {
  commissions: CommissionRow[];
  members: MemberOption[];
  canManage: boolean;
}) {
  const t = useTranslations("commissions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [chairName, setChairName] = useState("");
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({});

  const unassigned = useMemo(
    () => members.filter((m) => !m.commissionId),
    [members]
  );

  function run(
    action: () => Promise<{ success?: boolean; error?: string }>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(okMsg);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-navy" />
            {t("title")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        {canManage && (
          <Button size="sm" variant="gold" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" />
            {t("addCommission")}
          </Button>
        )}
      </div>

      {showCreate && canManage && (
        <Card>
          <CardContent className="pt-4 grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("name")}</span>
              <input
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("chairName")}</span>
              <input
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={chairName}
                onChange={(e) => setChairName(e.target.value)}
                placeholder={t("chairOptional")}
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button
                size="sm"
                disabled={pending || !name.trim()}
                onClick={() =>
                  run(
                    () =>
                      createCommission({
                        name,
                        chairName: chairName || undefined,
                      }).then((r) => {
                        if ("success" in r && r.success) {
                          setName("");
                          setChairName("");
                          setShowCreate(false);
                        }
                        return r;
                      }),
                    t("created")
                  )
                }
              >
                {t("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {commissions.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">{t("noCommissions")}</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {commissions.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">
                    {c.chairName
                      ? t("chair", { name: c.chairName })
                      : t("noChair")}
                    {` · ${t("memberCount", { count: c.memberCount })}`}
                  </p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(t("deleteConfirm"))) {
                        run(() => deleteCommission(c.id), t("deleted"));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {c.members.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("noMembers")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {c.members.map((m) => (
                      <li
                        key={m.id}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {m.position || m.email || "—"}
                          </p>
                        </div>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => removeMemberFromCommission(m.id),
                                t("memberRemoved")
                              )
                            }
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && (
                  <div className="flex gap-2 pt-1">
                    <select
                      className="flex-1 h-9 rounded-lg border border-gray-200 px-2 text-sm"
                      value={addMemberId[c.id] ?? ""}
                      onChange={(e) =>
                        setAddMemberId((s) => ({ ...s, [c.id]: e.target.value }))
                      }
                    >
                      <option value="">{t("selectMember")}</option>
                      {members
                        .filter((m) => m.commissionId !== c.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.firstName} {m.lastName}
                            {m.commissionId ? ` (${t("reassign")})` : ""}
                          </option>
                        ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={pending || !addMemberId[c.id]}
                      onClick={() => {
                        const memberId = addMemberId[c.id];
                        if (!memberId) return;
                        run(
                          () =>
                            addMemberToCommission(c.id, memberId).then((r) => {
                              if ("success" in r && r.success) {
                                setAddMemberId((s) => ({ ...s, [c.id]: "" }));
                              }
                              return r;
                            }),
                          t("memberAdded")
                        );
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("addMember")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <p className="text-xs text-gray-400">
          {t("unassignedCount", { count: unassigned.length })}
        </p>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
