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
}: {
  requests: PendingJoinRequest[];
}) {
  const t = useTranslations("auth.pendingRequests");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
          ? await approveJoinRequest(membershipId)
          : await rejectJoinRequest(membershipId);

      if (result.error) {
        setError(t("error"));
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
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {req.firstName} {req.lastName}
                </p>
                <p className="text-sm text-gray-500 truncate">{req.email}</p>
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