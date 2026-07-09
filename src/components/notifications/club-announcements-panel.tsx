"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { sendClubAnnouncement } from "@/actions/club-announcements";
import type { ClubRole } from "@/generated/prisma/client";

const ROLE_OPTIONS: ClubRole[] = [
  "PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "ADMIN",
  "MEMBERSHIP_CHAIR",
  "READER",
  "PROTOCOL",
];

export function ClubAnnouncementsPanel({ locale }: { locale: string }) {
  const t = useTranslations("clubAnnouncements");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState<ClubRole[]>([
    "PRESIDENT",
    "SECRETARY",
    "TREASURER",
    "ADMIN",
    "MEMBERSHIP_CHAIR",
  ]);
  const [toast, setToast] = useState<string | null>(null);

  function toggleRole(role: ClubRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

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
        <Button
          variant="gold"
          disabled={pending || !title.trim() || !message.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await sendClubAnnouncement({
                title,
                message,
                targetRoles: roles,
              });
              if ("error" in result && result.error) {
                setToast(t("error"));
                return;
              }
              setToast(t("success", { count: result.recipients }));
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