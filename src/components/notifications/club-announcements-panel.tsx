"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  getClubCommissionsForAnnouncements,
  sendClubAnnouncement,
} from "@/actions/club-announcements";
import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";

const ROLE_OPTIONS: ClubRole[] = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "ADMIN",
  "MEMBERSHIP_CHAIR",
  "COMMISSION_CHAIR",
  "READER",
  "PROTOCOL",
];

const TARGET_TYPES: ClubAnnouncementTarget[] = [
  "ALL_MEMBERS",
  "ROLES",
  "COMMISSION",
  "DUES_OVERDUE",
  "DUES_PENDING",
  "NO_APP_ACCOUNT",
];

export function ClubAnnouncementsPanel({
  locale,
  commissions: initialCommissions = [],
}: {
  locale: string;
  commissions?: { id: string; name: string }[];
}) {
  const t = useTranslations("clubAnnouncements");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<ClubAnnouncementTarget>("ROLES");
  const [roles, setRoles] = useState<ClubRole[]>([
    "PRESIDENT",
    "VICE_PRESIDENT",
    "SECRETARY",
    "TREASURER",
    "ADMIN",
    "MEMBERSHIP_CHAIR",
    "COMMISSION_CHAIR",
  ]);
  const [commissionId, setCommissionId] = useState("");
  const [commissions, setCommissions] = useState(initialCommissions);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialCommissions.length > 0) return;
    void getClubCommissionsForAnnouncements().then((result) => {
      if ("commissions" in result) setCommissions(result.commissions ?? []);
    });
  }, [initialCommissions.length]);

  function toggleRole(role: ClubRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  const needsRoles = targetType === "ROLES";
  const needsCommission = targetType === "COMMISSION";
  const canSend =
    title.trim() &&
    message.trim() &&
    (!needsRoles || roles.length > 0) &&
    (!needsCommission || commissionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-navy" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">{t("description")}</p>
        <Input
          label={t("announcementTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("message")}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("targetType")}
          </label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as ClubAnnouncementTarget)}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            {TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`targetTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>
        {needsRoles && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t("targetRoles")}</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    roles.includes(role)
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t(`roles.${role}`)}
                </button>
              ))}
            </div>
          </div>
        )}
        {needsCommission && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("targetCommission")}
            </label>
            <select
              value={commissionId}
              onChange={(e) => setCommissionId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="">{t("selectCommission")}</option>
              {commissions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {targetType === "NO_APP_ACCOUNT" && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
            {t("noAppAccountHint")}
          </p>
        )}
        <Button
          variant="gold"
          disabled={pending || !canSend}
          onClick={() =>
            startTransition(async () => {
              const result = await sendClubAnnouncement({
                title,
                message,
                targetType,
                targetRoles: needsRoles ? roles : undefined,
                targetCommissionId: needsCommission ? commissionId : undefined,
              });
              if ("error" in result && result.error) {
                setToast(t("error"));
                return;
              }
              const inApp = result.recipients ?? 0;
              const emails = "emailsSent" in result ? result.emailsSent ?? 0 : 0;
              setToast(t("success", { count: inApp, emails }));
              setTitle("");
              setMessage("");
              router.refresh();
            })
          }
        >
          {t("send")}
        </Button>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}