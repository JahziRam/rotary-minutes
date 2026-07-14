"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  approveJoinRequest,
  rejectJoinRequest,
} from "@/actions/registration";
import type { ClubRole } from "@/generated/prisma/client";

export type PendingJoinRequest = {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedAt: string;
};

export function PendingJoinRequests({
  requests,
  canManageRoles = false,
  roleOptions = [],
  customRoles = [],
}: {
  requests: PendingJoinRequest[];
  canManageRoles?: boolean;
  roleOptions?: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations("auth.pendingRequests");
  const tMembers = useTranslations("members");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<Record<string, ClubRole>>({});
  const [customRoleIds, setCustomRoleIds] = useState<Record<string, string>>({});

  if (requests.length === 0) return null;

  async function handleAction(
    membershipId: string,
    action: "approve" | "reject"
  ) {
    setActiveId(membershipId);
    setError("");
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveJoinRequest(
              membershipId,
              canManageRoles
                ? {
                    role: roles[membershipId] ?? "READER",
                    customRoleId: customRoleIds[membershipId] || null,
                  }
                : undefined
            )
          : await rejectJoinRequest(membershipId);

      if (result.error) {
        setError(
          result.error === "FORBIDDEN"
            ? t("forbidden")
            : t("error")
        );
        setActiveId(null);
        return;
      }
      router.refresh();
      setActiveId(null);
    });
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-amber-700" />
          {t("title", { count: requests.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
        )}
        <ul className="space-y-2">
          {requests.map((req) => (
            <li
              key={req.membershipId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white border border-amber-100"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {req.firstName} {req.lastName}
                </p>
                <p className="text-sm text-gray-500 truncate">{req.email}</p>
                {canManageRoles && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-gray-500">{tMembers("appRole")}</label>
                    <select
                      value={roles[req.membershipId] ?? "READER"}
                      disabled={pending && activeId === req.membershipId}
                      onChange={(e) =>
                        setRoles((prev) => ({
                          ...prev,
                          [req.membershipId]: e.target.value as ClubRole,
                        }))
                      }
                      className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
                    >
                      {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {customRoles.length > 0 && (
                      <select
                        value={customRoleIds[req.membershipId] ?? ""}
                        disabled={pending && activeId === req.membershipId}
                        onChange={(e) =>
                          setCustomRoleIds((prev) => ({
                            ...prev,
                            [req.membershipId]: e.target.value,
                          }))
                        }
                        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
                      >
                        <option value="">{tMembers("noCustomRole")}</option>
                        {customRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-red-700 border-red-200 hover:bg-red-50"
                  disabled={pending && activeId === req.membershipId}
                  onClick={() => handleAction(req.membershipId, "reject")}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("reject")}
                </Button>
                <Button
                  size="sm"
                  variant="gold"
                  className="gap-1"
                  disabled={pending && activeId === req.membershipId}
                  onClick={() => handleAction(req.membershipId, "approve")}
                >
                  <Check className="h-3.5 w-3.5" />
                  {t("approve")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}